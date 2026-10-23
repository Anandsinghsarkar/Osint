export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  // TODO: Deduct credits atomically on the server after auth and authorization checks.
  return res.status(501).json({ error: "Credit deduction not configured yet" });
}
