import crypto from "crypto";
import { requireUser, sendError, getFirebaseAdmin } from "../_helpers";

const PLANS = { 10: 30, 40: 99, 100: 199 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const ctx = await requireUser(req);
    const credits = Math.trunc(Number(req.body?.credits));
    const transactionReference = String(req.body?.transactionReference || "").trim();
    if (!PLANS[credits]) return res.status(400).json({ error: "Choose a valid credit pack." });
    if (!/^[A-Za-z0-9_-]{6,80}$/.test(transactionReference)) {
      return res.status(400).json({ error: "Enter a valid UPI/bank transaction reference (6-80 letters or numbers)." });
    }

    const db = getFirebaseAdmin().firestore();
    const settings = await db.collection("settings").doc("site").get();
    if (!settings.data()?.paymentQR) {
      return res.status(503).json({ error: "Manual QR payment is not configured yet. Please contact the site administrator." });
    }

    // A transaction reference can only be submitted once, even across different accounts.
    const normalizedReference = transactionReference.toUpperCase();
    const requestId = "utr_" + crypto.createHash("sha256").update(normalizedReference).digest("hex");
    const ref = db.collection("paymentRequests").doc(requestId);
    try {
      await ref.create({
        uid: ctx.decoded.uid,
        email: ctx.user.email,
        credits,
        amount: PLANS[credits],
        transactionReference: normalizedReference,
        status: "pending",
        createdAt: getFirebaseAdmin().firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      if (error.code === 6 || error.code === "already-exists") {
        return res.status(409).json({ error: "This transaction reference has already been submitted." });
      }
      throw error;
    }

    return res.json({
      ok: true,
      requestId: ref.id,
      message: "Payment request submitted. Credits will be added after admin approval."
    });
  } catch (error) {
    return sendError(res, error);
  }
}
