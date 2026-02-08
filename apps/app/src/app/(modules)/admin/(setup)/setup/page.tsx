// apps/app/src/app/(modules)/admin/(setup)/setup/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

// ✅ IMPORTANT: correct path (admin/setup/ui) not (admin/(setup)/ui)
import SetupWizard from "../../setup/ui/setup-wizard";

export const dynamic = "force-dynamic";

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
    .select("id, name, domain, subdomain, is_active")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant || tenant.is_active === false) redirect("/apps");

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
          initial={settings ?? null}
        />
      </div>
    </div>
  );
}
