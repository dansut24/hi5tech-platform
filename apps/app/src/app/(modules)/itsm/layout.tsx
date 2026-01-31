import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ItsmShell from "./_components/ItsmShell";

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

export default async function ItsmLayout({ children }: { children: ReactNode }) {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  // Active tenant: newest membership for now
  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, tenant_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const tenantId = memberships?.[0]?.tenant_id ?? null;

  // Optional: tenant label (kept for later use in ItsmShell if you want)
  let tenantLabel: string | null = null;
  if (tenantId) {
    const { data: t } = await supabase
      .from("tenants")
      .select("domain, subdomain, name")
      .eq("id", tenantId)
      .maybeSingle();

    if (t) {
      const host =
        t.subdomain && t.domain ? `${t.subdomain}.${t.domain}` : t.domain;
      tenantLabel = host || t.name || null;
    }
  }

  // Allowed modules (for future header switcher)
  const { data: mods } = await supabase
    .from("module_assignments")
    .select("module")
    .in("membership_id", memberships?.map((m) => m.id) ?? []);

  const allowedModules = Array.from(
    new Set((mods ?? []).map((m) => m.module))
  ) as ModuleKey[];

  // Theme comes from RootLayout globally now
  return <ItsmShell>{children}</ItsmShell>;
}
