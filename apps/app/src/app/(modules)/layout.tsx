import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

/** HEX (#RRGGBB or #RGB) -> "r g b" */
function hexToRgbTriplet(hex?: string | null, fallback = "0 0 0") {
  if (!hex) return fallback;

  let h = String(hex).trim();

  // Already looks like "r g b"
  if (/^\d+\s+\d+\s+\d+$/.test(h)) return h;

  // Strip leading #
  if (h.startsWith("#")) h = h.slice(1);

  // Expand #RGB -> #RRGGBB
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");

  if (!/^[0-9a-fA-F]{6}$/.test(h)) return fallback;

  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);

  return `${r} ${g} ${b}`;
}

function clamp01(n: any, fallback: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(1, v));
}

function normalizeHost(rawHost: string) {
  return (rawHost || "").split(":")[0].trim().toLowerCase();
}

/**
 * Resolve tenant lookup keys from host.
 * - tenant subdomain: dan-sutton.hi5tech.co.uk  -> { domain: hi5tech.co.uk, subdomain: dan-sutton }
 * - custom domain:    acme.com                  -> { domain: acme.com, subdomain: null }
 * - root / non-tenant: hi5tech.co.uk or app.hi5tech.co.uk -> null (we don't gate here)
 */
function tenantKeyFromHost(host: string): { domain: string; subdomain: string | null } | null {
  const h = normalizeHost(host);

  // local / previews
  if (!h) return null;
  if (h === "localhost" || h.endsWith(".vercel.app")) return null;

  // Under our root domain => expect subdomain tenants
  if (h.endsWith(ROOT_DOMAIN)) {
    if (h === ROOT_DOMAIN) return null;

    const sub = h.slice(0, -ROOT_DOMAIN.length - 1); // remove ".hi5tech.co.uk"
    if (!sub) return null;

    // allow these to behave as non-tenant (adjust if you want)
    if (sub === "www" || sub === "app") return null;

    return { domain: ROOT_DOMAIN, subdomain: sub };
  }

  // Not under root domain => treat as custom domain tenant
  return { domain: h, subdomain: null };
}

