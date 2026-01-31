"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@hi5tech/auth";

type UpsertTenantInput = {
  name: string;
  company_name?: string | null;
  domain?: string | null;
  subdomain: string;
  is_active?: boolean;
};

export async function upsertTenant(input: UpsertTenantInput) {
  const supabase = await createSupabaseServerClient();

  const name = (input.name || "").trim();
  const subdomain = (input.subdomain || "").trim().toLowerCase();

  if (!name) return { ok: false, error: "Tenant name is required." as const };
  if (!subdomain) return { ok: false, error: "Subdomain is required." as const };

  // Upsert by subdomain (requires unique index on tenants.subdomain)
  const { error } = await supabase.from("tenants").upsert(
    {
      name,
      company_name: input.company_name ?? null,
      domain: input.domain ?? null,
      subdomain,
      is_active: input.is_active ?? true,
    },
    { onConflict: "subdomain" }
  );

  if (error) return { ok: false, error: error.message as const };

  revalidatePath("/admin/tenants");
  return { ok: true as const };
}

export async function setTenantActive(subdomain: string, is_active: boolean) {
  const supabase = await createSupabaseServerClient();

  const sd = (subdomain || "").trim().toLowerCase();
  if (!sd) return { ok: false, error: "Subdomain is required." as const };

  const { error } = await supabase
    .from("tenants")
    .update({ is_active })
    .eq("subdomain", sd);

  if (error) return { ok: false, error: error.message as const };

  revalidatePath("/admin/tenants");
  return { ok: true as const };
}

export async function deleteTenant(subdomain: string) {
  const supabase = await createSupabaseServerClient();

  const sd = (subdomain || "").trim().toLowerCase();
  if (!sd) return { ok: false, error: "Subdomain is required." as const };

  const { error } = await supabase.from("tenants").delete().eq("subdomain", sd);

  if (error) return { ok: false, error: error.message as const };

  revalidatePath("/admin/tenants");
  return { ok: true as const };
}
