import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

function json(ok: boolean, status: number, payload: any) {
  return NextResponse.json({ ok, ...payload }, { status });
}

export async function POST() {
  try {
    const supabase = await supabaseServer();

    // Auth
    const { data: userRes, error: uErr } = await supabase.auth.getUser();
    if (uErr || !userRes.user) {
      return json(false, 401, { error: "Not authenticated" });
    }
    const user = userRes.user;

    // Resolve tenant from host
    const host = getEffectiveHost(await headers());
    const parsed = parseTenantHost(host);
    if (!parsed.subdomain) {
      return json(false, 400, { error: "No tenant context" });
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, domain, subdomain, is_active")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (!tenant || tenant.is_active === false) {
      return json(false, 404, { error: "Tenant not found or inactive" });
    }

    // Role check
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .maybeSingle();

    const role = String(membership?.role || "");
    if (role !== "owner" && role !== "admin") {
      return json(false, 403, { error: "Forbidden" });
    }

    /**
     * IMPORTANT:
     * - We UPSERT so this works even if tenant_settings row doesn't exist yet
     * - We only include columns that ACTUALLY EXIST
     * - We satisfy NOT NULL constraints with safe defaults
     */
    const upsertPayload = {
      tenant_id: tenant.id,
      onboarding_completed: true,

      company_name: tenant.name ?? tenant.subdomain ?? "Company",
      support_email: user.email ?? "support@example.com",
      timezone: "Europe/London",

      accent_hex: "#00c1ff",
      accent_2_hex: "#ff4fe1",
      accent_3_hex: "#ffc42d",
      bg_hex: "#f8fafc",
      card_hex: "#ffffff",
      topbar_hex: "#ffffff",

      glow_1: 0.18,
      glow_2: 0.14,
      glow_3: 0.10,

      allowed_domains: [],
    };

    const { error: upsertErr } = await supabase
      .from("tenant_settings")
      .upsert(upsertPayload, { onConflict: "tenant_id" });

    if (upsertErr) {
      return json(false, 400, { error: upsertErr.message });
    }

    // Confirm write (hard guarantee for redirect logic)
    const { data: settings } = await supabase
      .from("tenant_settings")
      .select("onboarding_completed")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    return json(true, 200, {
      onboarding_completed: Boolean(settings?.onboarding_completed),
    });
  } catch (e: any) {
    return json(false, 500, { error: e?.message || "Server error" });
  }
}
