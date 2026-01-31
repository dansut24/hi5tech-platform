"use server";

import { createSupabaseServerClient } from "@hi5tech/auth";
import { requireSuperAdmin } from "../_admin";

const ALL = ["itsm", "control", "selfservice", "admin"] as const;

export async function createMembership(formData: FormData) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) throw new Error("Not authorized");

  const tenant_id = String(formData.get("tenant_id") ?? "").trim();
  const user_id = String(formData.get("user_id") ?? "").trim();
  const role = String(formData.get("role") ?? "user").trim();

  if (!tenant_id || !user_id) throw new Error("Missing tenant_id or user_id");

  const supabase = createSupabaseServerClient();

  const { data: membership, error } = await supabase
    .from("memberships")
    .insert({ tenant_id, user_id, role })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // optional modules
  for (const m of ALL) {
    if (formData.get(`m_${m}`) === "on") {
      const { error: e2 } = await supabase
        .from("module_assignments")
        .insert({ membership_id: membership.id, module: m });
      if (e2) throw new Error(e2.message);
    }
  }
}

export async function updateModules(formData: FormData) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) throw new Error("Not authorized");

  const membership_id = String(formData.get("membership_id") ?? "").trim();
  if (!membership_id) throw new Error("Missing membership_id");

  const supabase = createSupabaseServerClient();

  // reset modules
  const { error: delErr } = await supabase
    .from("module_assignments")
    .delete()
    .eq("membership_id", membership_id);

  if (delErr) throw new Error(delErr.message);

  for (const m of ALL) {
    if (formData.get(`m_${m}`) === "on") {
      const { error: insErr } = await supabase
        .from("module_assignments")
        .insert({ membership_id, module: m });
      if (insErr) throw new Error(insErr.message);
    }
  }
}