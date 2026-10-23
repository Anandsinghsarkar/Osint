import Layout from "../../components/Layout";
import AdminGuard from "../../components/AdminGuard";

export default function AdminSettings() {
  return <AdminGuard><Layout title="Settings"><section className="panel"><h1>Settings</h1><p className="muted">Add site and support settings here.</p></section></Layout></AdminGuard>;
}
