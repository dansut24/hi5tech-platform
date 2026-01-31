"use client";

import { useState } from "react";
import { saveUserSettings } from "./actions";

export default function ThemeForm({
  initial,
}: {
  initial: {
    theme_mode: "system" | "light" | "dark";
    accent_hex: string;
    bg_hex: string;
    card_hex: string;
  };
}) {
  const [themeMode, setThemeMode] = useState(initial.theme_mode);
  const [accent, setAccent] = useState(initial.accent_hex);
  const [bg, setBg] = useState(initial.bg_hex);
  const [card, setCard] = useState(initial.card_hex);

  return (
    <form action={saveUserSettings} className="hi5-card p-4 space-y-4">
      <div className="text-lg font-semibold">Theme</div>
      <p className="text-sm opacity-80">
        Customise colours across ITSM / Control / Self Service / Admin.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm space-y-1">
          <div>Mode</div>
          <select
            name="theme_mode"
            value={themeMode}
            onChange={(e) => setThemeMode(e.target.value as any)}
            className="w-full rounded-xl border px-3 py-2 bg-transparent hi5-border"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <div className="text-sm space-y-1">
          <div>Preview</div>
          <div className="hi5-card p-3 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-semibold">Hi5Tech</div>
              <div className="opacity-70">Theme preview</div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-xl border hi5-border"
                style={{ background: accent }}
                title="Accent"
              />
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-sm font-medium hi5-accent-btn"
                style={{ background: accent }}
              >
                Button
              </button>
            </div>
          </div>
        </div>

        <label className="text-sm space-y-1">
          <div>Accent colour</div>
          <input
            type="color"
            name="accent_hex"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="h-10 w-full rounded-xl border hi5-border bg-transparent p-1"
          />
        </label>

        <label className="text-sm space-y-1">
          <div>Background</div>
          <input
            type="color"
            name="bg_hex"
            value={bg}
            onChange={(e) => setBg(e.target.value)}
            className="h-10 w-full rounded-xl border hi5-border bg-transparent p-1"
          />
        </label>

        <label className="text-sm space-y-1">
          <div>Card</div>
          <input
            type="color"
            name="card_hex"
            value={card}
            onChange={(e) => setCard(e.target.value)}
            className="h-10 w-full rounded-xl border hi5-border bg-transparent p-1"
          />
        </label>

        <div className="text-sm space-y-1">
          <div>Tip</div>
          <div className="text-xs opacity-70">
            “System” follows your device theme. Light/dark overrides it.
          </div>
        </div>
      </div>

      <button
        className="rounded-xl px-3 py-2 text-sm font-medium hi5-accent-btn"
        style={{ background: accent }}
      >
        Save
      </button>
    </form>
  );
}