"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

function s(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Form fields:
 * - incident_id
 * - message
 */
export async function addIncidentComment(formData: FormData) {
  const incident_id = s(formData, "incident_id");
  const message = s(formData, "message");

  if (!incident_id || !message) return;

  const supabase = await supabaseServer();
  const tenantIds = await getMemberTenantIds();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return;

  const { data: incident } = await supabase
    .from("incidents")
    .select("id,tenant_id")
    .eq("id", incident_id)
    .maybeSingle();

  if (!incident || !tenantIds.includes(incident.tenant_id)) return;

  await supabase.from("incident_comments").insert({
    incident_id,
    tenant_id: incident.tenant_id,
    author_id: user.id,
    message,
  });

  revalidatePath(`/itsm/incidents/${incident_id}`);
}
