import { requireUser, requireAdmin, sendError, getFirebaseAdmin, methodNotAllowed, validPublicHttpsUrl } from "../_helpers";
import { sanitizeFields } from "../../../lib/toolSchema";

export default async function handler(req, res) {
  try {
    const ctx = await requireUser(req);
    requireAdmin(ctx);
    const db = getFirebaseAdmin().firestore();

    if (req.method === "GET") {
      const snapshot = await db.collection("tools").get();
      return res.json({ tools: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
    }

    if (req.method === "POST") {
      const { id, name, description, url, method, cost, enabled, fields } = req.body || {};
      const cleanName = String(name || "").trim();
      const cleanUrl = String(url || "").trim();
      const numericCost = Number(cost);
      if (!cleanName || cleanName.length > 100 || !validPublicHttpsUrl(cleanUrl) ||
          !Number.isInteger(numericCost) || numericCost < 1 || numericCost > 10000) {
        return res.status(400).json({ error: "Enter a name, public HTTPS URL and credit cost from 1 to 10000." });
      }
      const cleanFields = sanitizeFields(fields);
      const data = {
        name: cleanName,
        description: String(description || "").slice(0, 500),
        url: cleanUrl,
        method: method === "POST" ? "POST" : "GET",
        cost: numericCost,
        enabled: enabled !== false,
        fields: cleanFields,
        updatedAt: getFirebaseAdmin().firestore.FieldValue.serverTimestamp()
      };
      if (id) {
        const ref = db.collection("tools").doc(String(id));
        const existing = await ref.get();
        if (!existing.exists) return res.status(404).json({ error: "Tool not found." });
        await ref.set(data, { merge: true });
      } else {
        data.createdAt = getFirebaseAdmin().firestore.FieldValue.serverTimestamp();
        await db.collection("tools").add(data);
      }
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || "");
      if (!id || id.length > 150) return res.status(400).json({ error: "Valid tool id required." });
      const ref = db.collection("tools").doc(id);
      const existing = await ref.get();
      if (!existing.exists) return res.status(404).json({ error: "Tool not found." });
      await ref.delete();
      return res.json({ ok: true });
    }

    return methodNotAllowed(res, ["GET", "POST", "DELETE"]);
  } catch (error) {
    return sendError(res, error);
  }
}
