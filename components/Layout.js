import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

const adminLinks = [
  ["/admin", "Overview", "⌂"],
  ["/admin/tools", "Tools", "⌘"],
  ["/admin/users", "Users", "♙"],
  ["/admin/payments", "Payments", "₹"],
  ["/admin/settings", "Settings", "⚙"]
];

export default function Layout({ title, children }) {
  const [user, setUser] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const router = useRouter();

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => setMoreOpen(false), [router.asPath]);

  const isAdminPage = router.pathname.startsWith("/admin");
  const goTo = (href) => {
    if (href.startsWith("#")) {
      if (router.pathname !== "/dashboard") {
        router.push("/dashboard" + href);
        return;
      }
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setMoreOpen(false);
    }
  };

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="brand"><span className="brandMark">◈</span> INDIA API SUITE</Link>
        <nav className="desktopNav" aria-label="Main navigation">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard#buy-credits">Buy credits</Link>
          {user && <Link href="/admin">Admin</Link>}
          {user ? <button className="linkbtn" onClick={() => signOut(auth)}>Logout</button> : <Link href="/login">Login</Link>}
        </nav>
      </header>

      <main className="content">
        {title && <p className="eyebrow">{title}</p>}
        {children}
      </main>

      {user && (
        <nav className="mobileBottomNav" aria-label="Mobile navigation">
          <Link href="/dashboard" className={router.pathname === "/dashboard" ? "mobileNavItem active" : "mobileNavItem"}>
            <span className="mobileNavIcon">⌂</span><span>Home</span>
          </Link>
          <button className="mobileNavItem" onClick={() => goTo("#tools-section")}>
            <span className="mobileNavIcon">⌘</span><span>Tools</span>
          </button>
          <button className="mobileNavItem" onClick={() => goTo("#buy-credits")}>
            <span className="mobileNavIcon">＋</span><span>Credits</span>
          </button>
          <button className={moreOpen ? "mobileNavItem active" : "mobileNavItem"} onClick={() => setMoreOpen(v => !v)} aria-expanded={moreOpen}>
            <span className="mobileNavIcon">•••</span><span>More</span>
          </button>
        </nav>
      )}

      {moreOpen && user && (
        <div className="mobileMorePanel">
          <div className="mobileMoreHeader"><strong>{isAdminPage ? "Admin menu" : "Quick links"}</strong><button onClick={() => setMoreOpen(false)} aria-label="Close menu">×</button></div>
          {adminLinks.map(([href, label, icon]) => (
            <Link key={href} href={href} className={router.pathname === href ? "mobileMoreLink active" : "mobileMoreLink"}>
              <span>{icon}</span>{label}<b>›</b>
            </Link>
          ))}
          <button className="mobileMoreLink logoutLink" onClick={() => signOut(auth)}><span>↪</span>Log out<b>›</b></button>
        </div>
      )}
    </div>
  );
}
