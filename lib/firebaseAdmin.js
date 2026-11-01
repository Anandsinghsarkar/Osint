import admin from "firebase-admin";

export function getFirebaseAdmin() {
  if (admin.apps.length) return admin;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin environment variables are not configured.");
  }
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  });
  return admin;
}

const unauthorized = message => Object.assign(new Error(message), { status: 401 });

export async function requireUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token.length > 5000) throw unauthorized("Sign in required");

  const a = getFirebaseAdmin();
  // Local signature check only (no extra network call to Firebase Auth).
  let decoded;
  try {
    decoded = await a.auth().verifyIdToken(token);
  } catch {
    throw unauthorized("Your session is invalid or expired. Please sign in again.");
  }
  const email = (decoded.email || "").toLowerCase();
  if (!decoded.email_verified) {
    throw Object.assign(new Error("A verified Google account is required."), { status: 403 });
  }

  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  const role = admins.includes(email) ? "admin" : "user";
  if (role === "admin") {
    // Admins keep the stricter revocation check.
    try { await a.auth().verifyIdToken(token, true); } catch { throw unauthorized("Your session was revoked. Please sign in again."); }
  }

  const db = a.firestore();
  const FV = a.firestore.FieldValue;
  const ref = db.collection("users").doc(decoded.uid);
  // Role/credits never come from the browser. Admin status comes only from ADMIN_EMAILS.
  const profile = { uid: decoded.uid, email, name: decoded.name || "", photoURL: decoded.picture || "", role };

  let snap = await ref.get();
  let user;
  if (!snap.exists) {
    await db.runTransaction(async tx => {
      const s = await tx.get(ref);
      if (s.exists) tx.set(ref, { ...profile, lastLoginAt: FV.serverTimestamp() }, { merge: true });
      else tx.create(ref, { ...profile, credits: 1, createdAt: FV.serverTimestamp(), lastLoginAt: FV.serverTimestamp() });
    });
    snap = await ref.get();
    user = snap.data();
  } else {
    const d = snap.data();
    const last = d.lastLoginAt?.toMillis ? d.lastLoginAt.toMillis() : 0;
    const changed = ["email", "name", "photoURL", "role"].some(k => d[k] !== profile[k]);
    // Write only when something changed or the last write is stale (was: a transaction on every request).
    if (changed || Date.now() - last > 10 * 60 * 1000) {
      await ref.set({ ...profile, lastLoginAt: FV.serverTimestamp() }, { merge: true });
    }
    user = { ...d, ...profile };
  }
  return { admin: a, decoded, user, ref };
}

export function requireAdmin(ctx) {
  if (ctx.user?.role !== "admin") {
    throw Object.assign(new Error("Admin access required"), { status: 403 });
  }
}

export function sendError(res, error) {
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600
    ? error.status : 500;
  return res.status(status).json({
    error: status === 500 ? "Server error. Please try again later." : error.message
  });
}
