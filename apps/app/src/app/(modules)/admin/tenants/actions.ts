"use server";

import { createSupabaseServerClient } from "@hi5tech/auth";
import { requireSuperAdmin } from "../_admin";

function toSubdomain(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createTenant(formData: FormData) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) throw new Error("Not authorized");

  const name = String(formData.get("name") ?? "").trim();
  const company_name = String(formData.get("company_name") ?? "").trim();
  const domain = String(formData.get("domain") ?? "").trim().toLowerCase();
  const subdomainRaw = String(formData.get("subdomain") ?? "");
  const subdomain = toSubdomain(subdomainRaw);
  const is_active = formData.get("is_active") === "on";

  if (!name) throw new Error("Tenant name is required");
  if (!domain) throw new Error("Domain is required (e.g. hi5tech.co.uk)");
  if (!subdomain) throw new Error("Subdomain is required (e.g. acme)");

  const supabase = createSupabaseServerClient();

  // Upsert by subdomain (requires unique index on tenants.subdomain)
  const { error } = await supabase.from("tenants").upsert(
    {
      name,
      company_name: company_name || null,
      domain,
      subdomain,
      is_active,
    },
    { onConflict: "subdomain" }
  );

  if (error) throw new Error(error.message);
}
