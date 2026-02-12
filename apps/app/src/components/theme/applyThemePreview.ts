// apps/app/src/components/theme/applyThemePreview.ts

export type ThemePreviewInput = {
  accent_hex?: string | null;
  accent_2_hex?: string | null;
  accent_3_hex?: string | null;

  bg_hex?: string | null;
  card_hex?: string | null;
  topbar_hex?: string | null;

  glow_1?: number | null;
  glow_2?: number | null;
  glow_3?: number | null;

  // optional future toggle
  btn_solid?: 0 | 1;
};

const PREVIEW_STYLE_ID = "hi5-theme-preview-vars";

/** "#RRGGBB" / "#RGB" / "r g b" -> "r g b" */
function toRgbTriplet(input: string | null | undefined, fallback = "0 0 0") {
  if (!input) return fallback;

  let h = String(input).trim();

  // already in "r g b"
  if (/^\d+\s+\d+\s+\d+$/.test(h)) return h;

  // strip #
  if (h.startsWith("#")) h = h.slice(1);

  // expand #RGB
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");

  if (!/^[0-9a-fA-F]{6}$/.test(h)) return fallback;

  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function clamp01(v: any, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

/**
 * Your globals.css currently uses:
 * - --hi5-spheres-opacity
 * - --hi5-spheres-blur
 *
 * Not --hi5-glow-1/2/3, so we map glows -> spheres-opacity.
 */
function computeSpheresOpacity(glow1?: number | null, glow2?: number | null, glow3?: number | null) {
  const g1 = clamp01(glow1, 0.18);
  const g2 = clamp01(glow2, 0.14);
  const g3 = clamp01(glow3, 0.10);

  // If all zeros (neutral presets), kill blobs
  if (g1 === 0 && g2 === 0 && g3 === 0) return 0;

  // Average + scale to feel similar to your current defaults
  const avg = (g1 + g2 + g3) / 3;
  // default avg ~0.14 -> target opacity ~0.55 (light) / ~0.78 (dark handled by .dark)
  return Math.max(0, Math.min(1, avg * 4));
}

export function applyThemePreview(input: ThemePreviewInput) {
  if (typeof document === "undefined") return;

  const accent = toRgbTriplet(input.accent_hex, "0 193 255");
  const accent2 = toRgbTriplet(input.accent_2_hex, "255 79 225");
  const accent3 = toRgbTriplet(input.accent_3_hex, "255 196 45");

  const bg = toRgbTriplet(input.bg_hex, "255 255 255");
  const card = toRgbTriplet(input.card_hex, "255 255 255");
  const topbar = toRgbTriplet(input.topbar_hex, card);

  const spheresOpacity = computeSpheresOpacity(input.glow_1, input.glow_2, input.glow_3);

  const css = `
:root{
  --hi5-accent: ${accent};
  --hi5-accent-2: ${accent2};
  --hi5-accent-3: ${accent3};

  --hi5-bg: ${bg};
  --hi5-card: ${card};
  --hi5-topbar: ${topbar};

  /* make glow sliders actually do something with current globals.css */
  --hi5-spheres-opacity: ${spheresOpacity};

  /* optional: if you want blur to soften when glow is low */
  --hi5-spheres-blur: ${spheresOpacity === 0 ? "0px" : "64px"};
}
`.trim();

  let style = document.getElementById(PREVIEW_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = PREVIEW_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;
}

export function clearThemePreview() {
  if (typeof document === "undefined") return;
  const el = document.getElementById(PREVIEW_STYLE_ID);
  if (el && el.parentNode) el.parentNode.removeChild(el);
}
