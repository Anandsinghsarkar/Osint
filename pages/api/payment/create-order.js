import Razorpay from "razorpay";
import { requireUser, sendError, getFirebaseAdmin } from "../_helpers";
const PLANS={10:30,20:50,30:70,40:90,50:110,60:130,70:150,80:170,90:190,100:210};
export default async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"});}
 try{
  const ctx=await requireUser(req),db=getFirebaseAdmin().firestore(),settings=await db.collection("settings").doc("site").get();
  if(!settings.data()?.razorpayEnabled)return res.status(403).json({error:"Razorpay checkout is disabled by admin."});
  if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET)return res.status(503).json({error:"Razorpay is not configured."});
  const credits=Math.trunc(Number(req.body?.credits));if(!PLANS[credits])return res.status(400).json({error:"Choose a valid credit pack."});
  const amountPaise=PLANS[credits]*100,razorpay=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
  const order=await razorpay.orders.create({amount:amountPaise,currency:"INR",receipt:("credit_"+ctx.decoded.uid.slice(0,8)+"_"+Date.now()).slice(0,40),notes:{uid:ctx.decoded.uid,credits:String(credits)}});
  await db.collection("paymentOrders").doc(order.id).create({uid:ctx.decoded.uid,credits,amount:PLANS[credits],amountPaise,currency:"INR",status:"created",createdAt:getFirebaseAdmin().firestore.FieldValue.serverTimestamp()});
  return res.json({orderId:order.id,amount:order.amount,currency:order.currency,keyId:process.env.RAZORPAY_KEY_ID,credits});
 }catch(e){return sendError(res,e)}
}
