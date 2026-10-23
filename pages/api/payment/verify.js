export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  // TODO: Verify provider signature server-side before granting credits.
  return res.status(501).json({ error: "Payment verification is not configured yet" });
}
