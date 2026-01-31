// apps/app/src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Hi5Tech Platform",
  description: "ITSM + RMM platform",
};

type ThemeMode = "system" | "light" | "dark";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await supabaseServer();

  // Defaults (used when logged out)
  let theme_mode: ThemeMode = "system";
  let tenantId: string | null = null;

  let tenantTheme: any = null;
  let userTheme: any = null;

  // Try to load user + tenant + theme tokens (safe for public routes)
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;

    if (user) {
      // Active tenant (newest membership)
      const { data: memberships } = await supabase
        .from("memberships")
        .select("tenant_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      tenantId = memberships?.[0]?.tenant_id ?? null;

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

  // Apply: tenant defaults → user overrides
  const accent_hex =
    userTheme?.accent_hex ?? tenantTheme?.accent_hex ?? "#00c1ff";
  const accent_2_hex = tenantTheme?.accent_2_hex ?? "#ff4fe1";
  const accent_3_hex = tenantTheme?.accent_3_hex ?? "#ffc42d";

  const bg_hex = userTheme?.bg_hex ?? tenantTheme?.bg_hex ?? "#f8fafc";
  const card_hex = userTheme?.card_hex ?? tenantTheme?.card_hex ?? "#ffffff";
  const topbar_hex = tenantTheme?.topbar_hex ?? card_hex;

  const glow_1 = clamp01(
    tenantTheme?.glow_1,
    theme_mode === "dark" ? 0.22 : 0.18
  );
  const glow_2 = clamp01(
    tenantTheme?.glow_2,
    theme_mode === "dark" ? 0.18 : 0.14
  );
  const glow_3 = clamp01(
    tenantTheme?.glow_3,
    theme_mode === "dark" ? 0.14 : 0.10
  );

  // Force class-based dark only when user explicitly picks dark
  const htmlClass = theme_mode === "dark" ? "dark" : "";

  const cssVars = `
:root{
  --hi5-accent: ${hexToRgbTriplet(accent_hex, "0 193 255")};
  --hi5-accent-2: ${hexToRgbTriplet(accent_2_hex, "255 79 225")};
  --hi5-accent-3: ${hexToRgbTriplet(accent_3_hex, "255 196 45")};

  --hi5-bg: ${hexToRgbTriplet(bg_hex, "248 250 252")};
  --hi5-card: ${hexToRgbTriplet(card_hex, "255 255 255")};
  --hi5-topbar: ${hexToRgbTriplet(
    topbar_hex,
    hexToRgbTriplet(card_hex, "255 255 255")
  )};

  --hi5-glow-1: ${glow_1};
  --hi5-glow-2: ${glow_2};
  --hi5-glow-3: ${glow_3};
}
`;

  return (
    <html lang="en" suppressHydrationWarning className={htmlClass}>
      {/* IMPORTANT: put the background class on BODY so it cannot be hidden */}
      <body className="hi5-bg">
        <style dangerouslySetInnerHTML={{ __html: cssVars }} />
        {children}
      </body>
    </html>
  );
}
