import Layout from "../../components/Layout";
import AdminGuard from "../../components/AdminGuard";

export default function AdminTools() {
  return <AdminGuard><Layout title="Manage Tools"><section className="panel"><h1>Manage Tools</h1><p className="muted">Add, edit, enable, or disable tools here.</p></section></Layout></AdminGuard>;
}
