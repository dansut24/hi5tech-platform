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

  // Module access (Control)
  const { data: mod } = await supabase
    .from("module_assignments")
    .select("id, module")
    .eq("membership_id", membership.id)
    .eq("module", "control")
    .maybeSingle();

  if (!mod) redirect("/apps");

  // Optional: profile name if you store it (safe if missing)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", me.id)
    .maybeSingle();

  return { me, tenant, membership, profile };
}

export default async function ControlLayout({ children }: { children: React.ReactNode }) {
  const { me, tenant, membership, profile } = await getTenantAndMe();

  const tenantLabel = (tenant.company_name || tenant.name || tenant.subdomain) as string;

  return (
    <ControlShell
      tenantLabel={tenantLabel}
      user={{
        name: profile?.full_name ?? null,
        email: me.email || "",
        role: String(membership.role || "user"),
      }}
    >
      {children}
    </ControlShell>
  );
}
