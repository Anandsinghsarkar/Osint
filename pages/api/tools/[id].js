import { requireUser, sendError, getFirebaseAdmin, validPublicHttpsUrl } from "../_helpers";
import { safeApiRequest } from "../../../lib/safeApiRequest";
import { publicTool, publicFields, buildInput } from "../../../lib/toolSchema";

export const config = { api: { bodyParser: { sizeLimit: "20kb" } } };

async function getTool(db, toolId) {
  if (!toolId || toolId.length > 150) throw Object.assign(new Error("Invalid tool."), { status: 400 });
  const snap = await db.collection("tools").doc(toolId).get();
  if (!snap.exists || snap.data().enabled !== true) throw Object.assign(new Error("Tool not found."), { status: 404 });
  return snap.data();
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      await requireUser(req);
      const toolId = String(req.query.id || "");
      const tool = await getTool(getFirebaseAdmin().firestore(), toolId);
      return res.json({ tool: publicTool(toolId, tool) });
    } catch (error) { return sendError(res, error); }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let ctx, db, debitRef, cost = 0;
  try {
    ctx = await requireUser(req);
    db = getFirebaseAdmin().firestore();
    const toolId = String(req.query.id || "");
    const tool = await getTool(db, toolId);
    if (!validPublicHttpsUrl(tool.url)) return res.status(400).json({ error: "Tool URL must be a public HTTPS URL on port 443." });

    const method = tool.method === "POST" ? "POST" : "GET";
    const input = buildInput(publicFields(tool.fields), req.body?.input);
    let target = tool.url, body;
    if (method === "POST") body = JSON.stringify(input);
    else {
      const u = new URL(tool.url);
      for (const [key, value] of Object.entries(input)) u.searchParams.set(key, String(value));
      target = u.toString();
    }
    if (target.length > 4000) return res.status(413).json({ error: "API input is too large." });
    if (body && Buffer.byteLength(body) > 16 * 1024) return res.status(413).json({ error: "API input is too large. Maximum 16 KB." });

    cost = Math.max(1, Math.min(10000, Math.floor(Number(tool.cost) || 1)));
    debitRef = db.collection("creditLogs").doc();
    const remaining = await db.runTransaction(async tx => {
      const userSnap = await tx.get(ctx.ref);
      const credits = Number(userSnap.data()?.credits) || 0;
      if (credits < cost) throw Object.assign(new Error("Not enough credits."), { status: 402 });
      tx.update(ctx.ref, { credits: credits - cost });
      tx.create(debitRef, {
        uid: ctx.decoded.uid, type: "usage", amount: -cost, toolId,
        createdAt: getFirebaseAdmin().firestore.FieldValue.serverTimestamp()
      });
      return credits - cost;
    });

    try {
      const upstream = await safeApiRequest(target, { method, body, timeoutMs: 25000, maxBytes: 2 * 1024 * 1024 });
      if (upstream.status < 200 || upstream.status >= 300) {
        const detail = typeof upstream.data === "string"
          ? upstream.data.slice(0, 500)
          : JSON.stringify(upstream.data).slice(0, 500);
        const message = "External API returned HTTP " + upstream.status +
          (detail ? ": " + detail : "") + ". Credits refunded.";
        throw Object.assign(new Error(message), { status: 502 });
      }
      return res.status(200).json({
        result: upstream.data,
        responseFormat: upstream.format,
        contentType: upstream.contentType,
        upstreamStatus: upstream.status,
        credits: remaining
      });
    } catch (upstreamError) {
      try {
        await db.runTransaction(async tx => {
          const refundRef = db.collection("creditLogs").doc("refund_" + debitRef.id);
          const refundSnap = await tx.get(refundRef);
          if (refundSnap.exists) return;
          const userSnap = await tx.get(ctx.ref);
          const current = Number(userSnap.data()?.credits) || 0;
          tx.update(ctx.ref, { credits: current + cost });
          tx.create(refundRef, {
            uid: ctx.decoded.uid, type: "usage_refund", amount: cost, toolId,
            debitId: debitRef.id,
            reason: String(upstreamError.message || "Upstream request failed").slice(0, 200),
            createdAt: getFirebaseAdmin().firestore.FieldValue.serverTimestamp()
          });
        });
      } catch (refundError) {
        console.error("API execution refund failed:", refundError);
        throw Object.assign(new Error("API request failed and automatic credit refund could not be completed. Contact the site administrator."), { status: 500 });
      }
      throw Object.assign(new Error(
        String(upstreamError.message || "API request failed").includes("Credits refunded")
          ? upstreamError.message
          : "API request failed: " + String(upstreamError.message || "Check the API URL and try again.") + " Credits refunded."
      ), { status: 502 });
    }
  } catch (error) { return sendError(res, error); }
}
