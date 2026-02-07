import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import MicrosoftIntegrationClient from "@/app/(modules)/admin/ui/microsoft-integration-client";

export const dynamic = "force-dynamic";

export default async function MicrosoftIntegrationPage() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user;
  if (!me) redirect("/login");

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) redirect("/apps");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant) redirect("/apps");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", me.id)
    .maybeSingle();

  const role = String(membership?.role || "");
  const isAdmin = role === "owner" || role === "admin";
  if (!isAdmin) redirect("/apps");

  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("ms_enabled, ms_tenant_id, ms_connected_at, allowed_domains")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="hi5-panel p-6">
          <div className="text-xs opacity-70">Integrations</div>
          <h1 className="text-2xl font-extrabold mt-1">Microsoft Entra ID</h1>
          <p className="text-sm opacity-75 mt-2">
            Enable Microsoft sign-in and (later) import users/devices from your tenant.
          </p>
        </div>

        <MicrosoftIntegrationClient initial={settings ?? null} />
      </div>
    </div>
  );
}
