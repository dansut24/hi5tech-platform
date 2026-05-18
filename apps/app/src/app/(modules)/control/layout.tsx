// apps/app/src/app/(modules)/control/layout.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { resolveTenantEnvironment } from "@/lib/tenant/environment-host";
import { getActiveEnvironmentFeatures } from "@/lib/entitlements";
import ControlShell from "./ui/control-shell";

export const dynamic = "force-dynamic";

async function getTenantAndMe() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user;
  if (!me) redirect("/login");

  const resolved = await resolveTenantEnvironment();
  if (!resolved?.tenantId || !resolved.tenant?.id) redirect("/apps");

  const tenant = resolved.tenant;

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, role, created_at")
    .eq("tenant_id", tenant.id)
    .eq("user_id", me.id)
    .maybeSingle();

  if (!membership) redirect("/apps");

  const { data: mod } = await supabase
    .from("module_assignments")
    .select("id, module")
    .eq("membership_id", membership.id)
    .eq("module", "control")
    .maybeSingle();

  if (!mod) redirect("/apps");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", me.id)
    .maybeSingle();

  const features = await getActiveEnvironmentFeatures(tenant.id);

  return { me, tenant, membership, profile, features, environmentKey: resolved.environmentKey };
}

export default async function ControlLayout({ children }: { children: React.ReactNode }) {
  const { me, tenant, membership, profile, features, environmentKey } = await getTenantAndMe();

  const tenantLabel = `${tenant.company_name || tenant.name || tenant.subdomain}${
    environmentKey === "production" ? "" : ` · ${environmentKey}`
  }`;

  return (
    <ControlShell
      tenantLabel={tenantLabel}
      features={features}
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
