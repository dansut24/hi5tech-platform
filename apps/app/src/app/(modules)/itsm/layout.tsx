import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ItsmShell from "./_components/ItsmShell";

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

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

export default async function ItsmLayout({ children }: { children: ReactNode }) {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  // Active tenant: newest membership for now
  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, tenant_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  let tenantLabel: string | null = null;
  const tenantId = memberships?.[0]?.tenant_id;

  if (tenantId) {
    const { data: t } = await supabase
      .from("tenants")
      .select("domain, subdomain, name")
      .eq("id", tenantId)
      .maybeSingle();

    if (t) {
      const host =
        t.subdomain && t.domain ? `${t.subdomain}.${t.domain}` : t.domain;
      tenantLabel = host || t.name || null;
    }
  }

  // Allowed modules (for future header switcher)
  const { data: mods } = await supabase
    .from("module_assignments")
    .select("module")
    .in("membership_id", memberships?.map((m) => m.id) ?? []);

  const allowedModules = Array.from(
    new Set((mods ?? []).map((m) => m.module))
  ) as ModuleKey[];

  // -------------------------------
  // Tenant theme tokens (brand)
  // -------------------------------
  let tenantTheme: any = null;

  if (tenantId) {
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
    <div className={`hi5-bg min-h-dvh ${forceDarkClass}`}>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />

      {/* We’ll pass these later when you wire the module switcher back in */}
      <ItsmShell>{children}</ItsmShell>
    </div>
  );
}
