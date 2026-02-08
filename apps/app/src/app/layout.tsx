// apps/app/src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import SystemTheme from "@/components/theme/SystemTheme";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Hi5Tech Platform",
  description: "ITSM + RMM platform",
};

type ThemeMode = "system" | "light" | "dark";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

function normalizeHost(rawHost: string) {
  return (rawHost || "").split(":")[0].trim().toLowerCase();
}

/**
 * Resolve tenant lookup keys from host.
 * - tenant subdomain: foo.hi5tech.co.uk  -> { domain: hi5tech.co.uk, subdomain: foo }
 * - custom domain:    acme.com           -> { domain: acme.com, subdomain: null }
 * - root / non-tenant: hi5tech.co.uk or app.hi5tech.co.uk -> null
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

/** HEX (#RRGGBB or #RGB) -> "r g b" */
function hexToRgbTriplet(hex?: string | null, fallback = "0 0 0") {
  if (!hex) return fallback;

  let h = String(hex).trim();
  if (/^\d+\s+\d+\s+\d+$/.test(h)) return h;

  if (h.startsWith("#")) h = h.slice(1);
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  noStore(); // ✅ ensure the layout is never cached between requests

  const supabase = await supabaseServer();

  let theme_mode: ThemeMode = "system";
  let tenantTheme: any = null;

  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;

    // Resolve tenant from host FIRST (this fixes /apps on tenant subdomains)
    const h = await headers();
    const host = normalizeHost(h.get("host") || "");
    const tenantKey = tenantKeyFromHost(host);

    let tenantId: string | null = null;

    if (tenantKey) {
      if (tenantKey.subdomain) {
        const { data: t } = await supabase
          .from("tenants")
          .select("id")
          .eq("domain", tenantKey.domain)
          .eq("subdomain", tenantKey.subdomain)
          .maybeSingle();

        tenantId = t?.id ?? null;
      } else {
        const { data: t } = await supabase
          .from("tenants")
          .select("id")
          .eq("domain", tenantKey.domain)
          .is("subdomain", null)
          .maybeSingle();

        tenantId = t?.id ?? null;
      }
    }

    // Fallback: if we couldn't resolve tenant by host, use newest membership tenant
    if (!tenantId && user) {
      const { data: memberships } = await supabase
        .from("memberships")
        .select("tenant_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      tenantId = memberships?.[0]?.tenant_id ?? null;
    }

    // Load tenant theme (brand)
    if (tenantId) {
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
    }

    // User mode only
    if (user) {
      const { data: s } = await supabase
        .from("user_settings")
        .select("theme_mode")
        .eq("user_id", user.id)
        .maybeSingle();

      theme_mode = (s?.theme_mode ?? "system") as ThemeMode;
    }
  } catch {
    // defaults
  }

  // Tenant brand colours WIN
  const accent_hex = tenantTheme?.accent_hex ?? "#00c1ff";
  const accent_2_hex = tenantTheme?.accent_2_hex ?? "#ff4fe1";
  const accent_3_hex = tenantTheme?.accent_3_hex ?? "#ffc42d";

  const bg_hex = tenantTheme?.bg_hex ?? "#f8fafc";
  const card_hex = tenantTheme?.card_hex ?? "#ffffff";
  const topbar_hex = tenantTheme?.topbar_hex ?? card_hex;

  const glow_1 = clamp01(tenantTheme?.glow_1, theme_mode === "dark" ? 0.22 : 0.18);
  const glow_2 = clamp01(tenantTheme?.glow_2, theme_mode === "dark" ? 0.18 : 0.14);
  const glow_3 = clamp01(tenantTheme?.glow_3, theme_mode === "dark" ? 0.14 : 0.1);

  const htmlClass = theme_mode === "dark" ? "dark" : "";

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
    <html lang="en" suppressHydrationWarning className={htmlClass}>
      <body>
        <style dangerouslySetInnerHTML={{ __html: cssVars }} />
        {theme_mode === "system" ? <SystemTheme /> : null}
        {children}
      </body>
    </html>
  );
}
