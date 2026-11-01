import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import Layout from "../../components/Layout";
import CreditBadge from "../../components/CreditBadge";
import { auth } from "../../lib/firebase";

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
  const [copied, setCopied] = useState(false);

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setReady(true); }), []);

  useEffect(() => {
    if (!router.isReady || !user || !id) return;
    let off = false;
    setTool(null); setValues({}); setResult(null); setError("");
    (async () => {
      try {
        const token = await user.getIdToken();
        const headers = { Authorization: "Bearer " + token };
        const [tr, mr] = await Promise.all([
          fetch("/api/tools/" + encodeURIComponent(id), { headers }),
          fetch("/api/me", { headers })
        ]);
        const td = await tr.json().catch(() => ({}));
        if (!tr.ok) throw Error(td.error || "Tool not found.");
        if (off) return;
        setTool(td.tool);
        if (mr.ok) setCredits((await mr.json()).user.credits || 0);
      } catch (e) {
        if (!off) setError(e.message);
      }
    })();
    return () => { off = true; };
  }, [router.isReady, id, user]);

  async function run(e) {
    e.preventDefault();
    if (!auth.currentUser) { router.push("/login"); return; }
    setBusy(true); setError(""); setResult(null); setCopied(false);
    try {
      const token = await auth.currentUser.getIdToken();
      const r = await fetch("/api/tools/" + encodeURIComponent(id), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ input: values })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || "Tool failed");
      setResult(d.result);
      setCredits(d.credits);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const output = result === null ? "" : typeof result === "string" ? result : JSON.stringify(result, null, 2);
  async function copy() {
    try { await navigator.clipboard.writeText(output); setCopied(true); } catch { setError("Copy failed."); }
  }

  const set = (key, v) => setValues(p => ({ ...p, [key]: v }));
  const cost = tool?.cost || 1;

  return (
    <Layout title="TOOL">
      <div className="dashHead">
        <div>
          <h1>{tool ? tool.name : "Tool"}</h1>
          {tool && <p className="muted">{tool.description || "API tool"}</p>}
        </div>
        {user && <CreditBadge credits={credits} />}
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <Link className="btn ghost smallBtn" href="/dashboard">← All tools</Link>
        {tool && <span className="pill">{cost} credit{cost === 1 ? "" : "s"} per run</span>}
      </div>

      {ready && !user && <div className="notice">Please <Link href="/login">sign in with Google</Link> to use this tool.</div>}
      {error && <div className="errorBox">{error}</div>}
      {user && !tool && !error && <div className="empty muted">Loading tool…</div>}

      {tool && (
        <form className="card form" onSubmit={run}>
          {tool.fields.length === 0 && <p className="muted">This tool needs no input. Press run.</p>}
          {tool.fields.map(f => (
            <label key={f.key}>
              {f.label}{f.required ? " *" : ""}
              {f.type === "textarea" ? (
                <textarea rows="4" required={f.required} maxLength="2000" placeholder={f.placeholder}
                  value={values[f.key] || ""} onChange={e => set(f.key, e.target.value)} />
              ) : (
                <input type={f.type === "number" ? "number" : "text"} step="any" required={f.required} maxLength="500"
                  placeholder={f.placeholder} value={values[f.key] || ""} onChange={e => set(f.key, e.target.value)} />
              )}
            </label>
          ))}
          <button className="btn wide" disabled={busy}>{busy ? "Running…" : "Run tool · " + cost + " credit" + (cost === 1 ? "" : "s")}</button>
          <p className="muted small">If the upstream API fails, your credits are refunded automatically.</p>
        </form>
      )}

      {result !== null && (
        <section className="card result">
          <div className="row between">
            <h3>Result</h3>
            <div className="row">
              <button className="btn ghost smallBtn" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
              <button className="btn ghost smallBtn" onClick={() => setResult(null)}>Close</button>
            </div>
          </div>
          <pre>{output}</pre>
        </section>
      )}
    </Layout>
  );
}
