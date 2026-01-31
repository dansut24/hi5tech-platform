import Link from "next/link";
import { requireSuperAdmin } from "./_admin";

export default async function AdminHome() {
  const gate = await requireSuperAdmin();

  if (!gate.ok) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="opacity-80">
          {gate.reason === "not_logged_in"
            ? "You are not logged in."
            : "You do not have super admin access."}
        </p>
        <Link className="underline" href="/apps">Back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="opacity-80">Manage tenants, users, and module access.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link className="rounded-2xl border p-5 hover:bg-black/5 dark:hover:bg-white/5 transition" href="/admin/tenants">
          <div className="text-lg font-semibold">Tenants</div>
          <div className="text-sm opacity-80 mt-1">Create and manage tenants</div>
        </Link>

        <Link className="rounded-2xl border p-5 hover:bg-black/5 dark:hover:bg-white/5 transition" href="/admin/users">
          <div className="text-lg font-semibold">Users & Access</div>
          <div className="text-sm opacity-80 mt-1">Assign roles and modules per tenant</div>
        </Link>
      </div>
    </div>
  );
}