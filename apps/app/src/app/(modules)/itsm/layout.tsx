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

  return (
    <div className="min-h-dvh">
      {/* Theme is global now (RootLayout + globals.css).
          This layout should only provide ITSM chrome. */}
      <ItsmShell>{children}</ItsmShell>
    </div>
  );
}
