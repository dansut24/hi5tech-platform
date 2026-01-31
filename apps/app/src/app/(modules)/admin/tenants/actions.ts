"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

function s(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function b(formData: FormData, key: string): boolean {
  const v = String(formData.get(key) ?? "").toLowerCase().trim();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

/**
 * Upsert by subdomain (requires a UNIQUE index on tenants.subdomain).
 * Form fields: name, subdomain, company_name?, domain?
 */
export async function upsertTenant(formData: FormData): Promise<void> {
  const name = s(formData, "name");
  const subdomain = s(formData, "subdomain").toLowerCase();
  const company_name = s(formData, "company_name");
  const domain = s(formData, "domain");

  if (!name || !subdomain) return;

  const supabase = await supabaseServer();

  await supabase.from("tenants").upsert(
    {
      name,
      subdomain,
      company_name: company_name || null,
      domain: domain || null,
      is_active: true,
    },
    { onConflict: "subdomain" }
  );

  revalidatePath("/admin/tenants");
}

/**
 * Toggle tenant active flag by subdomain.
 * Form fields: subdomain, is_active
 */
export async function setTenantActive(formData: FormData): Promise<void> {
  const subdomain = s(formData, "subdomain").toLowerCase();
  const is_active = b(formData, "is_active");

  if (!subdomain) return;

  const supabase = await supabaseServer();

  await supabase.from("tenants").update({ is_active }).eq("subdomain", subdomain);

  revalidatePath("/admin/tenants");
}

/**
 * Delete tenant by subdomain.
 * Form fields: subdomain
 */
export async function deleteTenant(formData: FormData): Promise<void> {
  const subdomain = s(formData, "subdomain").toLowerCase();
  if (!subdomain) return;

  const supabase = await supabaseServer();

  await supabase.from("tenants").delete().eq("subdomain", subdomain);

  revalidatePath("/admin/tenants");
}
