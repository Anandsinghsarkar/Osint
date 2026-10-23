import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <section className="panel">
        <p className="eyebrow">INDIA API SUITE</p>
        <h1>OSINT & API Dashboard</h1>
        <p className="muted">Starter structure is ready. Add your own authorized tools and API integrations here.</p>
        <div className="actions">
          <Link className="button" href="/login">Login</Link>
          <Link className="button secondary" href="/dashboard">Dashboard</Link>
        </div>
      </section>
    </main>
  );
}
