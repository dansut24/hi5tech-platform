"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@hi5tech/auth";
import { getMemberTenantIds } from "@/lib/tenant";
import { safeFileName } from "@/lib/files";

export async function uploadIncidentAttachment(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const tenantIds = await getMemberTenantIds();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) throw new Error("Not logged in");

  const number = String(formData.get("number") ?? "").trim();
  if (!number) throw new Error("Missing incident number");

  const file = formData.get("file") as File | null;
  if (!file || typeof file.arrayBuffer !== "function") throw new Error("No file provided");

  // Find incident
  const { data: incident, error: incErr } = await supabase
    .from("incidents")
    .select("id, tenant_id")
    .in("tenant_id", tenantIds.length ? tenantIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("number", number)
    .maybeSingle();

  if (incErr) throw new Error(incErr.message);
  if (!incident) throw new Error("Incident not found");

  const fileName = safeFileName(file.name || "attachment");
  const storagePath = `tenant/${incident.tenant_id}/incident/${incident.id}/${Date.now()}_${fileName}`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from("itsm-attachments")
    .upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (upErr) throw new Error(upErr.message);

  const { error: metaErr } = await supabase.from("itsm_attachments").insert({
    tenant_id: incident.tenant_id,
    entity_type: "incident",
    entity_id: incident.id,
    file_name: fileName,
    mime_type: file.type || null,
    byte_size: file.size || null,
    storage_path: storagePath,
    created_by: user.id,
  });

  if (metaErr) throw new Error(metaErr.message);

  redirect(`/itsm/incidents/${number}`);
}