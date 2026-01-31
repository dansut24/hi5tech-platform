"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@hi5tech/auth";

function s(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Adds a membership row: memberships(tenant_id, user_id, role)
 * Form fields: tenant_id, user_id, role
 */
export async function addUserToTenant(formData: FormData): Promise<void> {
  const tenant_id = s(formData, "tenant_id");
  const user_id = s(formData, "user_id");
  const role = s(formData, "role") || "user";

  if (!tenant_id || !user_id) return;

  const supabase = await createSupabaseServerClient();

  await supabase
    .from("memberships")
    .insert({ tenant_id, user_id, role })
    .select("id")
    .single();

  revalidatePath("/admin/users");
  revalidatePath("/admin/tenants");
}

/**
 * Updates membership role.
 * Form fields: membership_id, role
 */
export async function setMembershipRole(formData: FormData): Promise<void> {
  const membership_id = s(formData, "membership_id");
  const role = s(formData, "role") || "user";
  if (!membership_id) return;

  const supabase = await createSupabaseServerClient();

  await supabase.from("memberships").update({ role }).eq("id", membership_id);

  revalidatePath("/admin/users");
  revalidatePath("/admin/tenants");
}

/**
 * Removes membership by id.
 * Form fields: membership_id
 */
export async function removeMembership(formData: FormData): Promise<void> {
  const membership_id = s(formData, "membership_id");
  if (!membership_id) return;

  const supabase = await createSupabaseServerClient();

  await supabase.from("memberships").delete().eq("id", membership_id);

  revalidatePath("/admin/users");
  revalidatePath("/admin/tenants");
}
