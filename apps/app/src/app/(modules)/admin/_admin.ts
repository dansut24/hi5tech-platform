import { createSupabaseServerClient } from "@hi5tech/auth";

export async function requireSuperAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return { ok: false as const, reason: "not_logged_in" as const };

  const { data: me } = await supabase
    .from("memberships")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .limit(1)
    .maybeSingle();

  if (!me) return { ok: false as const, reason: "not_super_admin" as const };

  return { ok: true as const, userId: user.id };
}