import { supabaseServer } from "@/lib/supabase/server";

/**
 * Returns team IDs the current user belongs to, scoped to provided tenant IDs.
 *
 * Assumptions:
 * - public.team_members has: team_id, user_id   (no tenant_id)
 * - public.teams has: id, tenant_id
 */
export async function getMyTeamIdsForTenants(tenantIds: string[]): Promise<string[]> {
  if (!tenantIds.length) return [];

  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return [];

  // 1) Get my team IDs (no tenant_id required)
  const { data: memberRows, error: memErr } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  if (memErr) throw new Error(memErr.message);

  const teamIds = Array.from(
    new Set((memberRows ?? []).map((r: any) => r.team_id).filter(Boolean))
  );

  if (!teamIds.length) return [];

  // 2) Filter to teams that belong to tenants I’m a member of
  const { data: teams, error: teamErr } = await supabase
    .from("teams")
    .select("id")
    .in("id", teamIds)
    .in("tenant_id", tenantIds);

  if (teamErr) throw new Error(teamErr.message);

  return Array.from(new Set((teams ?? []).map((t: any) => t.id).filter(Boolean)));
}
