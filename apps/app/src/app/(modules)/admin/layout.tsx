import type { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import { headers } from "next/headers";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await supabaseServer();

  // must be signed in
  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user;
  if (!me) redirect("/login");

  // resolve tenant from host
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);

  if (!parsed.subdomain) {
    // no tenant subdomain => admin module should not exist
    notFound();
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, is_active")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant || tenant.is_active === false) notFound();

  // must have membership in this tenant
  const { data: membership } = await supabase
    .from("memberships")
    .select("id, role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", me.id)
    .maybeSingle();

  const myRole = String(membership?.role || "");
  const isAdminRole = myRole === "owner" || myRole === "admin";

  if (!membership?.id || !isAdminRole) {
    // Hide the existence of /admin completely
    notFound();
  }

  // must also have admin module assignment (if you're using module gating)
  const { data: modRow } = await supabase
    .from("module_assignments")
    .select("id")
    .eq("membership_id", membership.id)
    .eq("module", "admin")
    .maybeSingle();

  if (!modRow?.id) notFound();

  return <>{children}</>;
}
