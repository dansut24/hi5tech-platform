// apps/app/src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import SystemTheme from "@/components/theme/SystemTheme";
import { ToastProvider } from "@/components/ui/toast";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Hi5Tech Platform",
  description: "ITSM + RMM platform",
};

type ThemeMode = "system" | "light" | "dark";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

type ThemePreset =
  | "neutral"
  | "blue"
  | "violet"
  | "emerald"
  | "rose"
  | "orange"
  | "custom";

type CustomThemeJson = {
  light?: Record<string, any>;
  dark?: Record<string, any>;
};

/** HEX (#RRGGBB or #RGB) -> "r g b" */
function hexToRgbTriplet(hex?: string | null, fallback = "0 0 0") {
  if (!hex) return fallback;

  let h = String(hex).trim();

  // Already looks like "r g b"
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

function normalizeHost(rawHost: string) {
  return (rawHost || "").split(":")[0].trim().toLowerCase();
}

/**
 * Resolve tenant lookup keys from host.
 * - tenant subdomain: dansworld.hi5tech.co.uk  -> { domain: hi5tech.co.uk, subdomain: dansworld }
 * - custom domain:    acme.com                 -> { domain: acme.com, subdomain: null }
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

  // Not under root domain => custom domain tenant
  return { domain: h, subdomain: null };
}

function normalizeThemeMode(value: any): ThemeMode {
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

function normalizePreset(value: any): ThemePreset {
  if (
    value === "neutral" ||
    value === "blue" ||
    value === "violet" ||
    value === "emerald" ||
    value === "rose" ||
    value === "orange" ||
    value === "custom"
  ) {
    return value;
  }

  return "neutral";
}

const ACCENT_PRESETS: Record<
  Exclude<ThemePreset, "custom">,
  {
    accent: string;
    accent2: string;
    accent3: string;
    lightGlow1: number;
    lightGlow2: number;
    lightGlow3: number;
    darkGlow1: number;
    darkGlow2: number;
    darkGlow3: number;
  }
> = {
  neutral: {
    accent: "#2563eb",
    accent2: "#0ea5e9",
    accent3: "#64748b",
    lightGlow1: 0.1,
    lightGlow2: 0.08,
    lightGlow3: 0.06,
    darkGlow1: 0.16,
    darkGlow2: 0.12,
    darkGlow3: 0.08,
  },
  blue: {
    accent: "#2563eb",
    accent2: "#06b6d4",
    accent3: "#60a5fa",
    lightGlow1: 0.13,
    lightGlow2: 0.1,
    lightGlow3: 0.08,
    darkGlow1: 0.2,
    darkGlow2: 0.15,
    darkGlow3: 0.1,
  },
  violet: {
    accent: "#7c3aed",
    accent2: "#0ea5e9",
    accent3: "#d946ef",
    lightGlow1: 0.14,
    lightGlow2: 0.1,
    lightGlow3: 0.08,
    darkGlow1: 0.22,
    darkGlow2: 0.16,
    darkGlow3: 0.12,
  },
  emerald: {
    accent: "#059669",
    accent2: "#14b8a6",
    accent3: "#10b981",
    lightGlow1: 0.12,
    lightGlow2: 0.09,
    lightGlow3: 0.07,
    darkGlow1: 0.18,
    darkGlow2: 0.14,
    darkGlow3: 0.1,
  },
  rose: {
    accent: "#e11d48",
    accent2: "#ec4899",
    accent3: "#fb7185",
    lightGlow1: 0.13,
    lightGlow2: 0.1,
    lightGlow3: 0.08,
    darkGlow1: 0.2,
    darkGlow2: 0.16,
    darkGlow3: 0.11,
  },
  orange: {
    accent: "#ea580c",
    accent2: "#f59e0b",
    accent3: "#fb923c",
    lightGlow1: 0.13,
    lightGlow2: 0.1,
    lightGlow3: 0.08,
    darkGlow1: 0.2,
    darkGlow2: 0.15,
    darkGlow3: 0.1,
  },
};

function customRgb(custom: CustomThemeJson, mode: "light" | "dark", key: string, fallback: string) {
  const value = custom?.[mode]?.[key];

  if (typeof value !== "string") return fallback;

  // Accept "r g b"
  if (/^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/.test(value.trim())) {
    return value.trim();
  }

  // Accept hex
  return hexToRgbTriplet(value, fallback);
}

function customAlpha(custom: CustomThemeJson, mode: "light" | "dark", key: string, fallback: number) {
  return clamp01(custom?.[mode]?.[key], fallback);
}

function buildThemeCss({
  themeMode,
  accentColor,
  themePreset,
  customTheme,
  legacyTheme,
}: {
  themeMode: ThemeMode;
  accentColor: ThemePreset;
  themePreset: string;
  customTheme: CustomThemeJson;
  legacyTheme: any;
}) {
  const preset = accentColor === "custom" ? "neutral" : accentColor;
  const presetValues = ACCENT_PRESETS[preset] ?? ACCENT_PRESETS.neutral;

  const isCustom = accentColor === "custom";
  const custom = isCustom ? customTheme : {};

  /*
    New preferred setup:
    - Light default: white / grey / light blue
    - Dark default: black / grey / dark blue

    Legacy compatibility:
    Existing branding fields like accent_hex still work, but only if present.
  */
  const legacyAccent = legacyTheme?.accent_hex;
  const legacyAccent2 = legacyTheme?.accent_2_hex;
  const legacyAccent3 = legacyTheme?.accent_3_hex;

  const lightAccent = customRgb(
    custom,
    "light",
    "accent",
    hexToRgbTriplet(legacyAccent, hexToRgbTriplet(presetValues.accent, "37 99 235"))
  );
  const lightAccent2 = customRgb(
    custom,
    "light",
    "accent2",
    hexToRgbTriplet(legacyAccent2, hexToRgbTriplet(presetValues.accent2, "14 165 233"))
  );
  const lightAccent3 = customRgb(
    custom,
    "light",
    "accent3",
    hexToRgbTriplet(legacyAccent3, hexToRgbTriplet(presetValues.accent3, "100 116 139"))
  );

  const darkAccent = customRgb(
    custom,
    "dark",
    "accent",
    hexToRgbTriplet(legacyAccent, hexToRgbTriplet(presetValues.accent, "37 99 235"))
  );
  const darkAccent2 = customRgb(
    custom,
    "dark",
    "accent2",
    hexToRgbTriplet(legacyAccent2, "30 64 175")
  );
  const darkAccent3 = customRgb(
    custom,
    "dark",
    "accent3",
    hexToRgbTriplet(legacyAccent3, "51 65 85")
  );

  const lightBg = customRgb(custom, "light", "bg", hexToRgbTriplet(legacyTheme?.bg_hex, "248 250 252"));
  const lightFg = customRgb(custom, "light", "fg", "15 23 42");
  const lightMuted = customRgb(custom, "light", "muted", "71 85 105");
  const lightCard = customRgb(custom, "light", "card", hexToRgbTriplet(legacyTheme?.card_hex, "255 255 255"));
  const lightTopbar = customRgb(custom, "light", "topbar", hexToRgbTriplet(legacyTheme?.topbar_hex, "255 255 255"));

  const darkBg = customRgb(custom, "dark", "bg", "2 6 23");
  const darkFg = customRgb(custom, "dark", "fg", "248 250 252");
  const darkMuted = customRgb(custom, "dark", "muted", "148 163 184");
  const darkCard = customRgb(custom, "dark", "card", "15 23 42");
  const darkTopbar = customRgb(custom, "dark", "topbar", "15 23 42");

  const lightGlow1 = clamp01(
    legacyTheme?.glow_1,
    customAlpha(custom, "light", "glow1", presetValues.lightGlow1)
  );
  const lightGlow2 = clamp01(
    legacyTheme?.glow_2,
    customAlpha(custom, "light", "glow2", presetValues.lightGlow2)
  );
  const lightGlow3 = clamp01(
    legacyTheme?.glow_3,
    customAlpha(custom, "light", "glow3", presetValues.lightGlow3)
  );

  const darkGlow1 = customAlpha(custom, "dark", "glow1", presetValues.darkGlow1);
  const darkGlow2 = customAlpha(custom, "dark", "glow2", presetValues.darkGlow2);
  const darkGlow3 = customAlpha(custom, "dark", "glow3", presetValues.darkGlow3);

  return `
:root{
  color-scheme: light;

  --hi5-bg: ${lightBg};
  --hi5-fg: ${lightFg};
  --hi5-muted: ${lightMuted};

  --hi5-card: ${lightCard};
  --hi5-card-alpha: ${customAlpha(custom, "light", "cardAlpha", 0.84)};
  --hi5-panel-alpha: ${customAlpha(custom, "light", "panelAlpha", 0.9)};
  --hi5-topbar: ${lightTopbar};

  --hi5-border: 15 23 42;
  --hi5-border-alpha: 0.10;
  --hi5-divider-alpha: 0.09;

  --hi5-accent: ${lightAccent};
  --hi5-accent-2: ${lightAccent2};
  --hi5-accent-3: ${lightAccent3};

  --hi5-glow-1: ${lightGlow1};
  --hi5-glow-2: ${lightGlow2};
  --hi5-glow-3: ${lightGlow3};

  --hi5-scrim-light: 255 255 255;
  --hi5-scrim-alpha: 0.58;

  --hi5-shadow-strong: 0 18px 55px rgb(15 23 42 / 0.10);
  --hi5-shadow-soft: 0 10px 24px rgb(15 23 42 / 0.07);

  --hi5-backdrop-base: linear-gradient(180deg, rgb(var(--hi5-bg) / 1), rgb(241 245 249 / 1));

  --hi5-sphere-1:
    radial-gradient(circle at 32% 28%,
      rgb(var(--hi5-accent) / var(--hi5-glow-1)) 0%,
      rgb(var(--hi5-accent) / calc(var(--hi5-glow-1) * 0.42)) 28%,
      transparent 62%);
  --hi5-sphere-2:
    radial-gradient(circle at 68% 32%,
      rgb(var(--hi5-accent-2) / var(--hi5-glow-2)) 0%,
      rgb(var(--hi5-accent-2) / calc(var(--hi5-glow-2) * 0.38)) 30%,
      transparent 64%);
  --hi5-sphere-3:
    radial-gradient(circle at 40% 72%,
      rgb(var(--hi5-accent-3) / var(--hi5-glow-3)) 0%,
      rgb(var(--hi5-accent-3) / calc(var(--hi5-glow-3) * 0.35)) 32%,
      transparent 66%);

  --hi5-wash:
    radial-gradient(900px 520px at 18% 10%,
      rgb(var(--hi5-accent) / calc(var(--hi5-glow-1) * 0.8)),
      transparent 60%),
    radial-gradient(900px 520px at 86% 18%,
      rgb(var(--hi5-accent-2) / calc(var(--hi5-glow-2) * 0.75)),
      transparent 62%),
    radial-gradient(900px 600px at 50% 100%,
      rgb(var(--hi5-accent-3) / calc(var(--hi5-glow-3) * 0.7)),
      transparent 64%);

  --hi5-spheres-opacity: 1;
  --hi5-spheres-blur: 72px;

  --hi5-btn-grad: linear-gradient(90deg,
    rgb(var(--hi5-accent) / 1),
    rgb(var(--hi5-accent-2) / 1)
  );
  --hi5-btn-grad-2: linear-gradient(90deg,
    rgb(var(--hi5-accent-3) / 1),
    rgb(var(--hi5-accent-2) / 1)
  );

  --hi5-btn-solid: 0;
  --hi5-grain-opacity: 0.035;
}

.dark {
  color-scheme: dark;

  --hi5-bg: ${darkBg};
  --hi5-fg: ${darkFg};
  --hi5-muted: ${darkMuted};

  --hi5-card: ${darkCard};
  --hi5-card-alpha: ${customAlpha(custom, "dark", "cardAlpha", 0.42)};
  --hi5-panel-alpha: ${customAlpha(custom, "dark", "panelAlpha", 0.52)};
  --hi5-topbar: ${darkTopbar};

  --hi5-border: 255 255 255;
  --hi5-border-alpha: 0.13;
  --hi5-divider-alpha: 0.11;

  --hi5-accent: ${darkAccent};
  --hi5-accent-2: ${darkAccent2};
  --hi5-accent-3: ${darkAccent3};

  --hi5-glow-1: ${darkGlow1};
  --hi5-glow-2: ${darkGlow2};
  --hi5-glow-3: ${darkGlow3};

  --hi5-scrim-light: 2 6 23;
  --hi5-scrim-alpha: 0.46;

  --hi5-shadow-strong: 0 26px 80px rgb(0 0 0 / 0.70);
  --hi5-shadow-soft: 0 16px 40px rgb(0 0 0 / 0.55);

  --hi5-backdrop-base: linear-gradient(180deg, rgb(var(--hi5-bg) / 1), rgb(0 0 0 / 1));

  --hi5-sphere-1:
    radial-gradient(circle at 32% 28%,
      rgb(var(--hi5-accent) / var(--hi5-glow-1)) 0%,
      rgb(var(--hi5-accent) / calc(var(--hi5-glow-1) * 0.42)) 28%,
      transparent 62%);
  --hi5-sphere-2:
    radial-gradient(circle at 68% 32%,
      rgb(var(--hi5-accent-2) / var(--hi5-glow-2)) 0%,
      rgb(var(--hi5-accent-2) / calc(var(--hi5-glow-2) * 0.38)) 30%,
      transparent 64%);
  --hi5-sphere-3:
    radial-gradient(circle at 40% 72%,
      rgb(var(--hi5-accent-3) / var(--hi5-glow-3)) 0%,
      rgb(var(--hi5-accent-3) / calc(var(--hi5-glow-3) * 0.35)) 32%,
      transparent 66%);

  --hi5-wash:
    radial-gradient(980px 620px at 18% 10%,
      rgb(var(--hi5-accent) / calc(var(--hi5-glow-1) * 0.9)),
      transparent 60%),
    radial-gradient(980px 620px at 86% 18%,
      rgb(var(--hi5-accent-2) / calc(var(--hi5-glow-2) * 0.85)),
      transparent 62%),
    radial-gradient(980px 680px at 52% 96%,
      rgb(var(--hi5-accent-3) / calc(var(--hi5-glow-3) * 0.75)),
      transparent 64%);

  --hi5-spheres-opacity: 1;
  --hi5-spheres-blur: 76px;
  --hi5-grain-opacity: 0.08;
}

html[data-theme-preference="${themeMode}"] {
  --hi5-theme-loaded: 1;
}
`;
}

