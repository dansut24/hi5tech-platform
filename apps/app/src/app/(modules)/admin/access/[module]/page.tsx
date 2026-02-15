// apps/app/src/app/(modules)/admin/access/[module]/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import AccessTeamsClient from "../ui/access-teams-client";

export const dynamic = "force-dynamic";

type ModuleKey = "itsm" | "control" | "selfservice";

export default async function AdminAccessModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const mod = module as ModuleKey;
  if (!mod || !["itsm", "control", "selfservice"].includes(mod)) redirect("/admin");

  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user;
  if (!me) redirect("/login");

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) redirect("/apps");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, name, is_active")
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

  const { data: teams } = await supabase
    .from("teams")
    .select("id, key, name, modules, is_default_triage")
    .eq("tenant_id", tenant.id)
    .order("name", { ascending: true });

  const teamIds = (teams ?? []).map((t) => (t as any).id as string);
  const { data: roles } = teamIds.length
    ? await supabase
        .from("team_roles")
        .select("id, team_id, role_key, role_name, scopes")
        .in("team_id", teamIds)
        .order("role_key", { ascending: true })
    : { data: [] as any[] };

  return (
    <AccessTeamsClient
      moduleKey={mod}
      tenant={{
        id: tenant.id,
        name: tenant.name ?? tenant.subdomain,
        domain: tenant.domain,
        subdomain: tenant.subdomain,
      }}
      initial={{ teams: (teams as any[]) ?? [], roles: (roles as any[]) ?? [] }}
    />
  );
}
