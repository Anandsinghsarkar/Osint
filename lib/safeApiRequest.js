import https from "node:https";
import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";

function isPublicAddress(address) {
  try { return ipaddr.parse(address).range() === "unicast"; }
  catch { return false; }
}

function decodeBody(buffer, contentType) {
  const type = String(contentType || "").toLowerCase();
  const isText = /(?:json|xml|html|text|javascript|x-www-form-urlencoded|csv|yaml|markdown|svg)/i.test(type);
  if (!isText) {
    return { data: buffer.toString("base64"), format: "base64" };
  }
  const text = buffer.toString("utf8");
  // Parse JSON when the server labels it correctly, or when the body is valid JSON despite a bad/missing header.
  if (/json/i.test(type)) {
    try { return { data: JSON.parse(text), format: "json" }; }
    catch { return { data: text, format: "text" }; }
  }
  try { return { data: JSON.parse(text), format: "json" }; }
  catch { return { data: text, format: "text" }; }
}

export async function safeApiRequest(target, { method = "GET", body, timeoutMs = 25000, maxBytes = 2 * 1024 * 1024 } = {}) {
  const url = new URL(target);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("Only public HTTPS API endpoints on port 443 are supported.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  let addresses;
  try { addresses = await dns.lookup(hostname, { all: true, verbatim: true }); }
  catch { throw new Error("API hostname could not be resolved. Check the API URL/domain."); }
  if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) {
    throw new Error("API hostname must resolve only to public IP addresses.");
  }
  const selected = addresses[0];

  return await new Promise((resolve, reject) => {
    let settled = false;
    const req = https.request(url, {
      method,
      headers: {
        Accept: "*/*",
        "Accept-Encoding": "identity",
        "User-Agent": "IndiaApiSuite/1.1",
        ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {})
      },
      lookup: (_host, options, callback) => {
        // Support both Node lookup callback signatures while pinning the validated DNS result.
        if (typeof options === "function") {
          callback = options;
          options = {};
        }
        if (options && options.all) callback(null, addresses);
        else callback(null, selected.address, selected.family);
      },
      timeout: timeoutMs,
      maxHeaderSize: 16 * 1024
    }, response => {
      const chunks = [];
      let size = 0;
      response.on("data", chunk => {
        size += chunk.length;
        if (size > maxBytes) {
          req.destroy(new Error("API response is larger than the 2 MB limit."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        if (settled) return;
        settled = true;
        const buffer = Buffer.concat(chunks);
        const contentType = String(response.headers["content-type"] || "text/plain").slice(0, 200);
        const decoded = decodeBody(buffer, contentType);
        resolve({
          status: response.statusCode || 502,
          contentType,
          format: decoded.format,
          data: decoded.data,
          headers: {
            contentType,
            status: response.statusCode || 502
          }
        });
      });
      response.on("error", error => {
        if (!settled) { settled = true; reject(error); }
      });
    });

    req.on("timeout", () => req.destroy(new Error("API request timed out after 25 seconds.")));
    req.on("error", error => {
      if (!settled) { settled = true; reject(error); }
    });
    if (body) req.write(body);
    req.end();
  });
}
