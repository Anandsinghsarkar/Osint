import Link from "next/link";
import {useEffect,useState} from "react";
import {onAuthStateChanged,signOut} from "firebase/auth";
import {auth} from "../lib/firebase";
export default function Layout({title,children}){const [user,setUser]=useState(null);useEffect(()=>onAuthStateChanged(auth,setUser),[]);
return <div className="shell"><header className="topbar"><Link href="/" className="brand">◈ INDIA API SUITE</Link><nav><Link href="/dashboard">Dashboard</Link>{user&&<Link href="/admin">Admin</Link>}{user?<button className="linkbtn" onClick={()=>signOut(auth)}>Logout</button>:<Link href="/login">Login</Link>}</nav></header><main className="content">{title&&<p className="eyebrow">{title}</p>}{children}</main></div>;}
