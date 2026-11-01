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

export async function requireUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token.length > 5000) {
    throw Object.assign(new Error("Sign in required"), { status: 401 });
  }

  const a = getFirebaseAdmin();
  let decoded;
  try {
    decoded = await a.auth().verifyIdToken(token, true);
  } catch {
    throw Object.assign(new Error("Your session is invalid or expired. Please sign in again."), { status: 401 });
  }
  const email = (decoded.email || "").toLowerCase();
  if (!decoded.email_verified) {
    throw Object.assign(new Error("A verified Google account is required."), { status: 403 });
  }

  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  const role = admins.includes(email) ? "admin" : "user";
  const db = a.firestore();
  const ref = db.collection("users").doc(decoded.uid);

  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const base = {
      uid: decoded.uid,
      email,
      name: decoded.name || "",
      photoURL: decoded.picture || "",
      role,
      lastLoginAt: a.firestore.FieldValue.serverTimestamp()
    };
    if (!snap.exists) {
      tx.create(ref, {
        ...base,
        credits: 1,
        createdAt: a.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Never accept role or credits from the browser. Admin status comes only from ADMIN_EMAILS.
      tx.set(ref, base, { merge: true });
    }
  });

  const userSnap = await ref.get();
  return { admin: a, decoded, user: userSnap.data(), ref };
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
