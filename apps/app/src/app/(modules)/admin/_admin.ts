import { supabaseServer } from "@/lib/supabase/server";

export async function requireSuperAdmin() {
  const supabase = await supabaseServer();

  const { data: u } = await supabase.auth.getUser();
  const user = u.user;

  if (!user) {
    return { ok: false as const, reason: "not_logged_in" as const };
  }

  // If you already have an rbac helper, use it here.
  // Otherwise, simplest “super admin” check: look for membership role in your DB.
  // Adjust table/column names to your schema.
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .maybeSingle();

  if (!membership) {
    return { ok: false as const, reason: "not_super_admin" as const };
  }

  return { ok: true as const, userId: user.id };
}
