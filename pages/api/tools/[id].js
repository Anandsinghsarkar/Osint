export default async function handler(req, res) {
  if (!["GET"].includes(req.method)) {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  // TODO: Resolve a tool by ID after verifying the user's session and permissions.
  return res.status(501).json({ error: "Tool endpoint not configured yet" });
}
