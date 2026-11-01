import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/router";
import {createUserWithEmailAndPassword,sendEmailVerification,signOut,signInWithPopup} from "firebase/auth";
import {auth,googleProvider} from "../lib/firebase";
export default function Register(){
 const router=useRouter();const [name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 async function register(e){e.preventDefault();setBusy(true);setError("");setMessage("");
  try{const c=await createUserWithEmailAndPassword(auth,email.trim(),password);if(name.trim())await (await import("firebase/auth")).updateProfile(c.user,{displayName:name.trim()});await sendEmailVerification(c.user);await signOut(auth);setMessage("Account created. Email inbox me verification link bheja gaya hai. Verify karne ke baad login karein.");}
  catch(e){setError(e.code==="auth/email-already-in-use"?"This email is already registered. Please login.":e.message||"Registration failed.");}finally{setBusy(false);}
 }
 async function google(){setBusy(true);setError("");try{await signInWithPopup(auth,googleProvider);router.replace("/dashboard");}catch(e){setError(e.message||"Google sign up failed.");}finally{setBusy(false);}}
 return <main className="center"><section className="card login"><div className="logo">A</div><h1>Create account</h1><p className="muted">Register to start using the platform. New accounts receive 3 free credits.</p>
 <form className="form authForm" onSubmit={register}><label>Full name<input required maxLength="60" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" autoComplete="new-password" required minLength="8" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label><button className="btn wide" disabled={busy}>{busy?"Creating account…":"Register"}</button></form>
 <div className="authDivider">OR</div><button className="btn ghost wide" disabled={busy} onClick={google}>Continue with Google</button>
 {error&&<p className="error">{error}</p>}{message&&<div className="notice">{message}</div>}
 <p className="muted small">Already registered? <Link href="/login">Login</Link></p>
 <div className="notice legalNotice"><b>Educational use only</b><br/>This platform is for lawful educational and research purposes only. Illegal activity, unauthorized access, privacy violations, and misuse are not supported.</div>
 <Link className="muted small" href="/">Back to home</Link></section></main>;
}
