import Head from "next/head";
import Link from "next/link";

const FEATURES = [
  ["⌘", "Admin-managed tools", "Every API tool is curated and published by the administrator, so you only see tools that are ready to use."],
  ["◈", "Pay per use credits", "Simple credit system. The cost of each tool is shown upfront before you run anything."],
  ["↺", "Automatic refunds", "If an upstream request fails, the deducted credits are refunded once and logged in your ledger."],
  ["✓", "Secure sign-in", "Google and email sign-in powered by Firebase Authentication, with server-verified sessions."],
  ["₹", "UPI & Razorpay", "Buy credit packs with Razorpay checkout or scan a UPI QR and submit your transaction reference."],
  ["⚙", "Full admin control", "Manage tools, users, payments and settings from one clean admin panel."]
];
const STEPS = [
  ["Create your account", "Sign in with Google or email. New accounts start with a free credit."],
  ["Pick a tool", "Browse and search the tools available in your workspace and check the credit cost."],
  ["Run and review", "Get structured, easy-to-read results instantly. Top up credits whenever you need."]
];
const PLANS = [[10, 30], [20, 50], [30, 70]];

export default function Home() {
  return <div className="lp">
    <Head><title>India API Suite — Secure API tools workspace</title><meta name="description" content="One secure workspace for admin-managed API tools, credits and account management."/></Head>

    <header className="lpNav"><div className="wrap">
      <Link href="/" className="brand"><span className="brandMark">◈</span> INDIA API SUITE</Link>
      <nav className="lpLinks" aria-label="Sections"><a href="#features">Features</a><a href="#how">How it works</a><a href="#pricing">Pricing</a></nav>
      <div className="lpAuth"><Link href="/login">Login</Link><Link className="btn smallBtn" href="/register">Get started</Link></div>
    </div></header>

    <section className="lpHero"><div className="wrap">
      <div>
        <span className="pill">API TOOLKIT · CREDIT BASED</span>
        <h1>One secure workspace for your <em>API tools.</em></h1>
        <p className="lead">Use admin-managed API tools, manage your credit balance and access your account from one fast, clean and secure dashboard.</p>
        <div className="lpCta"><Link className="btn" href="/register">Create free account</Link><Link className="btn ghost" href="/login">Login</Link></div>
        <div className="lpTrust"><span>Google sign-in</span><span>Auto refund on failures</span><span>UPI &amp; Razorpay</span></div>
      </div>
      <div className="mock" aria-hidden="true">
        <div className="mockBar"><i/><i/><i/><b>24 credits</b></div>
        <div className="mockBody">
          <h4>Your workspace</h4>
          {[["Tool one", "Admin-managed API tool", "1 credit"], ["Tool two", "Admin-managed API tool", "2 credits"], ["Tool three", "Admin-managed API tool", "1 credit"]].map(([n, d, c]) =>
            <div className="mockRow" key={n}><span className="ic">⌘</span><div><strong>{n}</strong><small>{d}</small></div><span className="pill">{c}</span></div>)}
        </div>
      </div>
    </div></section>

    <section className="lpSec alt" id="features"><div className="wrap">
      <div className="secHead"><span className="eyebrow">FEATURES</span><h2>Everything you need, nothing you don&apos;t</h2><p>Built for reliability and simple day-to-day use.</p></div>
      <div className="featGrid">{FEATURES.map(([i, t, d]) => <article className="card feat" key={t}><div className="toolIcon">{i}</div><h3>{t}</h3><p>{d}</p></article>)}</div>
    </div></section>

    <section className="lpSec" id="how"><div className="wrap">
      <div className="secHead"><span className="eyebrow">HOW IT WORKS</span><h2>Up and running in three steps</h2></div>
      <div className="steps">{STEPS.map(([t, d]) => <article className="card step" key={t}><h3>{t}</h3><p>{d}</p></article>)}</div>
    </div></section>

    <section className="lpSec alt" id="pricing"><div className="wrap">
      <div className="secHead"><span className="eyebrow">PRICING</span><h2>Simple credit packs</h2><p>One-time purchase. No subscriptions. Packs start at ₹30.</p></div>
      <div className="priceGrid">{PLANS.map(([c, p], i) => <article className={"card planCard " + (i === 1 ? "featuredPlan" : "")} key={c}><span className="pill">{i === 1 ? "POPULAR" : "CREDIT PACK"}</span><h2>{c} Credits</h2><div className="planPrice">₹{p}</div><p className="muted">One-time purchase</p><Link className={i === 1 ? "btn wide" : "btn ghost wide"} href="/register">Get started</Link></article>)}</div>
    </div></section>

    <section className="lpSec"><div className="wrap"><div className="ctaBand"><h2>Ready to get started?</h2><p>Create your account and open your workspace in under a minute.</p><Link className="btn" href="/register">Create account</Link></div></div></section>

    <footer className="lpFoot"><div className="wrap">
      <div className="notice legalNotice"><b>Educational use only</b><br/>This platform is intended only for lawful educational and research purposes. Illegal activity, unauthorized access, privacy violations, and misuse of information are not supported.</div>
      <div className="row"><span>© India API Suite</span><span>Secure · Firebase-powered · Vercel-ready</span></div>
    </div></footer>
  </div>;
}
