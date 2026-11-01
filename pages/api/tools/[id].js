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
  // GET: public metadata for one tool (powers /tools/[id]).
  if (req.method === "GET") {
    try {
      await requireUser(req);
      const toolId = String(req.query.id || "");
      const tool = await getTool(getFirebaseAdmin().firestore(), toolId);
      return res.json({ tool: publicTool(toolId, tool) });
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
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
    const tool = await getTool(db, toolId);
    if (!validPublicHttpsUrl(tool.url)) return res.status(400).json({ error: "Tool URL must be a public HTTPS URL." });

    const method = tool.method === "POST" ? "POST" : "GET";
    // Validate input BEFORE any credit is debited.
    const input = buildInput(publicFields(tool.fields), req.body?.input);
    let target = tool.url;
    let body;
    if (method === "POST") {
      body = JSON.stringify(input);
    } else {
      const u = new URL(tool.url);
      for (const [k, v] of Object.entries(input)) u.searchParams.set(k, String(v));
      target = u.toString();
    }
    if (target.length > 4000) return res.status(413).json({ error: "API input is too large." });
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
      const upstream = await safeApiRequest(target, { method, body, timeoutMs: 12000, maxBytes: 1024 * 1024 });
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
