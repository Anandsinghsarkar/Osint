import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { apiGet } from "../lib/api";

const adminLinks=[["/admin","Overview","⌂"],["/admin/tools","Tools","⌘"],["/admin/users","Users","♙"],["/admin/payments","Payments","₹"],["/admin/settings","Settings","⚙"]];
const userLinks=[["/dashboard","Home","⌂"],["/store","Store","＋"],["/profile","Profile","♙"]];

export default function Layout({title,children}){
 const [user,setUser]=useState(null),[isAdmin,setIsAdmin]=useState(false),[moreOpen,setMoreOpen]=useState(false);
 const router=useRouter();
 useEffect(()=>onAuthStateChanged(auth,setUser),[]);
 useEffect(()=>{if(!user){setIsAdmin(false);return;}let off=false;apiGet("/api/me").then(d=>{if(!off)setIsAdmin(d?.user?.role==="admin")}).catch(()=>{});return()=>{off=true}},[user]);
 useEffect(()=>setMoreOpen(false),[router.asPath]);
 const isAdminPage=router.pathname.startsWith("/admin");
 const links=isAdminPage?adminLinks:userLinks;
 return <div className="shell"><header className="topbar">
  <Link href="/" className="brand"><span className="brandMark">◈</span> INDIA API SUITE</Link>
  <nav className="desktopNav" aria-label="Main navigation"><Link href="/dashboard">Tools</Link><Link href="/store">Store</Link>{isAdmin&&<Link href="/admin">Admin</Link>}{user?<><Link href="/profile">Profile</Link><button className="linkbtn" onClick={()=>signOut(auth)}>Logout</button></>:<><Link href="/login">Login</Link><Link href="/register">Register</Link></>}</nav>
 </header><main className="content">{title&&<p className="eyebrow">{title}</p>}{children}</main>
 {user&&<nav className="mobileBottomNav" aria-label="Mobile navigation">{isAdminPage?<><Link href="/admin" className={router.pathname==="/admin"?"mobileNavItem active":"mobileNavItem"}><span className="mobileNavIcon">⌂</span><span>Overview</span></Link><Link href="/admin/tools" className={router.pathname==="/admin/tools"?"mobileNavItem active":"mobileNavItem"}><span className="mobileNavIcon">⌘</span><span>Tools</span></Link><Link href="/admin/users" className={router.pathname==="/admin/users"?"mobileNavItem active":"mobileNavItem"}><span className="mobileNavIcon">♙</span><span>Users</span></Link><button className="mobileNavItem" onClick={()=>setMoreOpen(v=>!v)}><span className="mobileNavIcon">•••</span><span>More</span></button></>:<><Link href="/dashboard" className={router.pathname==="/dashboard"||router.pathname.startsWith("/tools")?"mobileNavItem active":"mobileNavItem"}><span className="mobileNavIcon">⌘</span><span>Tools</span></Link><Link href="/store" className={router.pathname==="/store"?"mobileNavItem active":"mobileNavItem"}><span className="mobileNavIcon">＋</span><span>Store</span></Link><Link href="/profile" className={router.pathname==="/profile"?"mobileNavItem active":"mobileNavItem"}><span className="mobileNavIcon">♙</span><span>Profile</span></Link><button className="mobileNavItem" onClick={()=>setMoreOpen(v=>!v)}><span className="mobileNavIcon">•••</span><span>More</span></button></>}</nav>}
 {moreOpen&&user&&<div className="mobileMorePanel"><div className="mobileMoreHeader"><strong>{isAdminPage?"Admin menu":"Account menu"}</strong><button onClick={()=>setMoreOpen(false)} aria-label="Close menu">×</button></div>{links.map(([href,label,icon])=><Link key={href} href={href} className="mobileMoreLink"><span>{icon}</span>{label}<b>›</b></Link>)}{isAdmin&&!isAdminPage&&<Link href="/admin" className="mobileMoreLink"><span>⚙</span>Admin panel<b>›</b></Link>}<button className="mobileMoreLink logoutLink" onClick={()=>signOut(auth)}><span>↪</span>Log out<b>›</b></button></div>}
 </div>;
}
