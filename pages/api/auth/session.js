export default async function handler(req, res) {
  res.setHeader("Allow", "POST");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  // TODO: Verify Firebase ID token server-side and issue a secure session cookie.
  return res.status(501).json({ error: "Session endpoint not configured yet" });
}
