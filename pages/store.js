import {useEffect,useState} from "react";
import Layout from "../components/Layout";
import {auth} from "../lib/firebase";
import {onAuthStateChanged} from "firebase/auth";
const PLANS=Array.from({length:10},(_,i)=>({credits:(i+1)*10,price:30+i*20}));
export default function Store(){
 const [cfg,setCfg]=useState(null),[msg,setMsg]=useState(""),[reference,setReference]=useState(""),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>onAuthStateChanged(auth,async u=>{if(!u)return;try{const token=await u.getIdToken();const r=await fetch("/api/payment/config",{headers:{Authorization:"Bearer "+token}});if(r.ok)setCfg(await r.json());}catch{setMsg("Unable to load store settings.");}finally{setReady(true);}}),[]);
 async function buy(credits){if(busy)return;setBusy(true);setMsg("");try{const token=await auth.currentUser.getIdToken();const razorpay=!!(cfg?.razorpayEnabled&&cfg?.razorpayKeyId);
 if(razorpay){await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://checkout.razorpay.com/v1/checkout.js";s.onload=resolve;s.onerror=()=>reject(Error("Unable to load secure checkout."));document.body.appendChild(s);});const orderRes=await fetch("/api/payment/create-order",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({credits})});const order=await orderRes.json();if(!orderRes.ok)throw Error(order.error||"Could not create order");new window.Razorpay({key:order.keyId,order_id:order.orderId,amount:order.amount,currency:order.currency,name:"India API Suite",description:credits+" credits",handler:async p=>{try{const vr=await fetch("/api/payment/verify",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(p)});const v=await vr.json();if(!vr.ok)throw Error(v.error);setMsg("Payment successful. Your credits are updated.");}catch(e){setMsg(e.message);}finally{setBusy(false);}},modal:{ondismiss:()=>setBusy(false)}}).open();return;
 }else{if(reference.trim().length<6)throw Error("Enter the UPI / bank transaction reference first.");const r=await fetch("/api/payment/manual",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({credits,transactionReference:reference.trim()})});const d=await r.json();if(!r.ok)throw Error(d.error);setMsg(d.message);setReference("");}
 }catch(e){setMsg(e.message||"Payment failed.");}finally{setBusy(false);}}
 return <Layout title="CREDIT STORE"><h1>Store</h1><p className="muted">Choose a credit pack. Credits are added after successful payment or admin approval.</p>
 {cfg?.paymentQR&&<section className="card storePayment"><h2>UPI payment</h2><img className="qrPreview" src={cfg.paymentQR} alt="Payment QR"/><p className="muted">{cfg.paymentInstructions||"Scan the QR and submit your transaction reference."}</p>{!cfg?.razorpayEnabled&&<label>Transaction reference<input value={reference} onChange={e=>setReference(e.target.value.replace(/[^A-Za-z0-9_-]/g,""))} maxLength="80" placeholder="Enter UTR / transaction ID"/></label>}</section>}
 {!ready&&<div className="notice">Loading store…</div>}
 <div className="storeGrid">{PLANS.map((p,i)=><article className={"card planCard "+(i===1?"featuredPlan":"")} key={p.credits}><span className="pill">{i===1?"POPULAR":"CREDIT PACK"}</span><h2>{p.credits} Credits</h2><div className="planPrice">₹{p.price}</div><p className="muted">One-time purchase</p><button className="btn wide" disabled={busy||!ready||(!cfg?.razorpayEnabled&&!cfg?.paymentQR)} onClick={()=>buy(p.credits)}>{busy?"Please wait…":"Buy "+p.credits+" credits"}</button></article>)}</div>
 {msg&&<div className="notice">{msg}</div>}
 </Layout>;
}
