import admin from "firebase-admin";

export function getFirebaseAdmin() {
  if (admin.apps.length) return admin;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) throw new Error("Firebase Admin environment variables are not configured.");
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  return admin;
}

const unauthorized = message => Object.assign(new Error(message), { status: 401 });

export async function requireUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token.length > 5000) throw unauthorized("Sign in required");
  const a = getFirebaseAdmin();
  let decoded;
  try { decoded = await a.auth().verifyIdToken(token); }
  catch { throw unauthorized("Your session is invalid or expired. Please sign in again."); }
  const email = (decoded.email || "").toLowerCase();
  if (!decoded.email_verified) throw Object.assign(new Error("Please verify your email address before using the tools."), { status: 403 });
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  const role = admins.includes(email) ? "admin" : "user";
  if (role === "admin") {
    try { await a.auth().verifyIdToken(token, true); }
    catch { throw unauthorized("Your session was revoked. Please sign in again."); }
  }

  const db = a.firestore(), FV = a.firestore.FieldValue;
  const ref = db.collection("users").doc(decoded.uid);
  let user;
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const counterRef = db.collection("system_config").doc("counters");
    let data = snap.exists ? snap.data() : null;
    if (!data?.publicId) {
      const counterSnap = await tx.get(counterRef);
      const next = (Number(counterSnap.data()?.userSequence) || 0) + 1;
      const publicId = "CYBERUSER" + String(next).padStart(2, "0");
      tx.set(counterRef, { userSequence: next }, { merge: true });
      const profile = {
        uid: decoded.uid, publicId, email, name: data?.name || decoded.name || "",
        photoURL: data?.photoURL || decoded.picture || "", role,
        ...(snap.exists ? {} : { credits: 3, createdAt: FV.serverTimestamp() }),
        lastLoginAt: FV.serverTimestamp()
      };
      tx.set(ref, profile, { merge: true });
      user = { ...(data || {}), ...profile };
    } else {
      const patch = { email, role, lastLoginAt: FV.serverTimestamp() };
      if (!data.name && decoded.name) patch.name = decoded.name;
      if (!data.photoURL && decoded.picture) patch.photoURL = decoded.picture;
      tx.set(ref, patch, { merge: true });
      user = { ...data, ...patch };
    }
  });
  return { admin: a, decoded, user, ref };
}

export function requireAdmin(ctx) {
  if (ctx.user?.role !== "admin") throw Object.assign(new Error("Admin access required"), { status: 403 });
}

export function sendError(res, error) {
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  return res.status(status).json({ error: status === 500 ? "Server error. Please try again later." : error.message });
}
