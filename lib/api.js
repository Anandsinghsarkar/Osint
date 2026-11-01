import { auth } from "./firebase";

const cache = new Map();

// Cached, de-duplicated authenticated GET. Concurrent callers share one request,
// so Layout + page asking for /api/me costs a single network round trip.
export async function apiGet(path, { ttl = 15000, force = false } = {}) {
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error("Sign in required"), { status: 401 });
  const key = user.uid + ":" + path;
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.t < ttl) return hit.p;
  const p = (async () => {
    const token = await user.getIdToken();
    const r = await fetch(path, { headers: { Authorization: "Bearer " + token } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || "Request failed"), { status: r.status });
    return d;
  })();
  cache.set(key, { t: Date.now(), p });
  p.catch(() => cache.delete(key));
  return p;
}

export function invalidate(part) {
  for (const k of [...cache.keys()]) if (k.includes(part)) cache.delete(k);
}
