export default async function handler(req, res) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "Method not allowed" }); }
  // TODO: Verify admin authorization before returning dashboard statistics.
  return res.status(501).json({ error: "Admin stats endpoint not configured yet" });
}
