"use client";

import { useEffect, useMemo, useState } from "react";
import type { Hi5Theme } from "@/lib/theme/hi5-theme";
import { applyTheme, loadTheme, resetTheme, saveTheme } from "@/lib/theme/hi5-theme";

function Card({ title, children, desc }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="hi5-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold">{title}</div>
          {desc ? <div className="text-sm opacity-70 mt-1">{desc}</div> : null}
        </div>
      </div>
      <div className="pt-2">{children}</div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="opacity-80">{label}</span>
        <span className="opacity-70 tabular-nums">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

type ThemePatch = Partial<Hi5Theme>;

export default function ThemeSettingsClient() {
  const [theme, setTheme] = useState<Hi5Theme | null>(null);

  useEffect(() => {
    const t = loadTheme();
    setTheme(t);
    applyTheme(t);

    const onExternal = (e: any) => {
      if (e?.detail) setTheme(e.detail);
    };
    window.addEventListener("hi5-theme-changed", onExternal as any);
    return () => window.removeEventListener("hi5-theme-changed", onExternal as any);
  }, []);

  const previewStyle = useMemo(() => {
    if (!theme) return {};
    return {
      background: "rgba(var(--hi5-card), var(--hi5-card-alpha))",
      border: "1px solid rgba(var(--hi5-border), var(--hi5-border-alpha))",
    } as any;
  }, [theme]);

  if (!theme) {
    return <div className="hi5-card p-4 text-sm opacity-80">Loading theme…</div>;
  }

  function update(next: ThemePatch) {
    setTheme((prev) => {
      if (!prev) return prev;

      const merged: Hi5Theme = {
        ...prev,
        ...next,

        // guarantee required keys stay defined
        mode: next.mode ?? prev.mode,
        accent: next.accent ?? prev.accent,
        accent2: next.accent2 ?? prev.accent2,
        cardAlpha: typeof next.cardAlpha === "number" ? next.cardAlpha : prev.cardAlpha,
        borderAlpha: typeof next.borderAlpha === "number" ? next.borderAlpha : prev.borderAlpha,
      };

      saveTheme(merged);
      applyTheme(merged);
      return merged;
    });
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-3">
        <Card title="Mode" desc="System follows your device. Dark mode uses the same colour tokens.">
          <div className="flex gap-2 flex-wrap">
            {(["system", "light", "dark"] as const).map((m) => {
              const active = theme.mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => update({ mode: m })}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm",
                    "hi5-border",
                    active ? "hi5-accent" : "opacity-80",
                    "hover:bg-black/5 dark:hover:bg-white/5 transition",
                  ].join(" ")}
                >
                  {m === "system" ? "System" : m === "light" ? "Light" : "Dark"}
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Accent colours" desc="Accent drives buttons, highlights and selection glow.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <div className="opacity-80">Accent</div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme.accent}
                  onChange={(e) => update({ accent: e.target.value })}
                  className="h-10 w-14 rounded-xl border hi5-border bg-transparent"
                />
                <input
                  value={theme.accent}
                  onChange={(e) => update({ accent: e.target.value })}
                  className="hi5-input w-full text-sm"
                />
              </div>
            </label>

            <label className="space-y-2 text-sm">
              <div className="opacity-80">Glow</div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme.accent2}
                  onChange={(e) => update({ accent2: e.target.value })}
                  className="h-10 w-14 rounded-xl border hi5-border bg-transparent"
                />
                <input
                  value={theme.accent2}
                  onChange={(e) => update({ accent2: e.target.value })}
                  className="hi5-input w-full text-sm"
                />
              </div>
            </label>
          </div>
        </Card>

        <Card title="Glass intensity" desc="Controls translucency of cards and border visibility.">
          <div className="space-y-4">
            <Slider
              label="Card opacity"
              value={theme.cardAlpha}
              min={0.25}
              max={0.9}
              step={0.01}
              onChange={(v) => update({ cardAlpha: v })}
            />
            <Slider
              label="Border opacity"
              value={theme.borderAlpha}
              min={0.04}
              max={0.25}
              step={0.01}
              onChange={(v) => update({ borderAlpha: v })}
            />
          </div>
        </Card>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              const t = resetTheme();
              setTheme(t);
              applyTheme(t);
            }}
            className="rounded-xl border px-3 py-2 text-sm hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            Reset to default
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <Card title="Preview" desc="This preview updates instantly across the app.">
          <div className="rounded-2xl p-4" style={previewStyle}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Hi5Tech Glass</div>
              <span className="text-xs opacity-70">Live</span>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="hi5-card p-3">
                <div className="text-sm font-semibold">Card</div>
                <div className="text-sm opacity-70 mt-1">Borders + blur + translucency.</div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button className="rounded-xl px-3 py-2 text-sm font-medium hi5-accent-btn">Primary action</button>
                <button className="rounded-xl border px-3 py-2 text-sm hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition">
                  Secondary
                </button>
              </div>

              <div className="hi5-card p-3">
                <div className="text-sm font-semibold">Inputs</div>
                <input className="hi5-input w-full mt-2 text-sm" placeholder="Type something…" />
              </div>
            </div>
          </div>
        </Card>

        <div className="hi5-card p-4">
          <div className="font-semibold">Next (Phase 2)</div>
          <ul className="list-disc pl-5 text-sm opacity-80 mt-2 space-y-1">
            <li>Save theme to Supabase profile + sync across devices</li>
            <li>Per-tenant branding (logo + colours)</li>
            <li>Preset themes (Hi5Tech, ElmelTech, etc.)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
