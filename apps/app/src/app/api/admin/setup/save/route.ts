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

  // legacy (keep)
  logo_url?: string | null;

  // new variants
  logo_light_url?: string | null;
  logo_dark_url?: string | null;

  accent_hex?: string | null;
  accent_2_hex?: string | null;
  accent_3_hex?: string | null;

  bg_hex?: string | null;
  card_hex?: string | null;
  topbar_hex?: string | null;

  glow_1?: number | string | null;
  glow_2?: number | string | null;
  glow_3?: number | string | null;

  allowed_domains?: string[] | string | null;

  ms_enabled?: boolean | null;
  ms_tenant_id?: string | null;
};

type ExistingSettings = {
  tenant_id: string;
  company_name: string | null;
  support_email: string | null;
  timezone: string | null;

  // legacy
  logo_url: string | null;

  // new
  logo_light_url: string | null;
  logo_dark_url: string | null;

  accent_hex: string | null;
  accent_2_hex: string | null;
  accent_3_hex: string | null;

  bg_hex: string | null;
  card_hex: string | null;
  topbar_hex: string | null;

  glow_1: number | null;
  glow_2: number | null;
  glow_3: number | null;

  allowed_domains: string[] | null;

  ms_enabled: boolean | null;
  ms_tenant_id: string | null;

  onboarding_completed: boolean | null;
};

function json(ok: boolean, status: number, body: any) {
  return new NextResponse(JSON.stringify({ ok, ...body }), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

function clamp01(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

function normalizeHex(v: any): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;

  const s = String(v).trim();
  if (!s) return null;
  return s.startsWith("#") ? s : `#${s}`;
}

function normalizeAllowedDomains(v: any): string[] | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;

  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  }

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
      }
    } catch {
      // ignore
    }
    return s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  }

  return [];
}

function normalizeUrl(v: any): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return json(false, 401, { error: "Not authenticated" });

    const host = getEffectiveHost(await headers());
    const parsed = parseTenantHost(host);
    if (!parsed.subdomain) return json(false, 400, { error: "No tenant subdomain" });

    const { data: tenant, error: tErr } = await supabase
      .from("tenants")
      .select("id, domain, subdomain, is_active, name")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (tErr) return json(false, 400, { error: tErr.message });
    if (!tenant || tenant.is_active === false) return json(false, 404, { error: "Tenant not found" });

    const { data: membership, error: mErr } = await supabase
      .from("memberships")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (mErr) return json(false, 400, { error: mErr.message });

    const role = String(membership?.role || "");
    if (role !== "owner" && role !== "admin") return json(false, 403, { error: "Forbidden" });

    let payload: Payload;
    try {
      payload = (await req.json()) as Payload;
    } catch {
      return json(false, 400, { error: "Invalid JSON body" });
    }

    const exRes = await supabase
      .from("tenant_settings")
      .select(
        [
          "tenant_id",
          "company_name",
          "support_email",
          "timezone",
          "logo_url",
          "logo_light_url",
          "logo_dark_url",
          "accent_hex",
          "accent_2_hex",
          "accent_3_hex",
          "bg_hex",
          "card_hex",
          "topbar_hex",
          "glow_1",
          "glow_2",
          "glow_3",
          "allowed_domains",
          "ms_enabled",
          "ms_tenant_id",
          "onboarding_completed",
        ].join(",")
      )
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (exRes.error) return json(false, 400, { error: exRes.error.message });

    const existing = (exRes.data as ExistingSettings | null) ?? null;

    const accent_hex = normalizeHex(payload.accent_hex);
    const accent_2_hex = normalizeHex(payload.accent_2_hex);
    const accent_3_hex = normalizeHex(payload.accent_3_hex);
    const bg_hex = normalizeHex(payload.bg_hex);
    const card_hex = normalizeHex(payload.card_hex);
    const topbar_hex = normalizeHex(payload.topbar_hex);

    const allowed_domains = normalizeAllowedDomains(payload.allowed_domains);

    // normalize urls
    const logo_url = normalizeUrl(payload.logo_url);
    const logo_light_url = normalizeUrl(payload.logo_light_url);
    const logo_dark_url = normalizeUrl(payload.logo_dark_url);

    const merged: ExistingSettings = {
      tenant_id: tenant.id,

      company_name:
        payload.company_name !== undefined ? payload.company_name : existing?.company_name ?? null,
      support_email:
        payload.support_email !== undefined ? payload.support_email : existing?.support_email ?? null,
      timezone: payload.timezone !== undefined ? payload.timezone : existing?.timezone ?? null,

      // Keep legacy logo_url in sync with light logo (preferred)
      logo_light_url:
        logo_light_url !== undefined ? logo_light_url : existing?.logo_light_url ?? null,
      logo_dark_url:
        logo_dark_url !== undefined ? logo_dark_url : existing?.logo_dark_url ?? null,

      // if explicit logo_url provided use it; else mirror light; else existing legacy
      logo_url:
        logo_url !== undefined
          ? logo_url
          : (logo_light_url !== undefined
              ? logo_light_url
              : existing?.logo_light_url ?? existing?.logo_url ?? null),

      accent_hex: accent_hex !== undefined ? accent_hex : existing?.accent_hex ?? null,
      accent_2_hex: accent_2_hex !== undefined ? accent_2_hex : existing?.accent_2_hex ?? null,
      accent_3_hex: accent_3_hex !== undefined ? accent_3_hex : existing?.accent_3_hex ?? null,

      bg_hex: bg_hex !== undefined ? bg_hex : existing?.bg_hex ?? null,
      card_hex: card_hex !== undefined ? card_hex : existing?.card_hex ?? null,
      topbar_hex: topbar_hex !== undefined ? topbar_hex : existing?.topbar_hex ?? null,

      glow_1:
        payload.glow_1 !== undefined ? clamp01(payload.glow_1) : existing?.glow_1 ?? null,
      glow_2:
        payload.glow_2 !== undefined ? clamp01(payload.glow_2) : existing?.glow_2 ?? null,
      glow_3:
        payload.glow_3 !== undefined ? clamp01(payload.glow_3) : existing?.glow_3 ?? null,

      allowed_domains:
        allowed_domains !== undefined ? allowed_domains : existing?.allowed_domains ?? null,

      ms_enabled: payload.ms_enabled !== undefined ? payload.ms_enabled : existing?.ms_enabled ?? null,
      ms_tenant_id:
        payload.ms_tenant_id !== undefined ? payload.ms_tenant_id : existing?.ms_tenant_id ?? null,

      onboarding_completed: existing?.onboarding_completed ?? null,
    };

    const up = await supabase
      .from("tenant_settings")
      .upsert(merged, { onConflict: "tenant_id" })
      .select("tenant_id")
      .single();

    if (up.error) return json(false, 400, { error: up.error.message });

    return json(true, 200, { tenant_id: up.data.tenant_id });
  } catch (e: any) {
    return json(false, 500, { error: e?.message || "Unknown error" });
  }
}
