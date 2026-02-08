// apps/app/src/app/api/debug/theme/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

function normalizeHost(rawHost: string) {
  return (rawHost || "").split(":")[0].trim().toLowerCase();
}

/**
 * Resolve tenant lookup keys from host.
 * - tenant subdomain: foo.hi5tech.co.uk  -> { domain: hi5tech.co.uk, subdomain: foo }
 * - custom domain:    acme.com           -> { domain: acme.com, subdomain: null }
 * - root/non-tenant:  hi5tech.co.uk or app.hi5tech.co.uk -> null
 */
function tenantKeyFromHost(host: string): { domain: string; subdomain: string | null } | null {
  const h = normalizeHost(host);
  if (!h) return null;
  if (h === "localhost" || h.endsWith(".vercel.app")) return null;

  if (h.endsWith(ROOT_DOMAIN)) {
    if (h === ROOT_DOMAIN) return null;

    const sub = h.slice(0, -ROOT_DOMAIN.length - 1);
    if (!sub) return null;
    if (sub === "www" || sub === "app") return null;

    return { domain: ROOT_DOMAIN, subdomain: sub };
  }

  return { domain: h, subdomain: null };
}

export async function GET() {
  const supabase = await supabaseServer();

  const h = await headers();
  const hostHeader = h.get("host") || "";
  const host = normalizeHost(hostHeader);
  const tenantKey = tenantKeyFromHost(host);

  // auth
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  const user = userRes?.user ?? null;

  // tenant resolve
  let tenantId: string | null = null;
  let tenantRow: any = null;
  let tenantErr: any = null;

  if (tenantKey) {
    if (tenantKey.subdomain) {
      const r = await supabase
        .from("tenants")
        .select("id,name,domain,subdomain,is_active")
        .eq("domain", tenantKey.domain)
        .eq("subdomain", tenantKey.subdomain)
        .maybeSingle();

      tenantRow = r.data ?? null;
      tenantErr = r.error ?? null;
      tenantId = tenantRow?.id ?? null;
    } else {
      const r = await supabase
        .from("tenants")
        .select("id,name,domain,subdomain,is_active")
        .eq("domain", tenantKey.domain)
        .is("subdomain", null)
        .maybeSingle();

      tenantRow = r.data ?? null;
      tenantErr = r.error ?? null;
      tenantId = tenantRow?.id ?? null;
    }
  }

  // tenant settings
  const settingsRes = tenantId
    ? await supabase
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
            "onboarding_completed",
          ].join(",")
        )
        .eq("tenant_id", tenantId)
        .maybeSingle()
    : null;

  // user settings
  const userSettingsRes = user
    ? await supabase
        .from("user_settings")
        .select("user_id, theme_mode, accent_hex, bg_hex, card_hex")
        .eq("user_id", user.id)
        .maybeSingle()
    : null;

  // useful vercel build info (matches what you used earlier)
  const vercel = {
    env: process.env.VERCEL_ENV || null,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    gitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
    gitMsg: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
    url: process.env.VERCEL_URL || null,
  };

  return NextResponse.json(
    {
      ok: true,
      request: {
        hostHeader,
        normalizedHost: host,
        tenantKey,
      },
      auth: {
        user: user ? { id: user.id, email: user.email } : null,
        error: userErr ? { message: userErr.message } : null,
      },
      tenant: {
        tenantId,
        tenantRow,
        tenantErr: tenantErr ? { message: tenantErr.message, details: tenantErr.details, hint: tenantErr.hint } : null,
      },
      tenant_settings: settingsRes
        ? {
            data: settingsRes.data ?? null,
            error: settingsRes.error
              ? { message: settingsRes.error.message, details: settingsRes.error.details, hint: settingsRes.error.hint }
              : null,
          }
        : null,
      user_settings: userSettingsRes
        ? {
            data: userSettingsRes.data ?? null,
            error: userSettingsRes.error
              ? { message: userSettingsRes.error.message, details: userSettingsRes.error.details, hint: userSettingsRes.error.hint }
              : null,
          }
        : null,
      vercel,
    },
    { status: 200 }
  );
}
