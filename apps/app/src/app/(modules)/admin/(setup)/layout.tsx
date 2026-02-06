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
    .select("id, domain, subdomain, is_active")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant || tenant.is_active === false) notFound();

  // Must be owner/admin to run setup
  const { data: myMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const myRole = String(myMembership?.role || "");
  const isAdmin = myRole === "owner" || myRole === "admin";
  if (!isAdmin) redirect("/apps");

  // ✅ No onboarding redirect here.
  return <>{children}</>;
}
