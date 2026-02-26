"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const runtime = "nodejs"; // IMPORTANT for consistent cookie behavior

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function serverSupabase() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // If this throws in some contexts, we don't want to crash.
            // Session should still be readable when valid.
          }
        },
      },
    }
  );
}

export async function createIncident(formData: FormData) {
  const supabase = serverSupabase();

  // ✅ Prefer getSession (more reliable in server actions)
  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession();

  if (sessionErr) {
    console.error("[createIncident] getSession error:", sessionErr);
  }

  const user = session?.user ?? null;

  if (!user) {
    // This is the redirect you're seeing as 303
    console.error("[createIncident] NO USER IN SERVER ACTION (session missing).");
    redirect("/login");
  }

  // Tenant resolution
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) {
    console.error("[createIncident] No tenant subdomain. host=", host);
    throw new Error("No tenant context");
  }

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (tenantErr) console.error("[createIncident] tenant lookup error:", tenantErr);

  if (!tenant) {
    console.error("[createIncident] Tenant not found for:", parsed);
    throw new Error("Tenant not found");
  }

  // Profile (for submitted_by)
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) console.error("[createIncident] profile lookup error:", profErr);

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
    console.error("[createIncident] insert error:", error);
    throw new Error(`Failed to create incident: ${error.message}`);
  }

  redirect(`/selfservice/incident/${inserted.id}`);
}
