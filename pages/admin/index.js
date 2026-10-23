import Layout from "../../components/Layout";
import AdminGuard from "../../components/AdminGuard";

export default function AdminHome() {
  return (
    <AdminGuard>
      <Layout title="Admin">
        <section className="panel">
          <h1>Admin Panel</h1>
          <p className="muted">Add admin overview and statistics here.</p>
        </section>
      </Layout>
    </AdminGuard>
  );
}
