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

/**
 * --------- Compatibility exports ----------
 * Your page.tsx still imports these old names.
 * Keep them so builds pass, then we can refactor page.tsx later.
 */

/** Alias for older imports */
export async function createMembership(formData: FormData): Promise<void> {
  return addUserToTenant(formData);
}

/**
 * Updates allowed modules for a membership/user if you have a user_modules table.
 * Expected fields: user_id, tenant_id, modules (comma list or JSON string)
 *
 * If your schema differs, we can adjust later — for now this prevents build breaks.
 */
export async function updateModules(formData: FormData): Promise<void> {
  const user_id = s(formData, "user_id");
  const tenant_id = s(formData, "tenant_id");
  const raw = String(formData.get("modules") ?? "").trim();

  // Try to parse JSON array; otherwise treat as comma-separated.
  let modules: string[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) modules = parsed.map(String);
      else modules = raw.split(",").map((x) => x.trim()).filter(Boolean);
    } catch {
      modules = raw.split(",").map((x) => x.trim()).filter(Boolean);
    }
  }

  if (!user_id || !tenant_id) return;

  const supabase = await createSupabaseServerClient();

  // If you already have a `user_modules` table (you do in ITSM), this will work.
  // Columns assumed: user_id uuid, tenant_id uuid, modules text[] (or jsonb)
  // If your column type is different, it will throw at runtime but still build.
  await supabase.from("user_modules").upsert(
    {
      user_id,
      tenant_id,
      modules: modules.length ? modules : null,
    } as any,
    { onConflict: "user_id,tenant_id" } as any
  );

  revalidatePath("/admin/users");
  revalidatePath("/apps");
}
