"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@hi5tech/auth";

function s(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function b(formData: FormData, key: string): boolean {
  const v = String(formData.get(key) ?? "").toLowerCase().trim();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

async function supabaseFromCookies() {
  const cookieStore = await cookies();
  return createSupabaseServerClient({
    get(name: string) {
      return cookieStore.get(name)?.value;
    },
    // Server Actions can set cookies via NextResponse in a route handler,
    // but inside server actions we keep these as no-ops for now.
    set() {},
    remove() {},
  });
}

/**
 * Create a membership record linking a user to a tenant with a role.
 * Form fields: tenant_id, user_id, role
 */
export async function createMembership(formData: FormData): Promise<void> {
  const tenant_id = s(formData, "tenant_id");
  const user_id = s(formData, "user_id");
  const role = s(formData, "role") || "user";

  if (!tenant_id || !user_id) return;

  const supabase = await supabaseFromCookies();

  await supabase
    .from("memberships")
    .insert({ tenant_id, user_id, role })
    .select("id")
    .single();

  revalidatePath("/admin/users");
}

/**
 * Remove a membership by id.
 * Form fields: id
 */
export async function removeMembership(formData: FormData): Promise<void> {
  const id = s(formData, "id");
  if (!id) return;

  const supabase = await supabaseFromCookies();

  await supabase.from("memberships").delete().eq("id", id);

  revalidatePath("/admin/users");
}

/**
 * Add user to tenant (alias of createMembership) - if your UI calls this name.
 * Form fields: tenant_id, user_id, role
 */
export async function addUserToTenant(formData: FormData): Promise<void> {
  return createMembership(formData);
}

/**
 * Update allowed modules for a tenant (if your UI supports it).
 * Form fields: tenant_id, modules (comma separated) OR modules[] (multi)
 */
export async function updateModules(formData: FormData): Promise<void> {
  const tenant_id = s(formData, "tenant_id");
  if (!tenant_id) return;

  // support either "modules" as CSV or multiple "modules[]" fields
  const modulesCsv = s(formData, "modules");
  const modulesMulti = formData.getAll("modules[]").map((x) => String(x).trim()).filter(Boolean);

  const modules =
    modulesMulti.length > 0
      ? modulesMulti
      : modulesCsv
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);

  const supabase = await supabaseFromCookies();

  await supabase.from("tenants").update({ allowed_modules: modules }).eq("id", tenant_id);

  revalidatePath("/admin/users");
}

/**
 * Toggle a user's disabled flag (if you have such a field).
 * Form fields: user_id, disabled
 */
export async function setUserDisabled(formData: FormData): Promise<void> {
  const user_id = s(formData, "user_id");
  const disabled = b(formData, "disabled");
  if (!user_id) return;

  const supabase = await supabaseFromCookies();

  await supabase.from("profiles").update({ disabled }).eq("id", user_id);

  revalidatePath("/admin/users");
}
