export default async function handler(req, res) {
  // Intentionally not an open proxy. Implement a strict allowlist for approved APIs.
  return res.status(501).json({ error: "Proxy not configured; use an explicit upstream allowlist." });
}
