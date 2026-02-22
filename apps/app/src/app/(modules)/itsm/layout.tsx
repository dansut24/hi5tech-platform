import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ItsmShell from "./_components/ItsmShell";

export default async function ItsmLayout({ children }: { children: ReactNode }) {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  // Fetch name and current tenant label for the account dropdown
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  // Get first tenant membership for label
  const { data: membership } = await supabase
    .from("memberships")
    .select("tenants(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  const tenantLabel = (membership?.tenants as any)?.name ?? null;
  const fullName = profile?.full_name ?? null;

  return (
    <ItsmShell
      user={{
        name: fullName,
        email: user.email,
        role: null,
      }}
      tenantLabel={tenantLabel}
    >
      {children}
    </ItsmShell>
  );
}
