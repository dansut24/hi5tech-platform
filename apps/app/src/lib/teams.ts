import { supabaseServer } from "@/lib/supabase/server";

/**
 * Returns team IDs the current user belongs to, scoped to provided tenant IDs.
 *
 * Schema:
 * - public.memberships has: id, user_id, tenant_id, role
 * - public.team_members has: team_id, membership_id  (no direct user_id)
 * - public.teams has: id, tenant_id
 */
export async function getMyTeamIdsForTenants(tenantIds: string[]): Promise<string[]> {
  if (!tenantIds.length) return [];

  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return [];

  // 1) Get my membership IDs across the relevant tenants
  const { data: membershipRows, error: memErr } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .in("tenant_id", tenantIds);

  if (memErr) throw new Error(memErr.message);

  const membershipIds = (membershipRows ?? []).map((r: any) => r.id).filter(Boolean);
  if (!membershipIds.length) return [];

  // 2) Get team IDs via team_members using membership_id
  const { data: teamMemberRows, error: tmErr } = await supabase
    .from("team_members")
    .select("team_id")
    .in("membership_id", membershipIds);

  if (tmErr) throw new Error(tmErr.message);

  const teamIds = Array.from(
    new Set((teamMemberRows ?? []).map((r: any) => r.team_id).filter(Boolean))
  );

  if (!teamIds.length) return [];

  // 3) Filter to teams that belong to tenants I'm a member of
  const { data: teams, error: teamErr } = await supabase
    .from("teams")
    .select("id")
    .in("id", teamIds)
    .in("tenant_id", tenantIds);

  if (teamErr) throw new Error(teamErr.message);

  return Array.from(new Set((teams ?? []).map((t: any) => t.id).filter(Boolean)));
}
