import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export default async function AdminUsersPage() {
  const supabase = await supabaseServer();

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) notFound();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant) notFound();

  // ✅ Correct: list users by memberships (the real tenant linkage)
  const { data: rows, error } = await supabase
    .from("memberships")
    .select(
      [
        "id",
        "role",
        "created_at",
        "user_id",
        "profiles:profiles(id,email,full_name)",
      ].join(",")
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="p-6">
        <div className="hi5-panel p-6">
          <h1 className="text-lg font-semibold">Users</h1>
          <p className="mt-2 text-sm text-red-600">{error.message}</p>
        </div>
      </div>
    );
  }

  const users = (rows ?? []).map((m: any) => ({
    membership_id: m.id,
    user_id: m.user_id,
    role: m.role,
    email: m.profiles?.email ?? "(no email)",
    full_name: m.profiles?.full_name ?? "",
    created_at: m.created_at,
  }));

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm opacity-80 mt-1">
            Manage users for <span className="font-medium">{tenant.subdomain}</span>
          </p>
        </div>

        <Link
          href="/admin/users/invite"
          className="rounded-xl border hi5-border px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
          Invite user
        </Link>
      </div>

      <div className="mt-6 hi5-panel p-0 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left opacity-80">
              <tr className="border-b hi5-divider">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Added</th>
              </tr>
            </thead>

            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 opacity-80" colSpan={4}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.membership_id} className="border-b hi5-divider">
                    <td className="px-4 py-3">
                      {u.full_name ? u.full_name : <span className="opacity-70">—</span>}
                    </td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border hi5-border px-2 py-1 text-xs">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 opacity-80">
                      {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
