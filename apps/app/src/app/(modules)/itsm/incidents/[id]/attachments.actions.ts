"use server";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@hi5tech/auth";
import { getMemberTenantIds } from "@hi5tech/rbac";

function s(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function fileFrom(formData: FormData, key: string): File | null {
  const v = formData.get(key);
  return v instanceof File ? v : null;
}

async function supabaseServer() {
  const cookieStore = await cookies();

  return createSupabaseServerClient({
    get(name: string) {
      return cookieStore.get(name)?.value;
    },
    set(name: string, value: string, options: any) {
      // next/headers cookies().set supports object form
      cookieStore.set({ name, value, ...(options ?? {}) });
    },
    remove(name: string, options: any) {
      // Prefer delete if available
      const anyStore = cookieStore as any;
      if (typeof anyStore.delete === "function") {
        anyStore.delete(name);
        return;
      }
      // Fallback: expire cookie
      cookieStore.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
    },
  });
}

/**
 * Upload an attachment for an incident.
 * Expects: incident_id, tenant_id, file
 */
export async function uploadIncidentAttachment(formData: FormData) {
  const incident_id = s(formData, "incident_id");
  const tenant_id = s(formData, "tenant_id");
  const file = fileFrom(formData, "file");

  if (!incident_id || !tenant_id || !file) return;

  const supabase = await supabaseServer();
  const tenantIds = await getMemberTenantIds(supabase);

  // Basic tenant guard
  if (!tenantIds.includes(tenant_id)) return;

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return;

  // Build a storage path
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${tenant_id}/incidents/${incident_id}/${Date.now()}_${safeName}`;

  // Upload to storage bucket: "incident_attachments"
  const upload = await supabase.storage
    .from("incident_attachments")
    .upload(path, file, { upsert: false });

  if (upload.error) {
    // You can throw if you want the UI to show an error
    // throw new Error(upload.error.message);
    return;
  }

  // Insert record (table name assumed: incident_attachments)
  await supabase.from("incident_attachments").insert({
    tenant_id,
    incident_id,
    path,
    filename: file.name,
    content_type: file.type || null,
    size: file.size ?? null,
    created_by: user.id,
  });
}

/**
 * Delete an attachment.
 * Expects: tenant_id, incident_id, path
 */
export async function deleteIncidentAttachment(formData: FormData) {
  const tenant_id = s(formData, "tenant_id");
  const incident_id = s(formData, "incident_id");
  const path = s(formData, "path");

  if (!tenant_id || !incident_id || !path) return;

  const supabase = await supabaseServer();
  const tenantIds = await getMemberTenantIds(supabase);
  if (!tenantIds.includes(tenant_id)) return;

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return;

  // Remove from storage
  await supabase.storage.from("incident_attachments").remove([path]);

  // Remove DB record
  await supabase
    .from("incident_attachments")
    .delete()
    .eq("tenant_id", tenant_id)
    .eq("incident_id", incident_id)
    .eq("path", path);
}
