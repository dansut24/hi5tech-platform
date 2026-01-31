import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@hi5tech/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "../_admin";
import { upsertTenant, setTenantActive, deleteTenant } from "./actions";

export default async function TenantsPage() {
  const gate = await requireSuperAdmin();

  // ✅ Fix: gate no longer returns gate.response
  if (!gate.ok) {
    if (gate.reason === "not_logged_in") redirect("/login");
    redirect("/no-access");
  }

  const supabase = await createSupabaseServerClient(cookies());

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id,name,company_name,domain,subdomain,is_active,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tenants</h1>
          <p className="text-sm opacity-70">
            Manage tenants (subdomains/domains, activation and basic metadata).
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-xl border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
          Back
        </Link>
      </div>

      <div className="hi5-panel p-4">
        <h2 className="font-semibold mb-3">Create / Update tenant</h2>

        <form action={upsertTenant} className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <label className="text-sm opacity-80">Name</label>
            <input
              name="name"
              placeholder="Demo ITSM"
              className="w-full rounded-xl border hi5-border px-3 py-2 bg-transparent"
              required
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm opacity-80">Subdomain</label>
            <input
              name="subdomain"
              placeholder="demoitsm"
              className="w-full rounded-xl border hi5-border px-3 py-2 bg-transparent"
              required
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm opacity-80">Company name (optional)</label>
            <input
              name="company_name"
              placeholder="Demo ITSM Ltd"
              className="w-full rounded-xl border hi5-border px-3 py-2 bg-transparent"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm opacity-80">Domain (optional)</label>
            <input
              name="domain"
              placeholder="example.com"
              className="w-full rounded-xl border hi5-border px-3 py-2 bg-transparent"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="rounded-xl border hi5-border px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              Save tenant
            </button>
          </div>
        </form>
      </div>

      <div className="hi5-panel p-0 overflow-hidden">
        <div className="px-4 py-3 border-b hi5-border flex items-center justify-between">
          <div className="font-semibold">All tenants</div>
          <div className="text-sm opacity-70">
            {error ? "Failed to load tenants" : `${tenants?.length ?? 0} total`}
          </div>
        </div>

        <div className="divide-y hi5-border">
          {(tenants ?? []).map((t) => (
            <div key={t.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-semibold truncate">{t.name}</div>
                <div className="text-sm opacity-70 truncate">
                  {t.subdomain}
                  {t.domain ? ` · ${t.domain}` : ""}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <form action={setTenantActive} className="inline-flex">
                  <input type="hidden" name="subdomain" value={t.subdomain} />
                  <input type="hidden" name="is_active" value={(!t.is_active).toString()} />
                  <button
                    type="submit"
                    className="rounded-xl border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    {t.is_active ? "Disable" : "Enable"}
                  </button>
                </form>

                <form action={deleteTenant} className="inline-flex">
                  <input type="hidden" name="subdomain" value={t.subdomain} />
                  <button
                    type="submit"
                    className="rounded-xl border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}

          {!error && (tenants?.length ?? 0) === 0 ? (
            <div className="p-6 text-sm opacity-70">No tenants yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
