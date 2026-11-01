import crypto from "crypto";
import { requireUser, sendError, getFirebaseAdmin } from "../_helpers";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const ctx = await requireUser(req);
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    if (!/^order_[A-Za-z0-9]+$/.test(String(orderId || "")) ||
        !/^pay_[A-Za-z0-9]+$/.test(String(paymentId || "")) ||
        !/^[a-f0-9]{64}$/i.test(String(signature || "")) ||
        !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(400).json({ error: "Payment details are missing or invalid." });
    }

    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + "|" + paymentId).digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(signature, "hex");
    if (expectedBuffer.length !== receivedBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return res.status(400).json({ error: "Invalid payment signature." });
    }

    // A valid checkout signature alone is not enough: confirm the payment is captured
    // and matches this exact server-created order, amount and currency with Razorpay.
    const auth = Buffer.from(process.env.RAZORPAY_KEY_ID + ":" + process.env.RAZORPAY_KEY_SECRET).toString("base64");
    const paymentResponse = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(paymentId), {
      headers: { Authorization: "Basic " + auth, Accept: "application/json" },
      signal: AbortSignal.timeout(10000)
    });
    if (!paymentResponse.ok) {
      return res.status(502).json({ error: "Could not confirm payment with the payment provider. Please retry." });
    }
    const payment = await paymentResponse.json();

    const db = getFirebaseAdmin().firestore();
    const orderRef = db.collection("paymentOrders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists || orderSnap.data().uid !== ctx.decoded.uid) {
      return res.status(404).json({ error: "Payment order not found." });
    }
    const order = orderSnap.data();
    if (payment.order_id !== orderId || payment.status !== "captured" || payment.captured !== true ||
        payment.currency !== "INR" || Number(payment.amount) !== Number(order.amountPaise)) {
      return res.status(400).json({ error: "Payment is not captured or does not match this order." });
    }

    await db.runTransaction(async tx => {
      const currentOrder = await tx.get(orderRef);
      if (!currentOrder.exists || currentOrder.data().uid !== ctx.decoded.uid) {
        throw Object.assign(new Error("Payment order not found."), { status: 404 });
      }
      if (currentOrder.data().status === "paid") return;
      if (currentOrder.data().status !== "created") {
        throw Object.assign(new Error("Payment order is not payable."), { status: 409 });
      }
      const userSnap = await tx.get(ctx.ref);
      const credits = Number(currentOrder.data().credits);
      if (!Number.isInteger(credits) || credits < 1) {
        throw Object.assign(new Error("Invalid credit pack on order."), { status: 400 });
      }
      tx.update(ctx.ref, { credits: (Number(userSnap.data()?.credits) || 0) + credits });
      tx.update(orderRef, {
        status: "paid", paymentId, paidAt: getFirebaseAdmin().firestore.FieldValue.serverTimestamp()
      });
      tx.create(db.collection("creditLogs").doc(), {
        uid: ctx.decoded.uid, type: "purchase", amount: credits, orderId,
        paymentId, createdAt: getFirebaseAdmin().firestore.FieldValue.serverTimestamp()
      });
    });
    const fresh = await ctx.ref.get();
    return res.json({ ok: true, credits: Number(fresh.data()?.credits) || 0 });
  } catch (error) {
    return sendError(res, error);
  }
}
