// apps/app/src/app/api/admin/setup/save/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

type Payload = {
  company_name?: string | null;
  support_email?: string | null;
  timezone?: string | null;

  logo_url?: string | null;

  accent_hex?: string | null;
  accent_2_hex?: string | null;
  accent_3_hex?: string | null;

  bg_hex?: string | null;
  card_hex?: string | null;
  topbar_hex?: string | null;

  glow_1?: number | null;
  glow_2?: number | null;
  glow_3?: number | null;

  allowed_domains?: string[] | null;

  ms_enabled?: boolean | null;
  ms_tenant_id?: string | null;
};

function json(ok: boolean, status: number, body: any) {
  return new NextResponse(JSON.stringify({ ok, ...body }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function clamp01(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    // Auth
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return json(false, 401, { error: "Not authenticated" });

    // Tenant from host
    const host = getEffectiveHost(await headers());
    const parsed = parseTenantHost(host);
    if (!parsed.subdomain) return json(false, 400, { error: "No tenant subdomain" });

    const { data: tenant, error: tErr } = await supabase
      .from("tenants")
      .select("id, domain, subdomain, is_active")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (tErr) return json(false, 400, { error: tErr.message });
    if (!tenant || tenant.is_active === false) return json(false, 404, { error: "Tenant not found" });

    // Must be owner/admin in this tenant
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

    // Body
    let payload: Payload;
    try {
      payload = (await req.json()) as Payload;
    } catch {
      return json(false, 400, { error: "Invalid JSON body" });
    }

    // Upsert tenant_settings
    const row = {
      tenant_id: tenant.id,

      company_name: payload.company_name ?? null,
      support_email: payload.support_email ?? null,
      timezone: payload.timezone ?? null,

      logo_url: payload.logo_url ?? null,

      accent_hex: payload.accent_hex ?? null,
      accent_2_hex: payload.accent_2_hex ?? null,
      accent_3_hex: payload.accent_3_hex ?? null,

      bg_hex: payload.bg_hex ?? null,
      card_hex: payload.card_hex ?? null,
      topbar_hex: payload.topbar_hex ?? null,

      glow_1: clamp01(payload.glow_1),
      glow_2: clamp01(payload.glow_2),
      glow_3: clamp01(payload.glow_3),

      allowed_domains: payload.allowed_domains ?? null,

      ms_enabled: payload.ms_enabled ?? null,
      ms_tenant_id: payload.ms_tenant_id ?? null,
    };

    const { error: upErr } = await supabase
      .from("tenant_settings")
      .upsert(row, { onConflict: "tenant_id" });

    if (upErr) return json(false, 400, { error: upErr.message });

    return json(true, 200, {});
  } catch (e: any) {
    return json(false, 500, { error: e?.message || "Server error" });
  }
}
