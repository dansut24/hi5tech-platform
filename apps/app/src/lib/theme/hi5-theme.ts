"use client";

export type Hi5Theme = {
  mode: "light" | "dark" | "system";
  accent: string;     // hex
  accent2: string;    // hex
  cardAlpha: number;  // 0.25 - 0.9
  borderAlpha: number;// 0.04 - 0.25
};

const KEY = "hi5_theme_v1";

const DEFAULT_THEME: Hi5Theme = {
  mode: "system",
  accent: "#6366f1",   // indigo-500
  accent2: "#38bdf8",  // sky-400
  cardAlpha: 0.60,
  borderAlpha: 0.10,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "").trim();
  if (![3, 6].includes(h.length)) return null;

  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return [r, g, b];
}

export function loadTheme(): Hi5Theme {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw);

    const t: Hi5Theme = {
      mode: parsed.mode === "light" || parsed.mode === "dark" || parsed.mode === "system" ? parsed.mode : "system",
      accent: typeof parsed.accent === "string" ? parsed.accent : DEFAULT_THEME.accent,
      accent2: typeof parsed.accent2 === "string" ? parsed.accent2 : DEFAULT_THEME.accent2,
      cardAlpha: clamp(Number(parsed.cardAlpha ?? DEFAULT_THEME.cardAlpha), 0.25, 0.90),
      borderAlpha: clamp(Number(parsed.borderAlpha ?? DEFAULT_THEME.borderAlpha), 0.04, 0.25),
    };
    return t;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(t: Hi5Theme) {
  localStorage.setItem(KEY, JSON.stringify(t));
}

export function applyTheme(t: Hi5Theme) {
  const root = document.documentElement;

  // Mode
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  const shouldDark = t.mode === "dark" ? true : t.mode === "light" ? false : systemDark;

  root.classList.toggle("dark", shouldDark);

  // Accent vars
  const a = hexToRgb(t.accent);
  const a2 = hexToRgb(t.accent2);

  if (a) root.style.setProperty("--hi5-accent", `${a[0]} ${a[1]} ${a[2]}`);
  if (a2) root.style.setProperty("--hi5-accent-2", `${a2[0]} ${a2[1]} ${a2[2]}`);

  // Alphas
  root.style.setProperty("--hi5-card-alpha", String(clamp(t.cardAlpha, 0.25, 0.9)));
  root.style.setProperty("--hi5-border-alpha", String(clamp(t.borderAlpha, 0.04, 0.25)));

  // Broadcast to any listeners
  window.dispatchEvent(new CustomEvent("hi5-theme-changed", { detail: t }));
}

export function resetTheme(): Hi5Theme {
  saveTheme(DEFAULT_THEME);
  return DEFAULT_THEME;
}

export function initTheme() {
  const t = loadTheme();
  applyTheme(t);

  // Keep system mode updated
  const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
  const onChange = () => {
    const latest = loadTheme();
    applyTheme(latest);
  };
  mq?.addEventListener?.("change", onChange);

  return () => mq?.removeEventListener?.("change", onChange);
}