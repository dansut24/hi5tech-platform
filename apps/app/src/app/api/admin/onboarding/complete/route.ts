// apps/app/src/app/api/admin/onboarding/complete/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

function json(ok: boolean, status: number, payload: any) {
  return NextResponse.json({ ok, ...payload }, { status, headers: { "cache-control": "no-store" } });
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
     * DO NOT overwrite theme settings here.
     * Only mark onboarding as complete.
     *
     * Also: if you have an old column `onboarding_complete`, we set it too
     * but we do it in a safe way that won’t crash if it doesn’t exist.
     */
    const base = {
      tenant_id: tenant.id,
      onboarding_completed: true,
    };

    // Try to upsert with both flags (new + legacy)
    const tryWithLegacy = await supabase
      .from("tenant_settings")
      .upsert({ ...base, onboarding_complete: true } as any, { onConflict: "tenant_id" });

    if (tryWithLegacy.error) {
      // If legacy column doesn't exist, retry without it
      const retry = await supabase
        .from("tenant_settings")
        .upsert(base, { onConflict: "tenant_id" });

      if (retry.error) {
        return json(false, 400, { error: retry.error.message });
      }
    }

    // Confirm
    const { data: settings, error: readErr } = await supabase
      .from("tenant_settings")
      .select("onboarding_completed, onboarding_complete, updated_at")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (readErr) {
      return json(true, 200, { onboarding_completed: true });
    }

    const done = Boolean((settings as any)?.onboarding_completed ?? (settings as any)?.onboarding_complete);

    return json(true, 200, { onboarding_completed: done, tenant_settings: settings });
  } catch (e: any) {
    return json(false, 500, { error: e?.message || "Server error" });
  }
}
