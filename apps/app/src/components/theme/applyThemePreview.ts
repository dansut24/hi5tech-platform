// apps/app/src/components/theme/applyThemePreview.ts
export type ThemePreviewVars = {
  accent_hex?: string;
  accent_2_hex?: string;
  accent_3_hex?: string;

  bg_hex?: string;
  card_hex?: string;
  topbar_hex?: string;

  glow_1?: number;
  glow_2?: number;
  glow_3?: number;

  btn_solid?: 0 | 1; // 0 = gradient, 1 = solid
};

function hexToRgbTriplet(hex?: string, fallback = "0 0 0") {
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

const STYLE_ID = "hi5-preview-style";

export function applyThemePreview(vars: ThemePreviewVars) {
  if (typeof document === "undefined") return;

  const accent = vars.accent_hex ?? "#00c1ff";
  const accent2 = vars.accent_2_hex ?? "#ff4fe1";
  const accent3 = vars.accent_3_hex ?? "#ffc42d";

  const bg = vars.bg_hex ?? "#f8fafc";
  const card = vars.card_hex ?? "#ffffff";
  const topbar = vars.topbar_hex ?? card;

  const glow1 = clamp01(vars.glow_1, 0.18);
  const glow2 = clamp01(vars.glow_2, 0.14);
  const glow3 = clamp01(vars.glow_3, 0.10);

  const btnSolid = vars.btn_solid ?? 0;

  const css = `
:root{
  --hi5-accent: ${hexToRgbTriplet(accent, "0 193 255")};
  --hi5-accent-2: ${hexToRgbTriplet(accent2, "255 79 225")};
  --hi5-accent-3: ${hexToRgbTriplet(accent3, "255 196 45")};

  --hi5-bg: ${hexToRgbTriplet(bg, "248 250 252")};
  --hi5-card: ${hexToRgbTriplet(card, "255 255 255")};
  --hi5-topbar: ${hexToRgbTriplet(topbar, hexToRgbTriplet(card, "255 255 255"))};

  --hi5-glow-1: ${glow1};
  --hi5-glow-2: ${glow2};
  --hi5-glow-3: ${glow3};

  --hi5-btn-solid: ${btnSolid};
}
`;

  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

export function clearThemePreview() {
  if (typeof document === "undefined") return;
  const el = document.getElementById(STYLE_ID);
  if (el?.parentNode) el.parentNode.removeChild(el);
}
