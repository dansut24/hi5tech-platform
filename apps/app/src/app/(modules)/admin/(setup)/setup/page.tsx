// apps/app/src/app/(modules)/admin/setup/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import SetupWizard from "@/app/(modules)/admin/setup/ui/setup-wizard";

export const dynamic = "force-dynamic";

type InitialSettings = {
  company_name: string | null;
  support_email: string | null;
  timezone: string | null;
  logo_url: string | null;
  accent_hex: string | null;
  accent_2_hex: string | null;
  accent_3_hex: string | null;
  allowed_domains: string[] | null;
  ms_enabled: boolean | null;
  ms_tenant_id: string | null;
  ms_connected_at: string | null;
  onboarding_completed: boolean | null;
};

function isInitialSettings(v: any): v is InitialSettings {
  return v && typeof v === "object" && !("error" in v);
}

export default async function AdminSetupPage() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user;
  if (!me) redirect("/login");

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) redirect("/apps");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, domain, subdomain")
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

  const { data: settingsRaw } = await supabase
    .from("tenant_settings")
    .select(
      [
        "company_name",
        "support_email",
        "timezone",
        "logo_url",
        "accent_hex",
        "accent_2_hex",
        "accent_3_hex",
        "allowed_domains",
        "ms_enabled",
        "ms_tenant_id",
        "ms_connected_at",
        "onboarding_completed",
      ].join(",")
    )
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  // ✅ Ensure we only ever pass InitialSettings | null to SetupWizard
  const settings: InitialSettings | null = isInitialSettings(settingsRaw)
    ? (settingsRaw as InitialSettings)
    : null;

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <SetupWizard
          tenant={{
            id: tenant.id,
            name: tenant.name ?? tenant.subdomain,
            subdomain: tenant.subdomain,
            domain: tenant.domain,
          }}
          me={{ email: me.email ?? "" }}
          initial={settings}
        />
      </div>
    </div>
  );
}
