export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  // TODO: Return only enabled tools the signed-in user is allowed to access.
  return res.status(200).json({ tools: [] });
}
