// apps/app/src/app/api/admin/onboarding/complete/route.ts
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

    // Must be logged in
    const { data: userRes, error: uErr } = await supabase.auth.getUser();
    if (uErr) return json(false, 401, { error: uErr.message });
    const user = userRes.user;
    if (!user) return json(false, 401, { error: "Not authenticated" });

    // Resolve tenant from host
    const host = getEffectiveHost(await headers());
    const parsed = parseTenantHost(host);
    if (!parsed.subdomain) return json(false, 400, { error: "No tenant subdomain" });

    const { data: tenant, error: tErr } = await supabase
      .from("tenants")
      .select("id, name, domain, subdomain, is_active")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (tErr) return json(false, 400, { error: tErr.message });
    if (!tenant || tenant.is_active === false) {
      return json(false, 404, { error: "Tenant not found or inactive" });
    }

    // Must be owner/admin
    const { data: membership, error: mErr } = await supabase
      .from("memberships")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (mErr) return json(false, 400, { error: mErr.message });

    const role = String(membership?.role || "");
    const isAdmin = role === "owner" || role === "admin";
    if (!isAdmin) return json(false, 403, { error: "Forbidden" });

    // We UPSERT so onboarding works even if tenant_settings row doesn't exist yet.
    // IMPORTANT: if your table has NOT NULL columns, we provide safe defaults on insert.
    const nowIso = new Date().toISOString();

    const upsertPayload: Record<string, any> = {
      tenant_id: tenant.id,
      onboarding_completed: true,
      onboarding_completed_at: nowIso,

      // Safe defaults for common NOT NULL constraints (keep them aligned with your schema)
      company_name: tenant.name ?? tenant.subdomain ?? "Company",
      support_email: user.email ?? "support@example.com",
      timezone: "Europe/London",

      // Theme defaults (matches your existing theme tokens)
      accent_hex: "#00c1ff",
      accent_2_hex: "#ff4fe1",
      accent_3_hex: "#ffc42d",
      bg_hex: "#f8fafc",
      card_hex: "#ffffff",
      topbar_hex: "#ffffff",
      glow_1: 0.18,
      glow_2: 0.14,
      glow_3: 0.10,

      // If you use this in invites/SSO later
      allowed_domains: [],
      updated_at: nowIso,
    };

    const { error: sErr } = await supabase
      .from("tenant_settings")
      .upsert(upsertPayload, { onConflict: "tenant_id" });

    if (sErr) return json(false, 400, { error: sErr.message });

    // Optional: read back to confirm (helps debugging + stops “it said ok but didn’t save”)
    const { data: settingsCheck, error: cErr } = await supabase
      .from("tenant_settings")
      .select("onboarding_completed")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (cErr) return json(false, 400, { error: cErr.message });

    return json(true, 200, { onboarding_completed: Boolean(settingsCheck?.onboarding_completed) });
  } catch (e: any) {
    return json(false, 500, { error: e?.message || "Server error" });
  }
}
