import {useEffect,useState} from "react";
import {onAuthStateChanged,updateProfile} from "firebase/auth";
import Layout from "../components/Layout";
import {auth} from "../lib/firebase";
export default function Profile(){
 const [user,setUser]=useState(null),[profile,setProfile]=useState(null),[name,setName]=useState(""),[photoURL,setPhotoURL]=useState(""),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>onAuthStateChanged(auth,async u=>{setUser(u);if(!u)return;try{const token=await u.getIdToken();const r=await fetch("/api/me",{headers:{Authorization:"Bearer "+token}});const d=await r.json();if(!r.ok)throw Error(d.error);setProfile(d.user);setName(d.user.name||u.displayName||"");setPhotoURL(d.user.photoURL||u.photoURL||"");}catch(e){setMsg(e.message);}}),[]);
 async function save(e){e.preventDefault();setBusy(true);setMsg("");try{const token=await auth.currentUser.getIdToken();const r=await fetch("/api/profile",{method:"PATCH",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({name,photoURL})});const d=await r.json();if(!r.ok)throw Error(d.error||"Profile update failed");await updateProfile(auth.currentUser,{displayName:d.user.name,photoURL:d.user.photoURL||null});setProfile(d.user);setMsg("Profile updated successfully.");}catch(e){setMsg(e.message);}finally{setBusy(false);}}
 return <Layout title="YOUR ACCOUNT"><h1>Profile</h1><p className="muted">Your account identity and personal details.</p>{!user?<div className="notice"><a href="/login">Login</a> to view your profile.</div>:<section className="card profileCard">
 <div className="profileHero">{photoURL?<img src={photoURL} alt="Profile" className="avatar"/>:<div className="avatar avatarFallback">{(name||user.email||"U").charAt(0).toUpperCase()}</div>}<div><h2>{name||"Your profile"}</h2><p className="muted">{profile?.email||user.email}</p><span className="pill">{profile?.publicId||"Assigning user ID…"}</span></div></div>
 <div className="profileMeta"><div><span className="muted">Unique User ID</span><b>{profile?.publicId||"—"}</b></div><div><span className="muted">Available credits</span><b>{profile?.credits??"—"}</b></div></div>
 <form className="form" onSubmit={save}><label>Display name<input required maxLength="60" value={name} onChange={e=>setName(e.target.value)}/></label><label>Profile image URL<input type="url" placeholder="https://example.com/photo.jpg" value={photoURL} onChange={e=>setPhotoURL(e.target.value)}/><small className="muted">Use a public HTTPS image URL.</small></label><button className="btn" disabled={busy}>{busy?"Saving…":"Save profile"}</button></form>
 {msg&&<div className="notice">{msg}</div>}</section>}</Layout>;
}
