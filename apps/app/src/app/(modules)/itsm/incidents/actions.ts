"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@hi5tech/auth";
import { getActiveTenantId } from "@/lib/tenant";

function clean(v: any) {
  return String(v ?? "").trim();
}

export async function createIncident(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const tenant_id = await getActiveTenantId();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) throw new Error("Not logged in");

  const title = clean(formData.get("title"));
  const description = clean(formData.get("description"));
  const priority = clean(formData.get("priority")) || "medium";

  if (!title) throw new Error("Title is required");

  // Generate INC-xxxxxx using your next_itsm_number() function if it exists.
  // If it doesn't exist yet, we fall back to a simple timestamp number.
  let number: string | null = null;

  const { data: num, error: numErr } = await supabase.rpc("next_itsm_number", {
    _tenant_id: tenant_id,
    _prefix: "INC",
    _key: "incident",
  });

  if (!numErr && typeof num === "string") {
    number = num;
  } else {
    number = "INC-" + String(Date.now()).slice(-6);
  }

  const { data, error } = await supabase
    .from("incidents")
    .insert({
      tenant_id,
      number,
      title,
      description: description || null,
      priority,
      status: "new",
      requester_id: user.id,
      created_by: user.id,
    })
    .select("number")
    .single();

  if (error) throw new Error(error.message);

  redirect(`/itsm/incidents/${data.number}`);
}