import crypto from "crypto";
import { requireUser, sendError, getFirebaseAdmin } from "../_helpers";
const PLANS={10:30,20:50,30:70,40:90,50:110,60:130,70:150,80:170,90:190,100:210};
export default async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"});}
 try{
  const ctx=await requireUser(req),credits=Math.trunc(Number(req.body?.credits)),transactionReference=String(req.body?.transactionReference||"").trim();
  if(!PLANS[credits])return res.status(400).json({error:"Choose a valid credit pack."});
  if(!/^[A-Za-z0-9_-]{6,80}$/.test(transactionReference))return res.status(400).json({error:"Enter a valid UPI/bank transaction reference (6-80 letters or numbers)."});
  const db=getFirebaseAdmin().firestore(),settings=await db.collection("settings").doc("site").get();
  if(!settings.data()?.paymentQR)return res.status(503).json({error:"Manual QR payment is not configured yet. Please contact the site administrator."});
  const normalizedReference=transactionReference.toUpperCase(),requestId="utr_"+crypto.createHash("sha256").update(normalizedReference).digest("hex"),ref=db.collection("paymentRequests").doc(requestId);
  try{await ref.create({uid:ctx.decoded.uid,email:ctx.user.email,credits,amount:PLANS[credits],transactionReference:normalizedReference,status:"pending",createdAt:getFirebaseAdmin().firestore.FieldValue.serverTimestamp()});}
  catch(e){if(e.code===6||e.code==="already-exists")return res.status(409).json({error:"This transaction reference has already been submitted."});throw e;}
  return res.json({ok:true,requestId:ref.id,message:"Payment request submitted. Credits will be added after admin approval."});
 }catch(e){return sendError(res,e)}
}
