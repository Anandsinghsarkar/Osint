import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { signInWithEmailAndPassword, signInWithPopup, sendEmailVerification } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

export default function Login() {
  const router = useRouter();
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function finish(user) {
    await user.reload();
    if (!user.emailVerified) {
      await sendEmailVerification(user);
      setError("Email verified nahi hai. Inbox me verification link bhej diya gaya hai. Verify karke login karein.");
      return false;
    }
    const token=await user.getIdToken(true);
    const r=await fetch("/api/auth/session",{method:"POST",headers:{Authorization:"Bearer "+token}});
    const d=await r.json();
    if(!r.ok) throw Error(d.error||"Login failed");
    router.replace("/dashboard"); return true;
  }
  async function login(e) {
    e.preventDefault();setBusy(true);setError("");
    try { const cred=await signInWithEmailAndPassword(auth,email.trim(),password); const ok=await finish(cred.user); if(!ok) await auth.signOut(); }
    catch(e){setError(e.message||"Login failed");} finally{setBusy(false);}
  }
  async function google() {
    setBusy(true);setError("");
    try {const cred=await signInWithPopup(auth,googleProvider);await finish(cred.user);}
    catch(e){setError(e.message||"Google login failed");}finally{setBusy(false);}
  }
  return <main className="center"><section className="card login"><div className="logo">A</div><h1>Welcome back</h1><p className="muted">Sign in to your India API Suite account.</p>
    <form className="form authForm" onSubmit={login}><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" autoComplete="current-password" required minLength="6" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label><button className="btn wide" disabled={busy}>{busy?"Please wait…":"Login"}</button></form>
    <div className="authDivider">OR</div><button className="btn ghost wide" disabled={busy} onClick={google}>Continue with Google</button>
    {error&&<p className="error">{error}</p>}<p className="muted small">New here? <Link href="/register">Create an account</Link></p>
    <div className="notice legalNotice"><b>Educational use only</b><br/>This platform is intended only for lawful educational and research purposes. It does not support illegal activity, unauthorized access, privacy violations, or misuse of information.</div>
    <Link className="muted small" href="/">Back to home</Link></section></main>;
}
