import Link from "next/link";

export default function AdminGuard({ children }) {
  // UI placeholder only. Enforce admin access in every server/API route too.
  const isAdmin = false;
  if (!isAdmin) return <main className="container"><section className="panel">
    <h1>Admin access</h1><p className="muted">Connect verified authentication and role checks before enabling this page.</p>
    <Link href="/login">Go to login</Link>
  </section></main>;
  return children;
}
