// apps/app/src/app/admin/layout.tsx
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import AdminShell from "./ui/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();

  // Auth
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

  // Must be owner/admin in this tenant
  const { data: myMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const myRole = String(myMembership?.role || "");
  const isAdmin = myRole === "owner" || myRole === "admin";
  if (!isAdmin) {
    // Entire admin section out-of-bounds for non-admin users
    redirect("/apps");
  }

  // Profile (nice display in header)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    (profile?.full_name && String(profile.full_name).trim()) ||
    (user.email ? user.email.split("@")[0] : "User");

  const email = (profile?.email || user.email || "").toLowerCase();

  return (
    <AdminShell
      user={{
        id: user.id,
        name: displayName,
        email,
        role: myRole,
      }}
      tenant={{
        id: tenant.id,
        name: tenant.name ?? tenant.subdomain,
        domain: tenant.domain,
        subdomain: tenant.subdomain,
      }}
    >
      {children}
    </AdminShell>
  );
}
