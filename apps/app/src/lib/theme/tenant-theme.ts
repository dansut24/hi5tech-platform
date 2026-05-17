import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export type TenantAppearance = "light" | "dark" | "system";

export type TenantAccent =
  | "neutral"
  | "blue"
  | "violet"
  | "emerald"
  | "rose"
  | "orange"
  | "custom";

export type TenantTheme = {
  defaultAppearance: TenantAppearance;
  accentColor: TenantAccent;
  themePreset: string;
  customTheme: Record<string, any>;
};

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

const DEFAULT_THEME: TenantTheme = {
  defaultAppearance: "system",
  accentColor: "neutral",
  themePreset: "neutral",
  customTheme: {},
};

const ACCENTS: Record<string, { accent: string; accent2: string; accent3: string }> = {
  neutral: {
    accent: "37 99 235",
    accent2: "14 165 233",
    accent3: "100 116 139",
  },
  blue: {
    accent: "37 99 235",
    accent2: "14 165 233",
    accent3: "59 130 246",
  },
  violet: {
    accent: "124 58 237",
    accent2: "14 165 233",
    accent3: "217 70 239",
  },
  emerald: {
    accent: "5 150 105",
    accent2: "20 184 166",
    accent3: "16 185 129",
  },
  rose: {
    accent: "225 29 72",
    accent2: "236 72 153",
    accent3: "244 63 94",
  },
  orange: {
    accent: "234 88 12",
    accent2: "245 158 11",
    accent3: "251 146 60",
  },
};

function normaliseAppearance(value: any): TenantAppearance {
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

function normaliseAccent(value: any): TenantAccent {
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

function rgb(value: any, fallback: string) {
  if (typeof value !== "string") return fallback;

  const clean = value.trim();

  if (/^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/.test(clean)) {
    return clean;
  }

  return fallback;
}

export async function getTenantThemeFromHost(): Promise<TenantTheme> {
  try {
    const hdrs = await headers();
    const host = getEffectiveHost(hdrs);
    const parsed = parseTenantHost(host);

    if (!parsed.subdomain) {
      return DEFAULT_THEME;
    }

    const admin = supabaseAdmin();

    const { data: tenant } = await admin
      .from("tenants")
      .select("id")
      .eq("domain", parsed.rootDomain || ROOT_DOMAIN)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (!tenant?.id) {
      return DEFAULT_THEME;
    }

    const { data: settings } = await admin
      .from("tenant_settings")
      .select("default_appearance, accent_color, theme_preset, custom_theme_json")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (!settings) {
      return DEFAULT_THEME;
    }

    return {
      defaultAppearance: normaliseAppearance(settings.default_appearance),
      accentColor: normaliseAccent(settings.accent_color),
      themePreset: String(settings.theme_preset || "neutral"),
      customTheme:
        settings.custom_theme_json && typeof settings.custom_theme_json === "object"
          ? settings.custom_theme_json
          : {},
    };
  } catch {
    return DEFAULT_THEME;
  }
}

export function buildTenantThemeCss(theme: TenantTheme) {
  const accentBase = ACCENTS[theme.accentColor] ?? ACCENTS.neutral;
  const custom = theme.accentColor === "custom" ? theme.customTheme : {};

  const lightAccent = rgb(custom?.light?.accent, accentBase.accent);
  const lightAccent2 = rgb(custom?.light?.accent2, accentBase.accent2);
  const lightAccent3 = rgb(custom?.light?.accent3, accentBase.accent3);

  const darkAccent = rgb(custom?.dark?.accent, accentBase.accent);
  const darkAccent2 = rgb(custom?.dark?.accent2, accentBase.accent2);
  const darkAccent3 = rgb(custom?.dark?.accent3, accentBase.accent3);

  return `
:root {
  color-scheme: light;

  --hi5-bg: ${rgb(custom?.light?.bg, "248 250 252")};
  --hi5-fg: ${rgb(custom?.light?.fg, "15 23 42")};
  --hi5-muted: ${rgb(custom?.light?.muted, "71 85 105")};

  --hi5-card: ${rgb(custom?.light?.card, "255 255 255")};
  --hi5-card-alpha: ${custom?.light?.cardAlpha ?? "0.82"};

  --hi5-border: ${rgb(custom?.light?.border, "15 23 42")};
  --hi5-border-alpha: ${custom?.light?.borderAlpha ?? "0.10"};

  --hi5-accent: ${lightAccent};
  --hi5-accent-2: ${lightAccent2};
  --hi5-accent-3: ${lightAccent3};

  --hi5-shell-bg:
    radial-gradient(900px 500px at 10% -10%, rgba(var(--hi5-accent), 0.11), transparent 60%),
    radial-gradient(900px 500px at 90% 10%, rgba(var(--hi5-accent-2), 0.09), transparent 60%),
    rgb(var(--hi5-bg));
}

html.dark {
  color-scheme: dark;

  --hi5-bg: ${rgb(custom?.dark?.bg, "2 6 23")};
  --hi5-fg: ${rgb(custom?.dark?.fg, "248 250 252")};
  --hi5-muted: ${rgb(custom?.dark?.muted, "148 163 184")};

  --hi5-card: ${rgb(custom?.dark?.card, "15 23 42")};
  --hi5-card-alpha: ${custom?.dark?.cardAlpha ?? "0.72"};

  --hi5-border: ${rgb(custom?.dark?.border, "255 255 255")};
  --hi5-border-alpha: ${custom?.dark?.borderAlpha ?? "0.10"};

  --hi5-accent: ${darkAccent};
  --hi5-accent-2: ${darkAccent2};
  --hi5-accent-3: ${darkAccent3};

  --hi5-shell-bg:
    radial-gradient(900px 500px at 10% -10%, rgba(var(--hi5-accent), 0.16), transparent 60%),
    radial-gradient(900px 500px at 90% 10%, rgba(var(--hi5-accent-2), 0.12), transparent 60%),
    rgb(var(--hi5-bg));
}
`;
}

export function tenantThemeBootScript(defaultAppearance: TenantAppearance) {
  return `
(function () {
  try {
    var tenantDefault = ${JSON.stringify(defaultAppearance)};
    var stored = localStorage.getItem("hi5-theme");
    var chosen = stored || tenantDefault || "system";

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
