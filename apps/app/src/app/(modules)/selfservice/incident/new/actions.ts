"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export async function createIncident(formData: FormData) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // ignore
          }
        },
      },
    }
  );

  // 🔎 Confirm session exists
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("NO USER IN SERVER ACTION");
    redirect("/login");
  }

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const priority = String(formData.get("priority") || "medium").toLowerCase();

  if (!title) throw new Error("Title is required");

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
