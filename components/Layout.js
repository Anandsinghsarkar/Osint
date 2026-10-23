import Link from "next/link";

export default function Layout({ title, children }) {
  return <div className="app-shell">
    <header className="topbar">
      <Link href="/" className="brand">India API Suite</Link>
      <nav><Link href="/dashboard">Dashboard</Link><Link href="/admin">Admin</Link></nav>
    </header>
    <main className="container">{title && <p className="eyebrow">{title}</p>}{children}</main>
  </div>;
}
