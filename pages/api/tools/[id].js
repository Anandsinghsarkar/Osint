import { requireUser, sendError, getFirebaseAdmin, validPublicHttpsUrl } from "../_helpers";
import { safeApiRequest } from "../../../lib/safeApiRequest";

export const config = { api: { bodyParser: { sizeLimit: "20kb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let ctx;
  let db;
  let debitRef;
  let cost = 0;
  try {
    ctx = await requireUser(req);
    db = getFirebaseAdmin().firestore();
    const toolId = String(req.query.id || "");
    if (!toolId || toolId.length > 150) return res.status(400).json({ error: "Invalid tool." });

    const toolRef = db.collection("tools").doc(toolId);
    const snap = await toolRef.get();
    if (!snap.exists || snap.data().enabled !== true) return res.status(404).json({ error: "Tool not found." });

    const tool = snap.data();
    if (!validPublicHttpsUrl(tool.url)) return res.status(400).json({ error: "Tool URL must be a public HTTPS URL." });

    const method = tool.method === "POST" ? "POST" : "GET";
    const bodyObject = method === "POST" ? (req.body || {}) : null;
    const body = bodyObject ? JSON.stringify(bodyObject) : undefined;
    if (body && Buffer.byteLength(body) > 16 * 1024) {
      return res.status(413).json({ error: "API input is too large. Maximum 16 KB." });
    }
    cost = Math.max(1, Math.min(10000, Math.floor(Number(tool.cost) || 1)));
    debitRef = db.collection("creditLogs").doc();

    await db.runTransaction(async tx => {
      const userSnap = await tx.get(ctx.ref);
      const credits = Number(userSnap.data()?.credits) || 0;
      if (credits < cost) throw Object.assign(new Error("Not enough credits."), { status: 402 });
      tx.update(ctx.ref, { credits: credits - cost });
      tx.create(debitRef, {
        uid: ctx.decoded.uid, type: "usage", amount: -cost, toolId,
        createdAt: getFirebaseAdmin().firestore.FieldValue.serverTimestamp()
      });
    });

    try {
      const upstream = await safeApiRequest(tool.url, { method, body, timeoutMs: 12000, maxBytes: 1024 * 1024 });
      if (upstream.status < 200 || upstream.status >= 300) {
        throw new Error("The external API returned HTTP " + upstream.status + ".");
      }
      const fresh = await ctx.ref.get();
      return res.status(200).json({ result: upstream.data, credits: Number(fresh.data()?.credits) || 0 });
    } catch (upstreamError) {
      // Refund exactly once, using a deterministic ledger document for this debit.
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
      throw Object.assign(new Error("API request failed. Your credits have been refunded."), { status: 502 });
    }
  } catch (error) {
    return sendError(res, error);
  }
}
