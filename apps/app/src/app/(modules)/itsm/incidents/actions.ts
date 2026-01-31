"use server";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@hi5tech/auth";
import { getActiveTenantId } from "@/lib/tenant";

function s(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function supabaseServer() {
  const cookieStore = await cookies();

  return createSupabaseServerClient({
    get(name: string) {
      return cookieStore.get(name)?.value;
    },
    set(name: string, value: string, options: any) {
      cookieStore.set({ name, value, ...(options ?? {}) });
    },
    remove(name: string, options: any) {
      const anyStore = cookieStore as any;
      if (typeof anyStore.delete === "function") {
        anyStore.delete(name);
        return;
      }
      cookieStore.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
    },
  });
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
  if (!user) return;
  if (!tenant_id) return;

  // Minimal insert (adjust columns to your schema)
  const insert = await supabase
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

  if (insert.error) {
    // If you want UI to show the error, throw:
    // throw new Error(insert.error.message);
    return;
  }

  return insert.data ?? null;
}
