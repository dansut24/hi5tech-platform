import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get all tenant IDs the current user belongs to.
 *
 * IMPORTANT:
 * - This function does NOT create a Supabase client
 * - The caller (apps/app) must pass one in
 */
export async function getMemberTenantIds(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) throw new Error("Not logged in");

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  return Array.from(
    new Set((memberships ?? []).map((m) => m.tenant_id).filter(Boolean))
  );
}
