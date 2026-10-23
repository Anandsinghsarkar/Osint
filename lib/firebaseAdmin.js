import admin from "firebase-admin";
export function getFirebaseAdmin(){
 if(admin.apps.length)return admin;
 const projectId=process.env.FIREBASE_ADMIN_PROJECT_ID||process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
 const clientEmail=process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
 const privateKey=process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g,"\n");
 if(!projectId||!clientEmail||!privateKey)throw new Error("Firebase Admin environment variables are not configured.");
 admin.initializeApp({credential:admin.credential.cert({projectId,clientEmail,privateKey})});return admin;
}
export async function requireUser(req){
 const token=(req.headers.authorization||"").startsWith("Bearer ")?req.headers.authorization.slice(7):"";
 if(!token)throw Object.assign(new Error("Sign in required"),{status:401});
 const a=getFirebaseAdmin(),decoded=await a.auth().verifyIdToken(token),email=(decoded.email||"").toLowerCase();
 const admins=(process.env.ADMIN_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean),db=a.firestore(),ref=db.collection("users").doc(decoded.uid);
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists)tx.set(ref,{uid:decoded.uid,email,name:decoded.name||"",photoURL:decoded.picture||"",credits:1,role:admins.includes(email)?"admin":"user",createdAt:a.firestore.FieldValue.serverTimestamp(),lastLoginAt:a.firestore.FieldValue.serverTimestamp()});
  else tx.set(ref,{email,name:decoded.name||"",photoURL:decoded.picture||"",role:admins.includes(email)?"admin":"user",lastLoginAt:a.firestore.FieldValue.serverTimestamp()},{merge:true});
 });
 const userSnap=await ref.get();return {admin:a,decoded,user:userSnap.data(),ref};
}
export function requireAdmin(ctx){if(ctx.user?.role!=="admin")throw Object.assign(new Error("Admin access required"),{status:403});}
export function sendError(res,e){return res.status(e.status||500).json({error:e.status?e.message:"Server error"});}
