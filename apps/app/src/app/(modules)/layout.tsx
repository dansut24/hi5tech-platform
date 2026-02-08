// apps/app/src/app/(modules)/layout.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

function normalizeHost(rawHost: string) {
  return (rawHost || "").split(":")[0].trim().toLowerCase();
}

/**
 * Resolve tenant lookup keys from host.
 * - tenant subdomain: dan-sutton.hi5tech.co.uk  -> { domain: hi5tech.co.uk, subdomain: dan-sutton }
 * - custom domain:    acme.com                  -> { domain: acme.com, subdomain: null }
 * - root / non-tenant: hi5tech.co.uk or app.hi5tech.co.uk -> null
 */
function tenantKeyFromHost(host: string): { domain: string; subdomain: string | null } | null {
  const h = normalizeHost(host);

  if (!h) return null;
  if (h === "localhost" || h.endsWith(".vercel.app")) return null;

  if (h.endsWith(ROOT_DOMAIN)) {
    if (h === ROOT_DOMAIN) return null;

    const sub = h.slice(0, -ROOT_DOMAIN.length - 1);
    if (!sub) return null;
    if (sub === "www" || sub === "app") return null;

    return { domain: ROOT_DOMAIN, subdomain: sub };
  }

  return { domain: h, subdomain: null };
}

export default async function ModulesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();

  // Auth guard
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  // Tenant from host
  const h = await headers();
  const host = normalizeHost(h.get("host") || "");
  const tenantKey = tenantKeyFromHost(host);

  // If not a tenant host, go to apps selector
  if (!tenantKey) redirect("/apps");

  // Resolve tenant
  let resolvedTenant: { id: string; domain: string | null; subdomain: string | null; name: string | null } | null =
    null;

  if (tenantKey.subdomain) {
    const { data } = await supabase
      .from("tenants")
      .select("id, domain, subdomain, name")
      .eq("domain", tenantKey.domain)
      .eq("subdomain", tenantKey.subdomain)
      .maybeSingle();
    resolvedTenant = (data as any) ?? null;
  } else {
    const { data } = await supabase
      .from("tenants")
      .select("id, domain, subdomain, name")
      .eq("domain", tenantKey.domain)
      .is("subdomain", null)
      .maybeSingle();
    resolvedTenant = (data as any) ?? null;
  }

  if (!resolvedTenant) {
    redirect(`/tenant-available?requested=${encodeURIComponent(tenantKey.subdomain ?? tenantKey.domain)}`);
  }

  const tenantId = resolvedTenant.id;

  // Membership check (scoped to tenant)
  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, tenant_id, created_at")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const activeMembershipId = memberships?.[0]?.id ?? null;
  if (!activeMembershipId) redirect(`/login?error=tenant_access`);

  // Module assignments (kept here for later)
  // Not currently used, but intentionally retained for future module shell / nav gating.
  const { data: mods } = await supabase
    .from("module_assignments")
    .select("module")
    .eq("membership_id", activeMembershipId);

  const allowedModules = Array.from(new Set((mods ?? []).map((m) => m.module))) as ModuleKey[];
  void allowedModules; // avoid unused lint warnings while we keep it for later

  const tenantLabel =
    resolvedTenant.subdomain && resolvedTenant.domain
      ? `${resolvedTenant.subdomain}.${resolvedTenant.domain}`
      : resolvedTenant.domain || resolvedTenant.name || null;
  void tenantLabel;

  // ✅ IMPORTANT CHANGE:
  // Do NOT inject CSS vars here. Root layout is the single source of truth for theme tokens.
  // This layout is only for auth + tenant/membership gating.

  return (
    <div className="hi5-bg min-h-dvh">
      <main className="w-full">{children}</main>
    </div>
  );
}
