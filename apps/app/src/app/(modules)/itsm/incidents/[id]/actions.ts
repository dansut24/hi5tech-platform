"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@hi5tech/auth";
import { getMemberTenantIds } from "@/lib/tenant";

function clean(v: any) {
  return String(v ?? "").trim();
}

export async function addIncidentComment(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const tenantIds = await getMemberTenantIds();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) throw new Error("Not logged in");

  const number = clean(formData.get("number"));
  const body = clean(formData.get("body"));
  const is_internal = clean(formData.get("is_internal")) !== "false";

  if (!number) throw new Error("Missing incident number");
  if (!body) throw new Error("Comment cannot be empty");

  const { data: incident, error: incErr } = await supabase
    .from("incidents")
    .select("id, tenant_id")
    .in("tenant_id", tenantIds.length ? tenantIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("number", number)
    .maybeSingle();

  if (incErr) throw new Error(incErr.message);
  if (!incident) throw new Error("Incident not found");

  const { error } = await supabase.from("itsm_comments").insert({
    tenant_id: incident.tenant_id,
    entity_type: "incident",
    entity_id: incident.id,
    body,
    is_internal,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);

  redirect(`/itsm/incidents/${number}`);
}