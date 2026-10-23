export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  // TODO: Restrict grants to verified admins; validate amount and write an audit log.
  return res.status(501).json({ error: "Credit grant not configured yet" });
}
