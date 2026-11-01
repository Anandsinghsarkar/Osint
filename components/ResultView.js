import { useState } from "react";

const isObj = v => v !== null && typeof v === "object";
const pretty = k => String(k).replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
const show = v => (v === null || v === undefined || v === "" ? "—" : String(v));
const MAX_ROWS = 200;

function Tree({ value, depth = 0 }) {
  const isArr = Array.isArray(value);
  const all = isArr ? value.map((v, i) => [i, v]) : Object.entries(value);
  if (!all.length) return <span className="rvVal rvEmpty">empty</span>;
  const entries = all.slice(0, MAX_ROWS);
  return (
    <div className={"rvTree" + (depth ? " nested" : "")}>
      {entries.map(([k, v]) => {
        const key = isArr ? "#" + (k + 1) : pretty(k);
        return isObj(v)
          ? <div className="rvBlock" key={k}><div className="rvKey">{key}</div><Tree value={v} depth={depth + 1} /></div>
          : <div className="rvRow" key={k}><span className="rvKey">{key}</span><span className="rvVal">{show(v)}</span></div>;
      })}
      {all.length > MAX_ROWS && <div className="muted small">+ {all.length - MAX_ROWS} more (see JSON tab)</div>}
    </div>
  );
}

export default function ResultView({ data, ms, onClose }) {
  const structured = isObj(data);
  const raw = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const [tab, setTab] = useState(structured && raw.length < 200000 ? "view" : "json");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  }

  return (
    <section className="card result">
      <div className="row between">
        <div className="row">
          <h3 style={{ margin: 0 }}>Response</h3>
          {ms !== null && <span className="pill okPill">✓ {ms < 1000 ? ms + " ms" : (ms / 1000).toFixed(1) + " s"}</span>}
        </div>
        <div className="row">
          {structured && (
            <div className="seg">
              <button type="button" className={tab === "view" ? "on" : ""} onClick={() => setTab("view")}>Formatted</button>
              <button type="button" className={tab === "json" ? "on" : ""} onClick={() => setTab("json")}>JSON</button>
            </div>
          )}
          <button type="button" className="btn ghost smallBtn" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
          <button type="button" className="btn ghost smallBtn" onClick={onClose}>Clear</button>
        </div>
      </div>
      {tab === "view" && structured ? <Tree value={data} /> : <pre>{raw}</pre>}
    </section>
  );
}
