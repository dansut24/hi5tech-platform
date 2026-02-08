// apps/app/src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import SystemTheme from "@/components/theme/SystemTheme";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hi5Tech Platform",
  description: "ITSM + RMM platform",
};

type ThemeMode = "system" | "light" | "dark";

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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await supabaseServer();

  // Defaults (used when logged out)
  let theme_mode: ThemeMode = "system";

  let tenantTheme: any = null;
  let userTheme: any = null;

  // ✅ Resolve tenant from Host (so /apps gets the correct tenant theme)
  let tenantId: string | null = null;
  try {
    const h = await headers();
    const host = getEffectiveHost(h);
    const parsed = parseTenantHost(host);

    if (parsed.subdomain) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, is_active")
        .eq("domain", parsed.rootDomain)
        .eq("subdomain", parsed.subdomain)
        .maybeSingle();

      if (tenant?.id && tenant.is_active !== false) {
        tenantId = tenant.id;
      }
    }
  } catch {
    // ignore
  }

  // Safe for public routes (don’t crash when logged out)
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;

    if (user) {
      // Tenant brand tokens
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

      // User overrides
      const { data: s } = await supabase
        .from("user_settings")
        .select("theme_mode, accent_hex, bg_hex, card_hex")
        .eq("user_id", user.id)
        .maybeSingle();

      userTheme = s ?? null;
      theme_mode = (userTheme?.theme_mode ?? "system") as ThemeMode;
    }
  } catch {
    // leave defaults
  }

  // Tenant defaults → user overrides
  const accent_hex = userTheme?.accent_hex ?? tenantTheme?.accent_hex ?? "#00c1ff";
  const accent_2_hex = tenantTheme?.accent_2_hex ?? "#ff4fe1";
  const accent_3_hex = tenantTheme?.accent_3_hex ?? "#ffc42d";

  const bg_hex = userTheme?.bg_hex ?? tenantTheme?.bg_hex ?? "#f8fafc";
  const card_hex = userTheme?.card_hex ?? tenantTheme?.card_hex ?? "#ffffff";
  const topbar_hex = tenantTheme?.topbar_hex ?? card_hex;

  const glow_1 = clamp01(tenantTheme?.glow_1, theme_mode === "dark" ? 0.22 : 0.18);
  const glow_2 = clamp01(tenantTheme?.glow_2, theme_mode === "dark" ? 0.18 : 0.14);
  const glow_3 = clamp01(tenantTheme?.glow_3, theme_mode === "dark" ? 0.14 : 0.10);

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
