export default async function handler(req, res) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "Method not allowed" }); }
  // TODO: Verify admin authorization before returning a minimal user list.
  return res.status(501).json({ error: "Admin users endpoint not configured yet" });
}
