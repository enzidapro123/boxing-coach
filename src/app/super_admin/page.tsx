import { requireRole } from "@/app/lib/auth-server";

export default async function SuperAdminPage() {
  await requireRole(["super_admin"]);

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
      <p>Welcome, you are logged in as a super_admin!</p>
    </main>
  );
}