function themeBootScript(mode: ThemeMode) {
  return `
(function () {
  try {
    var serverDefault = ${JSON.stringify(mode)};
    var stored = localStorage.getItem("hi5-theme");
    var chosen = stored || serverDefault || "system";

    var prefersDark = false;
    try {
      prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch (_) {}

    var useDark = chosen === "dark" || (chosen === "system" && prefersDark);

    document.documentElement.classList.toggle("dark", useDark);
    document.documentElement.dataset.theme = useDark ? "dark" : "light";
    document.documentElement.dataset.themePreference = chosen;
  } catch (_) {}
})();
`;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await supabaseServer();

  // ---------------------------------------------------------
  // 1) Resolve current tenant based on Host header
  // ---------------------------------------------------------
  const h = await headers();
  const host = normalizeHost(h.get("host") || "");
  const tenantKey = tenantKeyFromHost(host);

  let tenantId: string | null = null;
  let tenantTheme: any = null;

  // Load tenant + tenant_settings based on host (works even when logged out)
  if (tenantKey) {
    try {
      if (tenantKey.subdomain) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("id")
          .eq("domain", tenantKey.domain)
          .eq("subdomain", tenantKey.subdomain)
          .maybeSingle();

        tenantId = tenant?.id ?? null;
      } else {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("id")
          .eq("domain", tenantKey.domain)
          .is("subdomain", null)
          .maybeSingle();

        tenantId = tenant?.id ?? null;
      }

      if (tenantId) {
        const { data } = await supabase
          .from("tenant_settings")
          .select(
            [
              // New setup theme fields
              "default_appearance",
              "accent_color",
              "theme_preset",
              "custom_theme_json",

              // Existing/legacy branding fields - keep compatible
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
    } catch {
      tenantId = null;
      tenantTheme = null;
    }
  }

  // ---------------------------------------------------------
  // 2) Resolve appearance/mode
  // Tenant default wins initially, user setting can override after login.
  // ---------------------------------------------------------
  let theme_mode: ThemeMode = normalizeThemeMode(tenantTheme?.default_appearance);

  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;

    if (user) {
      const { data: s } = await supabase
        .from("user_settings")
        .select("theme_mode")
        .eq("user_id", user.id)
        .maybeSingle();

      if (s?.theme_mode) {
        theme_mode = normalizeThemeMode(s.theme_mode);
      }
    }
  } catch {
    // keep default
  }

  // ---------------------------------------------------------
  // 3) Compute theme tokens
  // ---------------------------------------------------------
  const accentColor = normalizePreset(tenantTheme?.accent_color);
  const themePreset = String(tenantTheme?.theme_preset || accentColor || "neutral");
  const customTheme =
    tenantTheme?.custom_theme_json && typeof tenantTheme.custom_theme_json === "object"
      ? (tenantTheme.custom_theme_json as CustomThemeJson)
      : {};

  const cssVars = buildThemeCss({
    themeMode: theme_mode,
    accentColor,
    themePreset,
    customTheme,
    legacyTheme: tenantTheme,
  });

  // Initial server class avoids flash for explicit light/dark.
  // For system, boot script will apply based on device preference.
  const htmlClass = theme_mode === "dark" ? "dark" : "";

  return (
    <html lang="en" suppressHydrationWarning className={htmlClass} data-theme-preference={theme_mode}>
      <head>
        <style id="hi5-tenant-theme" dangerouslySetInnerHTML={{ __html: cssVars }} />
        <script id="hi5-theme-boot" dangerouslySetInnerHTML={{ __html: themeBootScript(theme_mode) }} />
      </head>
      <body suppressHydrationWarning>
        {theme_mode === "system" ? <SystemTheme /> : null}
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
