import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type PlatformAdminRole =
  | "owner"
  | "super_admin"
  | "support_admin"
  | "billing_admin"
  | "readonly_auditor"
  | "testing_admin";

export type PlatformAdminContext = {
  userId: string;
  email: string;
  role: PlatformAdminRole;
  isTestingMode: boolean;
};

/**
 * TEMPORARY TESTING GUARD
 *
 * For now, any signed-in user can access /admin-console.
 *
 * Later we will enforce:
 * - user exists in platform_admin_users
 * - is_active = true
 * - MFA verified
 * - role permissions
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    redirect("/admin-console/login");
  }

  return {
    userId: user.id,
    email: user.email || "unknown",
    role: "testing_admin",
    isTestingMode: true,
  };
}

export function canManageBilling(role: PlatformAdminRole) {
  return role === "owner" || role === "super_admin" || role === "billing_admin" || role === "testing_admin";
}

export function canManageTenants(role: PlatformAdminRole) {
  return role === "owner" || role === "super_admin" || role === "support_admin" || role === "testing_admin";
}

export function canReadOnly(role: PlatformAdminRole) {
  return [
    "owner",
    "super_admin",
    "support_admin",
    "billing_admin",
    "readonly_auditor",
    "testing_admin",
  ].includes(role);
}
