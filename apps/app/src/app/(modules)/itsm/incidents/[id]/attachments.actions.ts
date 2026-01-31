"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

function s(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function fileFrom(formData: FormData, key: string): File | null {
  const v = formData.get(key);
  return v instanceof File ? v : null;
}

export async function uploadIncidentAttachment(formData: FormData) {
  const incident_id = s(formData, "incident_id");
  const tenant_id = s(formData, "tenant_id");
  const file = fileFrom(formData, "file");

  if (!incident_id || !tenant_id || !file) return;

  const supabase = await supabaseServer();

  // ✅ your tenant helper is 0-arg
  const tenantIds = await getMemberTenantIds();
  if (!tenantIds.includes(tenant_id)) return;

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return;

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const storage_path = `${tenant_id}/incidents/${incident_id}/${Date.now()}_${safeName}`;

  // ✅ bucket must match your page: "itsm-attachments"
  const upload = await supabase.storage
    .from("itsm-attachments")
    .upload(storage_path, file, { upsert: false, contentType: file.type || undefined });

  if (upload.error) return;

  // ✅ table/fields must match your page: itsm_attachments
  await supabase.from("itsm_attachments").insert({
    tenant_id,
    entity_type: "incident",
    entity_id: incident_id,
    file_name: file.name,
    mime_type: file.type || null,
    byte_size: file.size ?? null,
    storage_path,
    created_by: user.id,
  });
}

/**
 * Delete by attachment id.
 * Expects: tenant_id, attachment_id
 */
export async function deleteIncidentAttachment(formData: FormData) {
  const tenant_id = s(formData, "tenant_id");
  const attachment_id = s(formData, "attachment_id");

  if (!tenant_id || !attachment_id) return;

  const supabase = await supabaseServer();
  const tenantIds = await getMemberTenantIds();
  if (!tenantIds.includes(tenant_id)) return;

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return;

  const { data: row } = await supabase
    .from("itsm_attachments")
    .select("id,storage_path")
    .eq("tenant_id", tenant_id)
    .eq("id", attachment_id)
    .maybeSingle();

  if (!row?.storage_path) return;

  await supabase.storage.from("itsm-attachments").remove([row.storage_path]);

  await supabase
    .from("itsm_attachments")
    .delete()
    .eq("tenant_id", tenant_id)
    .eq("id", attachment_id);
}