export default async function ModulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();

  // Auth guard
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  // Determine which tenant this request is for (from Host header)
  const h = await headers();
  const host = normalizeHost(h.get("host") || "");
  const tenantKey = tenantKeyFromHost(host);

  // If we can't resolve a tenant key, you can decide what to do.
  // For safety: send logged-in users to /apps (or /login).
  if (!tenantKey) {
    redirect("/apps");
  }

  // Load the tenant row that matches the current host
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, name")
    .eq("domain", tenantKey.domain)
    // when subdomain is null (custom domain), require DB to also have null
    .is("subdomain", tenantKey.subdomain === null ? null : undefined)
    // when subdomain is set, match it
    .eq(tenantKey.subdomain ? "subdomain" : "domain", tenantKey.subdomain ? tenantKey.subdomain : tenantKey.domain)
    .maybeSingle();

  // The above .eq logic can be a bit awkward with conditional columns.
  // So if tenantKey.subdomain is NOT null, re-query cleanly:
  let resolvedTenant = tenant ?? null;
  if (!resolvedTenant && tenantKey.subdomain) {
    const { data: t2 } = await supabase
      .from("tenants")
      .select("id, domain, subdomain, name")
      .eq("domain", tenantKey.domain)
      .eq("subdomain", tenantKey.subdomain)
      .maybeSingle();
    resolvedTenant = t2 ?? null;
  }
  // If custom domain, ensure subdomain null:
  if (!resolvedTenant && tenantKey.subdomain === null) {
    const { data: t3 } = await supabase
      .from("tenants")
      .select("id, domain, subdomain, name")
      .eq("domain", tenantKey.domain)
      .is("subdomain", null)
      .maybeSingle();
    resolvedTenant = t3 ?? null;
  }

  // If tenant doesn't exist, your middleware should already rewrite to /tenant-available.
  // But fail-safe:
  if (!resolvedTenant) {
    redirect(`/tenant-available?requested=${encodeURIComponent(tenantKey.subdomain ?? tenantKey.domain)}`);
  }

  const tenantId = resolvedTenant.id;

  // Load memberships for THIS tenant only
  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, tenant_id, created_at")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  // If user is not a member of this tenant -> block access
  const activeMembershipId = memberships?.[0]?.id ?? null;
  if (!activeMembershipId) {
    redirect(`/login?error=tenant_access`);
  }

  // Load module assignments for this membership only
  const { data: mods } = await supabase
    .from("module_assignments")
    .select("module")
    .eq("membership_id", activeMembershipId);

  const allowedModules = Array.from(new Set((mods ?? []).map((m) => m.module))) as ModuleKey[];

  // Resolve tenant label
  const tenantLabel =
    resolvedTenant.subdomain && resolvedTenant.domain
      ? `${resolvedTenant.subdomain}.${resolvedTenant.domain}`
      : resolvedTenant.domain || resolvedTenant.name || null;

  // -------------------------------
  // Tenant theme tokens (brand)
  // -------------------------------
  let tenantTheme: any = null;

  try {
    const { data } = await supabase
      .from("tenant_settings")
      .select(
        [
          "accent_hex",
          "accent_2_hex",
          "accent_3_hex",
          "bg_hex",
          "card_hex",
          "topbar_hex",
          "glow_1",
          "glow_2",
          "glow_3",
        ].join(",")
      )
      .eq("tenant_id", tenantId)
      .maybeSingle();

    tenantTheme = data ?? null;
  } catch {
    tenantTheme = null;
  }

  // -------------------------------
  // User theme settings (overrides)
  // -------------------------------
  const { data: s } = await supabase
    .from("user_settings")
    .select("theme_mode, accent_hex, bg_hex, card_hex")
    .eq("user_id", user.id)
    .maybeSingle();

  const theme_mode = (s?.theme_mode ?? "system") as "system" | "light" | "dark";
  const forceDarkClass = theme_mode === "dark" ? "dark" : "";

  // Tenant defaults → then user overrides
  const accent_hex = s?.accent_hex ?? tenantTheme?.accent_hex ?? "#00c1ff";
  const accent_2_hex = tenantTheme?.accent_2_hex ?? "#ff4fe1";
  const accent_3_hex = tenantTheme?.accent_3_hex ?? "#ffc42d";

  const bg_hex = s?.bg_hex ?? tenantTheme?.bg_hex ?? "#f8fafc";
  const card_hex = s?.card_hex ?? tenantTheme?.card_hex ?? "#ffffff";
  const topbar_hex = tenantTheme?.topbar_hex ?? card_hex;

  // Glow knobs (defaults match globals.css)
  const glow_1 = clamp01(tenantTheme?.glow_1, forceDarkClass ? 0.22 : 0.18);
  const glow_2 = clamp01(tenantTheme?.glow_2, forceDarkClass ? 0.18 : 0.14);
  const glow_3 = clamp01(tenantTheme?.glow_3, forceDarkClass ? 0.14 : 0.10);

  const cssVars = `
:root{
  --hi5-accent: ${hexToRgbTriplet(accent_hex, "0 193 255")};
  --hi5-accent-2: ${hexToRgbTriplet(accent_2_hex, "255 79 225")};
  --hi5-accent-3: ${hexToRgbTriplet(accent_3_hex, "255 196 45")};

  --hi5-bg: ${hexToRgbTriplet(bg_hex, "248 250 252")};
  --hi5-card: ${hexToRgbTriplet(card_hex, "255 255 255")};
  --hi5-topbar: ${hexToRgbTriplet(topbar_hex, hexToRgbTriplet(card_hex, "255 255 255"))};

  --hi5-glow-1: ${glow_1};
  --hi5-glow-2: ${glow_2};
  --hi5-glow-3: ${glow_3};
}
`;

  return (
    <div className={forceDarkClass}>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <div className="hi5-bg min-h-dvh">
        {/* allowedModules + tenantLabel are ready to pass into a module shell later */}
        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}
