"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/tenant";

function s(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Create a new incident.
 * Expects: title, description, priority (optional), etc.
 * Uses active tenant from session/tenant helper.
 */
export async function createIncident(formData: FormData) {
  const title = s(formData, "title");
  const description = s(formData, "description");
  const priority = s(formData, "priority") || null;

  if (!title) return;

  const supabase = await supabaseServer();
  const tenant_id = await getActiveTenantId();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user || !tenant_id) return;

  const { data, error } = await supabase
    .from("incidents")
    .insert({
      tenant_id,
      title,
      description: description || null,
      priority,
      requester_id: user.id,
      status: "open",
    })
    .select("id, number")
    .maybeSingle();

  if (error) return;

  return data ?? null;
}
