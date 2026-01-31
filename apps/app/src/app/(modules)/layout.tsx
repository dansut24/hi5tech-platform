import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

export default async function ModulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();

  // Auth guard
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  // Load memberships
  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, tenant_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const membershipIds = (memberships ?? []).map((m) => m.id);

  // Load module assignments
  const { data: mods } = await supabase
    .from("module_assignments")
    .select("module")
    .in("membership_id", membershipIds.length ? membershipIds : [""]);

  const allowedModules = Array.from(
    new Set((mods ?? []).map((m) => m.module))
  ) as ModuleKey[];

  // Resolve tenant label (first membership = active tenant for now)
  let tenantLabel: string | null = null;
  const tenantId = memberships?.[0]?.tenant_id;

  if (tenantId) {
    const { data: t } = await supabase
      .from("tenants")
      .select("domain, subdomain, name")
      .eq("id", tenantId)
      .maybeSingle();

    if (t) {
      const host =
        t.subdomain && t.domain
          ? `${t.subdomain}.${t.domain}`
          : t.domain || t.name;

      tenantLabel = host || null;
    }
  }

  // User theme settings
  const { data: s } = await supabase
    .from("user_settings")
    .select("theme_mode, accent_hex, bg_hex, card_hex")
    .eq("user_id", user.id)
    .maybeSingle();

  const theme_mode = (s?.theme_mode ?? "system") as
    | "system"
    | "light"
    | "dark";

  const accent_hex = s?.accent_hex ?? "#2563eb";
  const bg_hex = s?.bg_hex ?? "#ffffff";
  const card_hex = s?.card_hex ?? "#ffffff";

  const forceDarkClass = theme_mode === "dark" ? "dark" : "";

  const cssVars = `
:root {
  --hi5-accent: ${accent_hex};
  --hi5-bg: ${bg_hex};
  --hi5-card: ${card_hex};
}
`;

  return (
  <div className={`min-h-dvh ${forceDarkClass}`}>
    <style dangerouslySetInnerHTML={{ __html: cssVars }} />
    <main className="w-full">{children}</main>
  </div>
);
}
