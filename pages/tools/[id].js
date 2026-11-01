import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import Layout from "../../components/Layout";
import CreditBadge from "../../components/CreditBadge";
import ResultView from "../../components/ResultView";
import { auth } from "../../lib/firebase";
import { apiGet, invalidate } from "../../lib/api";

export default function ToolPage() {
  const router = useRouter();
  const id = router.query.id;
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState(null);
  const [credits, setCredits] = useState(0);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [ms, setMs] = useState(null);

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setReady(true); }), []);

  useEffect(() => {
    if (!router.isReady || !user || !id) return;
    let off = false;
    setTool(null); setValues({}); setResult(null); setError("");
    Promise.all([apiGet("/api/tools/" + encodeURIComponent(id), { ttl: 60000 }), apiGet("/api/me")])
      .then(([td, md]) => { if (off) return; setTool(td.tool); setCredits(md.user.credits || 0); })
      .catch(e => { if (!off) setError(e.message); });
    return () => { off = true; };
  }, [router.isReady, id, user]);

  async function run(e) {
    e.preventDefault();
    if (!auth.currentUser) { router.push("/login"); return; }
    setBusy(true); setError(""); setResult(null);
    const t0 = performance.now();
    try {
      const token = await auth.currentUser.getIdToken();
      const r = await fetch("/api/tools/" + encodeURIComponent(id), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ input: values })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || "Tool failed");
      setMs(Math.round(performance.now() - t0));
      setResult({ data: d.result });
      setCredits(d.credits);
      invalidate("/api/me");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const set = (key, v) => setValues(p => ({ ...p, [key]: v }));
  const cost = tool?.cost || 1;
  const costText = cost + " credit" + (cost === 1 ? "" : "s");
  const single = tool && tool.fields.length === 1 ? tool.fields[0] : null;

  const input = f => f.type === "textarea" ? (
    <textarea id={"f_" + f.key} rows="4" required={f.required} maxLength="2000" placeholder={f.placeholder}
      value={values[f.key] || ""} onChange={e => set(f.key, e.target.value)} />
  ) : (
    <input id={"f_" + f.key} type={f.type === "number" ? "number" : "text"} step="any" required={f.required} maxLength="500"
      autoComplete="off" autoCapitalize="off" spellCheck="false" autoFocus={!!single}
      placeholder={f.placeholder || "Enter " + f.label.toLowerCase()}
      value={values[f.key] || ""} onChange={e => set(f.key, e.target.value)} />
  );

  return (
    <Layout title="TOOL">
      <div className="dashHead">
        <div>
          <h1>{tool ? tool.name : "Tool"}</h1>
          {tool && <p className="muted">{tool.description || "Enter a value and fetch the result."}</p>}
        </div>
        {user && <CreditBadge credits={credits} />}
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <Link className="btn ghost smallBtn" href="/dashboard">← All tools</Link>
        {tool && <span className="pill">{costText} per run</span>}
      </div>

      {ready && !user && <div className="notice">Please <Link href="/login">sign in with Google</Link> to use this tool.</div>}
      {error && <div className="errorBox">{error}</div>}
      {user && !tool && !error && <div className="card"><div className="skel" style={{ height: 96 }} /></div>}

      {tool && (
        <form className="card form" onSubmit={run}>
          {tool.fields.length === 0 && <p className="muted">This tool needs no input. Press run.</p>}
          {single ? (
            <div className="field">
              <label htmlFor={"f_" + single.key}>{single.label}{single.required ? " *" : ""}</label>
              <div className="searchRow">
                {input(single)}
                <button className="btn" disabled={busy}>{busy ? "Fetching…" : "Fetch"}</button>
              </div>
            </div>
          ) : (
            <>
              {tool.fields.map(f => (
                <div className="field" key={f.key}>
                  <label htmlFor={"f_" + f.key}>{f.label}{f.required ? " *" : ""}</label>
                  {input(f)}
                </div>
              ))}
              <button className="btn wide" disabled={busy}>{busy ? "Fetching…" : "Run tool · " + costText}</button>
            </>
          )}
          <p className="muted small">{costText} per request. If the API fails, credits are refunded automatically.</p>
        </form>
      )}

      {busy && <div className="card result"><div className="skel" style={{ height: 120 }} /></div>}
      {result && !busy && <ResultView data={result.data} ms={ms} onClose={() => setResult(null)} />}
    </Layout>
  );
}
