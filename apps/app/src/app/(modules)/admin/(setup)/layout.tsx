// apps/app/src/app/(modules)/admin/(setup)/layout.tsx
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

export default async function AdminSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();

  // Must be logged in
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  // Tenant from host
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) notFound();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, name, is_active")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant || tenant.is_active === false) notFound();

  // Must be owner/admin
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const role = String(membership?.role || "");
  const isAdmin = role === "owner" || role === "admin";
  if (!isAdmin) redirect("/apps");

  // If already completed, never show setup again
  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("onboarding_completed")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (settings?.onboarding_completed) redirect("/apps");

  // Simple setup wrapper (no AdminShell during onboarding)
  return (
    <div className="min-h-dvh hi5-bg">
      <div className="p-4 sm:p-8">{children}</div>
    </div>
  );
}
