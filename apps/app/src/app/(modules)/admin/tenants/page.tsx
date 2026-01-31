import { createSupabaseServerClient } from "@hi5tech/auth";
import { requireSuperAdmin } from "../_admin";
import { upsertTenant, setTenantActive, deleteTenant } from "./actions";

export default async function TenantsPage() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const supabase = await createSupabaseServerClient();

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id,name,company_name,domain,subdomain,is_active,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="hi5-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Tenants</div>
            <div className="text-sm opacity-70">
              Create and manage tenants across the platform.
            </div>
          </div>
        </div>

        <form
          className="mt-4 grid gap-3 md:grid-cols-4"
          action={async (formData) => {
            "use server";
            const name = String(formData.get("name") ?? "");
            const company_name = String(formData.get("company_name") ?? "");
            const domain = String(formData.get("domain") ?? "");
            const subdomain = String(formData.get("subdomain") ?? "");
            await upsertTenant({
              name,
              company_name: company_name || null,
              domain: domain || null,
              subdomain,
              is_active: true,
            });
          }}
        >
          <div className="md:col-span-1">
            <label className="text-xs opacity-70">Name</label>
            <input
              name="name"
              placeholder="Demo ITSM"
              className="mt-1 w-full rounded-2xl border hi5-border bg-transparent px-3 py-2"
              required
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs opacity-70">Company name</label>
            <input
              name="company_name"
              placeholder="Demo ITSM Ltd"
              className="mt-1 w-full rounded-2xl border hi5-border bg-transparent px-3 py-2"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs opacity-70">Domain (optional)</label>
            <input
              name="domain"
              placeholder="demoitsm.co.uk"
              className="mt-1 w-full rounded-2xl border hi5-border bg-transparent px-3 py-2"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs opacity-70">Subdomain</label>
            <input
              name="subdomain"
              placeholder="demoitsm"
              className="mt-1 w-full rounded-2xl border hi5-border bg-transparent px-3 py-2"
              required
            />
          </div>

          <div className="md:col-span-4 flex justify-end">
            <button className="rounded-2xl border hi5-border px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition">
              Create / Update tenant
            </button>
          </div>
        </form>
      </div>

      <div className="hi5-panel p-4">
        <div className="text-sm font-semibold mb-3">Existing tenants</div>

        {error ? (
          <div className="text-sm text-red-500">Error: {error.message}</div>
        ) : !tenants?.length ? (
          <div className="text-sm opacity-70">No tenants yet.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left opacity-70">
                <tr>
                  <th className="py-2 pr-3">Subdomain</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Company</th>
                  <th className="py-2 pr-3">Domain</th>
                  <th className="py-2 pr-3">Active</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-t hi5-border">
                    <td className="py-2 pr-3 font-medium">{t.subdomain}</td>
                    <td className="py-2 pr-3">{t.name}</td>
                    <td className="py-2 pr-3">{t.company_name ?? "—"}</td>
                    <td className="py-2 pr-3">{t.domain ?? "—"}</td>
                    <td className="py-2 pr-3">{t.is_active ? "Yes" : "No"}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <form
                          action={async () => {
                            "use server";
                            await setTenantActive(t.subdomain, !t.is_active);
                          }}
                        >
                          <button className="rounded-xl border hi5-border px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition">
                            {t.is_active ? "Disable" : "Enable"}
                          </button>
                        </form>

                        <form
                          action={async () => {
                            "use server";
                            await deleteTenant(t.subdomain);
                          }}
                        >
                          <button className="rounded-xl border hi5-border px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
