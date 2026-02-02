// apps/app/src/app/(modules)/control/layout.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import ControlShell from "./ui/control-shell";

export const dynamic = "force-dynamic";

async function getTenantAndMe() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user;
  if (!me) redirect("/login");

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) redirect("/apps");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, name, company_name")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant) redirect("/apps");

  // Membership for role
  const { data: membership } = await supabase
    .from("memberships")
    .select("id, role, created_at")
    .eq("tenant_id", tenant.id)
    .eq("user_id", me.id)
    .maybeSingle();

  if (!membership) redirect("/apps");

  // Module access (Control) - if you use module_assignments
  const { data: mod } = await supabase
    .from("module_assignments")
    .select("id, module")
    .eq("membership_id", membership.id)
    .eq("module", "control")
    .maybeSingle();

  // If you don't use module_assignments yet, comment this gate out.
  if (!mod) redirect("/apps");

  return { supabase, me, tenant, membership };
}

export default async function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { me, tenant, membership } = await getTenantAndMe();

  return (
    <ControlShell
      tenantSubdomain={tenant.subdomain}
      tenantName={(tenant.company_name || tenant.name || tenant.subdomain) as string}
      userEmail={me.email || ""}
      userRole={String(membership.role || "user")}
    >
      {children}
    </ControlShell>
  );
}
