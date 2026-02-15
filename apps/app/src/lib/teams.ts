import { supabaseServer } from "@/lib/supabase/server";

/**
 * Returns the team IDs for the current user, scoped to tenant IDs.
 * Assumes `team_members` has: tenant_id, team_id, user_id.
 */
export async function getMyTeamIdsForTenants(tenantIds: string[]): Promise<string[]> {
  if (!tenantIds.length) return [];

  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, tenant_id")
    .eq("user_id", user.id)
    .in("tenant_id", tenantIds);

  if (error) throw new Error(error.message);

  const ids = (data ?? []).map((r: any) => r.team_id).filter(Boolean);
  return Array.from(new Set(ids));
}
