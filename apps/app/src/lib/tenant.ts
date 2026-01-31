import { createSupabaseServerClient } from "@hi5tech/auth";

export async function getActiveTenantId(): Promise<string> {
  const supabase = await createSupabaseServerClient();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) throw new Error("Not logged in");

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("tenant_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const tenantId = memberships?.[0]?.tenant_id;
  if (!tenantId) throw new Error("No tenant membership found");

  return tenantId;
}

export async function getMemberTenantIds(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) throw new Error("Not logged in");

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  const ids = (memberships ?? []).map((m: any) => m.tenant_id).filter(Boolean);
  return Array.from(new Set(ids));
}