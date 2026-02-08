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

  glow_1?: number | string | null;
  glow_2?: number | string | null;
  glow_3?: number | string | null;

  allowed_domains?: string[] | string | null;

  ms_enabled?: boolean | null;
  ms_tenant_id?: string | null;
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

function normalizeHex(v: any): string | null {
  if (v === null) return null;
  if (v === undefined) return undefined as any; // sentinel (means “not provided”)
  const s = String(v).trim();
  if (!s) return null;
  return s.startsWith("#") ? s : `#${s}`;
}

function normalizeAllowedDomains(v: any): string[] | null | undefined {
  if (v === undefined) return undefined; // not provided
  if (v === null) return null;

  if (Array.isArray(v)) {
    return v
      .map((x) => String(x).trim().toLowerCase())
      .filter(Boolean);
  }

  // if someone sent JSON-string like "[]"
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return parsed
          .map((x) => String(x).trim().toLowerCase())
          .filter(Boolean);
      }
    } catch {
      // fallback: comma-separated
    }

    return s
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
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
    if (role !== "owner" && role !== "admin") return json(false, 403, { error: "Forbidden" });

    // Body
    let payload: Payload;
    try {
      payload = (await req.json()) as Payload;
    } catch {
      return json(false, 400, { error: "Invalid JSON body" });
    }

    // Read existing settings so we MERGE instead of nuking fields to null
    const { data: existing, error: exErr } = await supabase
      .from("tenant_settings")
      .select(
        [
          "tenant_id",
          "company_name",
          "support_email",
          "timezone",
          "logo_url",
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

    if (exErr) return json(false, 400, { error: exErr.message });

    // Normalize incoming fields (undefined means “not provided”)
    const accent_hex = normalizeHex(payload.accent_hex);
    const accent_2_hex = normalizeHex(payload.accent_2_hex);
    const accent_3_hex = normalizeHex(payload.accent_3_hex);
    const bg_hex = normalizeHex(payload.bg_hex);
    const card_hex = normalizeHex(payload.card_hex);
    const topbar_hex = normalizeHex(payload.topbar_hex);

    const allowed_domains = normalizeAllowedDomains(payload.allowed_domains);

    const next = {
      tenant_id: tenant.id,

      // If the client didn't send a field (undefined), keep existing value.
      // If the client sent null, set null.
      company_name: payload.company_name !== undefined ? payload.company_name : (existing?.company_name ?? null),
      support_email: payload.support_email !== undefined ? payload.support_email : (existing?.support_email ?? null),
      timezone: payload.timezone !== undefined ? payload.timezone : (existing?.timezone ?? null),

      logo_url: payload.logo_url !== undefined ? payload.logo_url : (existing?.logo_url ?? null),

      accent_hex: accent_hex !== (undefined as any) ? accent_hex : (existing?.accent_hex ?? null),
      accent_2_hex: accent_2_hex !== (undefined as any) ? accent_2_hex : (existing?.accent_2_hex ?? null),
      accent_3_hex: accent_3_hex !== (undefined as any) ? accent_3_hex : (existing?.accent_3_hex ?? null),

      bg_hex: bg_hex !== (undefined as any) ? bg_hex : (existing?.bg_hex ?? null),
      card_hex: card_hex !== (undefined as any) ? card_hex : (existing?.card_hex ?? null),

      // if topbar not provided or empty -> we’ll set to card later
      topbar_hex: topbar_hex !== (undefined as any) ? topbar_hex : (existing?.topbar_hex ?? null),

      glow_1: payload.glow_1 !== undefined ? clamp01(payload.glow_1) : (existing?.glow_1 ?? null),
      glow_2: payload.glow_2 !== undefined ? clamp01(payload.glow_2) : (existing?.glow_2 ?? null),
      glow_3: payload.glow_3 !== undefined ? clamp01(payload.glow_3) : (existing?.glow_3 ?? null),

      allowed_domains:
        allowed_domains !== undefined ? allowed_domains : (existing?.allowed_domains ?? null),

      ms_enabled: payload.ms_enabled !== undefined ? payload.ms_enabled : (existing?.ms_enabled ?? null),
      ms_tenant_id: payload.ms_tenant_id !== undefined ? payload.ms_tenant_id : (existing?.ms_tenant_id ?? null),

      // never touch onboarding flag here
      onboarding_completed: existing?.onboarding_completed ?? false,
    };

    // Satisfy NOT NULL constraints with safe defaults
    const safeAccent = next.accent_hex ?? "#00c1ff";
    const safeAccent2 = next.accent_2_hex ?? "#ff4fe1";
    const safeAccent3 = next.accent_3_hex ?? "#ffc42d";
    const safeBg = next.bg_hex ?? "#f8fafc";
    const safeCard = next.card_hex ?? "#ffffff";
    const safeTopbar = next.topbar_hex ?? safeCard;

    const row = {
      ...next,
      accent_hex: safeAccent,
      accent_2_hex: safeAccent2,
      accent_3_hex: safeAccent3,
      bg_hex: safeBg,
      card_hex: safeCard,
      topbar_hex: safeTopbar,
      glow_1: next.glow_1 ?? 0.18,
      glow_2: next.glow_2 ?? 0.14,
      glow_3: next.glow_3 ?? 0.1,
      allowed_domains: next.allowed_domains ?? [],
    };

    const { error: upErr } = await supabase
      .from("tenant_settings")
      .upsert(row, { onConflict: "tenant_id" });

    if (upErr) return json(false, 400, { error: upErr.message });

    // return the updated settings so you can verify instantly
    const { data: after, error: afterErr } = await supabase
      .from("tenant_settings")
      .select(
        [
          "tenant_id",
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
          "onboarding_completed",
          "updated_at",
        ].join(",")
      )
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (afterErr) return json(true, 200, { saved: true });
    return json(true, 200, { saved: true, tenant_settings: after });
  } catch (e: any) {
    return json(false, 500, { error: e?.message || "Server error" });
  }
}
