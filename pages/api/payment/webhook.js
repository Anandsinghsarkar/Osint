import crypto from "crypto";
import { getFirebaseAdmin } from "../_helpers";

// Razorpay must send the unmodified request body so its webhook signature can be verified.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw Object.assign(new Error("Webhook payload too large."), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ error: "Razorpay webhook secret is not configured." });

    const rawBody = await readRawBody(req);
    const received = String(req.headers["x-razorpay-signature"] || "");
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    if (!/^[a-f0-9]{64}$/i.test(received)) {
      return res.status(400).json({ error: "Invalid webhook signature." });
    }
    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(received, "hex");
    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return res.status(400).json({ error: "Invalid webhook signature." });
    }

    let event;
    try { event = JSON.parse(rawBody.toString("utf8")); }
    catch { return res.status(400).json({ error: "Invalid JSON payload." }); }

    // This application grants credits only after Razorpay reports a captured payment.
    if (event.event !== "payment.captured") return res.status(200).json({ ok: true, ignored: true });

    const payment = event.payload?.payment?.entity;
    const orderId = payment?.order_id;
    const paymentId = payment?.id;
    if (!/^order_[A-Za-z0-9]+$/.test(String(orderId || "")) ||
        !/^pay_[A-Za-z0-9]+$/.test(String(paymentId || "")) ||
        payment?.status !== "captured" || payment?.captured !== true) {
      return res.status(400).json({ error: "Captured payment details are invalid." });
    }

    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const orderRef = db.collection("paymentOrders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return res.status(200).json({ ok: true, ignored: true, reason: "order_not_found" });

    const order = orderSnap.data();
    if (payment.currency !== order.currency || Number(payment.amount) !== Number(order.amountPaise)) {
      return res.status(400).json({ error: "Payment amount or currency does not match the order." });
    }

    const userRef = db.collection("users").doc(order.uid);
    await db.runTransaction(async tx => {
      const currentOrder = await tx.get(orderRef);
      if (!currentOrder.exists) throw Object.assign(new Error("Payment order not found."), { status: 404 });
      const current = currentOrder.data();
      // The checkout verification route and webhook may arrive together; credit only once.
      if (current.status === "paid") return;
      if (current.status !== "created" || current.uid !== order.uid ||
          Number(current.amountPaise) !== Number(payment.amount) || current.currency !== payment.currency) {
        throw Object.assign(new Error("Payment order does not match."), { status: 409 });
      }

      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw Object.assign(new Error("Payment user not found."), { status: 404 });
      const credits = Number(current.credits);
      if (!Number.isInteger(credits) || credits < 1) {
        throw Object.assign(new Error("Invalid credit pack on order."), { status: 400 });
      }

      tx.update(userRef, { credits: (Number(userSnap.data()?.credits) || 0) + credits });
      tx.update(orderRef, {
        status: "paid",
        paymentId,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        paidVia: "webhook"
      });
      tx.create(db.collection("creditLogs").doc(), {
        uid: order.uid, type: "purchase", amount: credits, orderId, paymentId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return res.status(status).json({ error: status === 500 ? "Webhook processing failed." : error.message });
  }
}
