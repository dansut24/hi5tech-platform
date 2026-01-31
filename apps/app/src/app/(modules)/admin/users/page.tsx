import Link from "next/link";
import { createSupabaseServerClient } from "@hi5tech/auth";
import { requireSuperAdmin } from "../_admin";
import { createMembership, updateModules } from "./actions";

const ALL = ["itsm", "control", "selfservice", "admin"] as const;

export default async function UsersAccessPage() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Users & Access</h1>
        <p className="opacity-80">Not authorized.</p>
        <Link className="underline" href="/admin">
          Back
        </Link>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id,name,domain,subdomain,is_active")
    .order("name");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,email,full_name")
    .order("created_at", { ascending: false });

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, tenant_id, user_id, role, created_at")
    .order("created_at", { ascending: false });

  const { data: moduleRows } = await supabase.from("module_assignments").select("membership_id, module");

  const modulesByMembership = new Map<string, Set<string>>();
  (moduleRows ?? []).forEach((r) => {
    if (!modulesByMembership.has(r.membership_id)) modulesByMembership.set(r.membership_id, new Set());
    modulesByMembership.get(r.membership_id)!.add(r.module);
  });

  const tenantById = new Map((tenants ?? []).map((t) => [t.id, t]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users & Access</h1>
          <p className="opacity-80">Assign roles and modules per tenant.</p>
        </div>
        <Link className="underline" href="/admin">
          Back
        </Link>
      </div>

      <form action={createMembership} className="rounded-2xl border p-4 space-y-3">
        <div className="font-semibold">Add user to tenant</div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Tenant
            <select name="tenant_id" className="mt-1 w-full rounded-xl border px-3 py-2 bg-transparent">
              {(tenants ?? []).map((t) => {
                const host = t.subdomain ? `${t.subdomain}.${t.domain}` : t.domain;
                return (
                  <option key={t.id} value={t.id} disabled={t.is_active === false}>
                    {t.name} â€¢ {host} {t.is_active === false ? "(inactive)" : ""}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="text-sm">
            User (profile)
            <select name="user_id" className="mt-1 w-full rounded-xl border px-3 py-2 bg-transparent">
              {(profiles ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.email ?? p.id}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Role
            <select name="role" defaultValue="user" className="mt-1 w-full rounded-xl border px-3 py-2 bg-transparent">
              <option value="user">user</option>
              <option value="tech">tech</option>
              <option value="admin">admin</option>
              <option value="super_admin">super_admin</option>
            </select>
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          {ALL.map((m) => (
            <label key={m} className="text-sm flex items-center gap-2">
              <input type="checkbox" name={`m_${m}`} />
              {m.toUpperCase()}
            </label>
          ))}
        </div>

        <button className="rounded-xl border px-3 py-2 text-sm font-medium">Add membership</button>
        <p className="text-xs opacity-70">Users appear after they sign up (profile trigger).</p>
      </form>

      <div className="rounded-2xl border overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">Memberships</div>
        <div className="divide-y">
          {(memberships ?? []).map((m) => {
            const t = tenantById.get(m.tenant_id);
            const p = profileById.get(m.user_id);
            const mods = modulesByMembership.get(m.id) ?? new Set<string>();
            const host = t ? (t.subdomain ? `${t.subdomain}.${t.domain}` : t.domain) : "";

            return (
              <div key={m.id} className="px-4 py-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-semibold">{p?.email ?? m.user_id}</div>
                    <div className="text-sm opacity-70">
                      Tenant: {t?.name ?? m.tenant_id}
                      {host ? ` â€¢ ${host}` : ""} â€¢ Role: {m.role}
                    </div>
                  </div>
                  <div className="text-xs opacity-60">{new Date(m.created_at).toLocaleString()}</div>
                </div>

                <form action={updateModules} className="flex flex-col gap-2">
                  <input type="hidden" name="membership_id" value={m.id} />
                  <div className="grid gap-2 sm:grid-cols-4">
                    {ALL.map((mm) => (
                      <label key={mm} className="text-sm flex items-center gap-2">
                        <input type="checkbox" name={`m_${mm}`} defaultChecked={mods.has(mm)} />
                        {mm.toUpperCase()}
                      </label>
                    ))}
                  </div>
                  <div>
                    <button className="rounded-xl border px-3 py-2 text-sm font-medium">Save modules</button>
                  </div>
                </form>
              </div>
            );
          })}

          {!memberships?.length && <div className="px-4 py-3 opacity-70">No memberships yet.</div>}
        </div>
      </div>
    </div>
  );
}

