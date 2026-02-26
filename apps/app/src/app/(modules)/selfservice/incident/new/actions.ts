"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export async function createIncident(formData: FormData) {
  const supabase = await supabaseServer();

  // Auth
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  // Tenant resolution
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) throw new Error("No tenant context");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant) throw new Error("Tenant not found");

  // Profile (for submitted_by)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const priority = String(formData.get("priority") || "medium").toLowerCase();

  if (!title) throw new Error("Title is required");

  // Generate reference number
  const number = `INC-${Date.now().toString().slice(-6)}`;

  const { data: inserted, error } = await supabase
    .from("incidents")
    .insert({
      tenant_id: tenant.id,
      title,
      description,
      priority,
      status: "new",
      triage_status: "untriaged",
      requester_id: user.id,
      submitted_by: profile?.full_name ?? user.email,
      number,
    })
    .select("id")
    .single();

  if (error) {
    console.error(error);
    throw new Error("Failed to create incident");
  }

  redirect(`/selfservice/incident/${inserted.id}`);
}
