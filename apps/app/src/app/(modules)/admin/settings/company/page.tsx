// apps/app/src/app/(modules)/admin/settings/company/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import SettingsCompanyClient from "./ui/settings-company-client";

export const dynamic = "force-dynamic";

export default async function AdminSettingsCompanyPage() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

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

  // owner/admin only
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const role = String(membership?.role || "");
  if (role !== "owner" && role !== "admin") redirect("/apps");

  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("company_name, support_email, timezone, allowed_domains")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  return (
    <div className="min-h-dvh p-4 sm:p-8 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/settings" className="hi5-btn-ghost text-sm w-auto">
          ← Back
        </Link>
      </div>

      <div className="hi5-panel p-6">
        <div className="text-xs opacity-70">Admin Settings</div>
        <h1 className="text-2xl font-extrabold mt-1">Company</h1>
        <p className="text-sm opacity-75 mt-2">
          These values are used across the platform (emails, UI labels, onboarding defaults).
        </p>
      </div>

      <SettingsCompanyClient
        initial={{
          company_name: settings?.company_name ?? tenant.name ?? "",
          support_email: settings?.support_email ?? user.email ?? "",
          timezone: settings?.timezone ?? "Europe/London",
          allowed_domains: (settings?.allowed_domains as any) ?? [],
        }}
      />
    </div>
  );
}
