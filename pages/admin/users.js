import Layout from "../../components/Layout";
import AdminGuard from "../../components/AdminGuard";

export default function AdminUsers() {
  return <AdminGuard><Layout title="Manage Users"><section className="panel"><h1>Manage Users</h1><p className="muted">Add user management and credit adjustment here.</p></section></Layout></AdminGuard>;
}
