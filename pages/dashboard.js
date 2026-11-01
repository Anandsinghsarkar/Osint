import {useEffect,useMemo,useState} from "react";
import Layout from "../components/Layout";
import ToolCard from "../components/ToolCard";
import CreditBadge from "../components/CreditBadge";
import {auth} from "../lib/firebase";
import {apiGet} from "../lib/api";
import {onAuthStateChanged} from "firebase/auth";

export default function Dashboard(){
 const [user,setUser]=useState(null),[tools,setTools]=useState([]),[credits,setCredits]=useState(0),[error,setError]=useState(""),[loaded,setLoaded]=useState(false),[q,setQ]=useState("");
 useEffect(()=>onAuthStateChanged(auth,async u=>{setUser(u);if(!u){setLoaded(true);return;}try{const [me,tl]=await Promise.all([apiGet("/api/me"),apiGet("/api/tools")]);setCredits(me.user.credits||0);setTools(tl.tools||[]);}catch(e){setError(e.message||"Unable to load tools.");}finally{setLoaded(true);}}),[]);
 const shown=useMemo(()=>{const s=q.trim().toLowerCase();return s?tools.filter(t=>(t.name+" "+(t.description||"")).toLowerCase().includes(s)):tools;},[tools,q]);
 return <Layout title="YOUR WORKSPACE"><div className="dashHead"><div><h1>Dashboard</h1><p className="muted">Welcome{user?.displayName?", "+user.displayName:""}. Choose a tool to get started.</p></div><CreditBadge credits={credits}/></div>
 <div className="sectionHead" id="tools-section"><div><h2>Tools</h2><p className="muted">Admin-managed tools. Credit cost is shown on each tool.</p></div></div>
 {!user&&loaded&&<div className="notice">Please <a href="/login">login</a> to access tools.</div>}{error&&<div className="errorBox">{error}</div>}
 {user&&tools.length>0&&<input className="toolSearch" type="search" placeholder="Search tools…" value={q} onChange={e=>setQ(e.target.value)}/>}
 {user&&!loaded&&<div className="toolGrid">{[0,1,2,3].map(i=><div key={i} className="skel"/>)}</div>}
 {user&&loaded&&(shown.length?<div className="toolGrid">{shown.map(t=><ToolCard key={t.id} tool={t}/>)}</div>:<div className="empty"><h3>{tools.length?"No matching tools":"No tools published yet"}</h3><p className="muted">Tools added by the administrator will appear here.</p></div>)}
 </Layout>;
}
