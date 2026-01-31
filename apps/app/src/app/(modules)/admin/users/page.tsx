import Link from "next/link";
import { redirect } from "next/navigation";

import { supabaseServer } from "@/lib/supabase/server";
import { requireSuperAdmin } from "../_admin";
import {
  createMembership,
  removeMembership,
  addUserToTenant,
  updateModules,
} from "./actions";

export default async function UsersAdminPage() {
  const gate = await requireSuperAdmin();

  if (!gate.ok) {
    if (gate.reason === "not_logged_in") redirect("/login");
    redirect("/no-access");
  }

  const supabase = await supabaseServer();

  // Tenants for dropdown
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id,name,subdomain")
    .order("created_at", { ascending: false });

  // Memberships list
  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("id,tenant_id,user_id,role,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm opacity-70">
            Manage tenant memberships (assign users to tenants and roles).
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-xl border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
          Back
        </Link>
      </div>

      {/* Create membership */}
      <div className="hi5-panel p-4">
        <h2 className="font-semibold mb-3">Add user to tenant</h2>

        <form action={createMembership} className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1">
            <label className="text-sm opacity-80">Tenant</label>
            <select
              name="tenant_id"
              className="w-full rounded-xl border hi5-border px-3 py-2 bg-transparent"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Select tenant…
              </option>
              {(tenants ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.subdomain})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-sm opacity-80">User ID</label>
            <input
              name="user_id"
              placeholder="UUID"
              className="w-full rounded-xl border hi5-border px-3 py-2 bg-transparent"
              required
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm opacity-80">Role</label>
            <select
              name="role"
              className="w-full rounded-xl border hi5-border px-3 py-2 bg-transparent"
              defaultValue="user"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="rounded-xl border hi5-border px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              Add membership
            </button>

            <button
              formAction={addUserToTenant}
              type="submit"
              className="rounded-xl border hi5-border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              Add (alias)
            </button>
          </div>
        </form>
      </div>

      {/* List memberships */}
      <div className="hi5-panel p-0 overflow-hidden">
        <div className="px-4 py-3 border-b hi5-border flex items-center justify-between">
          <div className="font-semibold">Memberships</div>
          <div className="text-sm opacity-70">
            {membershipsError
              ? "Failed to load"
              : `${memberships?.length ?? 0} total`}
          </div>
        </div>

        <div className="divide-y hi5-border">
          {(memberships ?? []).map((m) => (
            <div
              key={m.id}
              className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="font-semibold truncate">{m.user_id}</div>
                <div className="text-sm opacity-70 truncate">
                  Tenant: {m.tenant_id} · Role: {m.role}
                </div>
              </div>

              <form action={removeMembership}>
                <input type="hidden" name="id" value={m.id} />
                <button
                  type="submit"
                  className="rounded-xl border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  Remove
                </button>
              </form>
            </div>
          ))}

          {!membershipsError && (memberships?.length ?? 0) === 0 && (
            <div className="p-6 text-sm opacity-70">No memberships yet.</div>
          )}
        </div>
      </div>

      {/* Optional module updater */}
      <div className="hi5-panel p-4">
        <h2 className="font-semibold mb-3">Update tenant modules</h2>

        <form action={updateModules} className="grid gap-3 sm:grid-cols-2">
          <select
            name="tenant_id"
            className="rounded-xl border hi5-border px-3 py-2 bg-transparent"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Select tenant…
            </option>
            {(tenants ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.subdomain})
              </option>
            ))}
          </select>

          <input
            name="modules"
            placeholder="itsm, control, selfservice, admin"
            className="rounded-xl border hi5-border px-3 py-2 bg-transparent"
          />

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-xl border hi5-border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              Save modules
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
