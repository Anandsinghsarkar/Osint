import { getFirebaseAdmin, requireUser, requireAdmin, sendError } from "../../lib/firebaseAdmin";
export { getFirebaseAdmin, requireUser, requireAdmin, sendError };

export function methodNotAllowed(res, methods) {
  res.setHeader("Allow", methods.join(", "));
  return res.status(405).json({ error: "Method not allowed" });
}

export function validPublicHttpsUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443") return false;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
        host === "metadata.google.internal" || host.endsWith(".internal")) return false;
    return true;
  } catch {
    return false;
  }
}
