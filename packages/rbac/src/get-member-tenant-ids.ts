import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@hi5tech/auth";

/**
 * Returns tenant IDs the current logged-in user belongs to (via memberships table).
 * Safe default: returns [] if not logged in / no memberships.
 *
 * Expects a table: memberships(user_id, tenant_id)
 */
export async function getMemberTenantIds(): Promise<string[]> {
  const supabase = await createSupabaseServerClient(await cookies());

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id);

  if (error || !data) return [];

  // handle both string + uuid types safely
  return data
    .map((r: any) => String(r.tenant_id ?? "").trim())
    .filter(Boolean);
}
