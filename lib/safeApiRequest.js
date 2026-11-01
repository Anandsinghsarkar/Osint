import https from "node:https";
import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";

function isPublicAddress(address) {
  try {
    return ipaddr.parse(address).range() === "unicast";
  } catch {
    return false;
  }
}

export async function safeApiRequest(target, { method = "GET", body, timeoutMs = 12000, maxBytes = 1024 * 1024 } = {}) {
  const url = new URL(target);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("Only public HTTPS API endpoints on port 443 are allowed.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) {
    throw new Error("The API hostname does not resolve exclusively to public IP addresses.");
  }
  // Pin the validated DNS answer for the TLS request to prevent DNS-rebinding between validation and connect.
  const selected = addresses[0];

  return await new Promise((resolve, reject) => {
    let settled = false;
    const req = https.request(url, {
      method,
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "identity",
        "User-Agent": "IndiaApiSuite/1.0",
        ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {})
      },
      lookup: (_host, _options, callback) => callback(null, selected.address, selected.family),
      timeout: timeoutMs,
      maxHeaderSize: 16 * 1024
    }, response => {
      const chunks = [];
      let size = 0;
      response.on("data", chunk => {
        size += chunk.length;
        if (size > maxBytes) {
          req.destroy(new Error("The API response exceeded the 1 MB limit."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        if (settled) return;
        settled = true;
        const raw = Buffer.concat(chunks).toString("utf8");
        let data;
        try { data = JSON.parse(raw); } catch { data = raw; }
        resolve({ status: response.statusCode || 502, data });
      });
      response.on("error", error => {
        if (!settled) { settled = true; reject(error); }
      });
    });

    req.on("timeout", () => req.destroy(new Error("API request timed out.")));
    req.on("error", error => {
      if (!settled) { settled = true; reject(error); }
    });
    if (body) req.write(body);
    req.end();
  });
}
