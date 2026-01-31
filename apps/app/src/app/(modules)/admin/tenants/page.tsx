import { createSupabaseServerClient } from "@hi5tech/auth";
import Link from "next/link";
import { requireSuperAdmin } from "../_admin";
import { createTenant } from "./actions";

export default async function TenantsPage() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <p className="opacity-80">Not authorized.</p>
        <Link className="underline" href="/admin">
          Back
        </Link>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id,name,company_name,domain,subdomain,is_active,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <p className="text-red-600 text-sm">{error.message}</p>
        <Link className="underline" href="/admin">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tenants</h1>
          <p className="opacity-80">Create and manage tenants (domain + subdomain).</p>
        </div>
        <Link className="underline" href="/admin">
          Back
        </Link>
      </div>

      <form action={createTenant} className="rounded-2xl border p-4 space-y-3">
        <div className="font-semibold">Create / Update tenant</div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Tenant name
            <input
              name="name"
              className="mt-1 w-full rounded-xl border px-3 py-2 bg-transparent"
              placeholder="Hi5Tech (Internal)"
            />
          </label>

          <label className="text-sm">
            Company name (optional)
            <input
              name="company_name"
              className="mt-1 w-full rounded-xl border px-3 py-2 bg-transparent"
              placeholder="Hi5Tech"
            />
          </label>

          <label className="text-sm">
            Domain
            <input
              name="domain"
              className="mt-1 w-full rounded-xl border px-3 py-2 bg-transparent"
              placeholder="hi5tech.co.uk"
            />
          </label>

          <label className="text-sm">
            Subdomain
            <input
              name="subdomain"
              className="mt-1 w-full rounded-xl border px-3 py-2 bg-transparent"
              placeholder="hi5tech-internal"
            />
          </label>
        </div>

        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" name="is_active" defaultChecked />
          Active
        </label>

        <button className="rounded-xl border px-3 py-2 text-sm font-medium">Save tenant</button>

        <p className="text-xs opacity-70">
          This upserts by <span className="font-mono">subdomain</span>. Make sure{" "}
          <span className="font-mono">tenants.subdomain</span> is unique.
        </p>
      </form>

      <div className="rounded-2xl border overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">Existing tenants</div>

        <div className="divide-y">
          {(tenants ?? []).map((t) => {
            const host = t.subdomain ? `${t.subdomain}.${t.domain}` : t.domain;
            return (
              <div
                key={t.id}
                className="px-4 py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {t.name}
                    {!t.is_active && (
                      <span className="text-xs rounded-full border px-2 py-0.5 opacity-70">inactive</span>
                    )}
                  </div>
                  <div className="text-sm opacity-70">
                    {t.company_name ? `${t.company_name} â€¢ ` : ""}
                    <span className="font-mono">{host}</span>
                  </div>
                </div>

                <div className="text-xs opacity-60">{new Date(t.created_at).toLocaleString()}</div>
              </div>
            );
          })}

          {!tenants?.length && <div className="px-4 py-3 opacity-70">No tenants yet.</div>}
        </div>
      </div>
    </div>
  );
}

