export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  // TODO: Create an order with your payment provider on the server.
  return res.status(501).json({ error: "Payment orders are not configured yet" });
}
