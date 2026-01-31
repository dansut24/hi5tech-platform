"use client";

import { useMemo } from "react";
import { useItsmUiStore } from "../../_state/itsm-ui-store";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function SidebarSettingsClient() {
  const {
    sidebarMode,
    sidebarWidth,
    setSidebarMode,
    setSidebarWidth,
  } = useItsmUiStore();

  const width = useMemo(() => {
    const w = Number(sidebarWidth ?? 280);
    return clamp(w, 180, 360);
  }, [sidebarWidth]);

  const isFixed = sidebarMode === "fixed";

  return (
    <div className="space-y-4">
      {/* Desktop behaviour */}
      <div className="hi5-panel p-5 space-y-3">
        <div className="font-semibold">Desktop sidebar</div>
        <div className="text-sm opacity-75">
          On mobile the sidebar stays in the hamburger drawer (unchanged).
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => setSidebarMode("fixed" as any)}
            className={[
              "rounded-xl border px-3 py-2 text-sm transition",
              "hi5-border hover:bg-black/5 dark:hover:bg-white/5",
              isFixed
                ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.30)]"
                : "opacity-85",
            ].join(" ")}
          >
            Fixed
          </button>

          <button
            type="button"
            onClick={() => setSidebarMode("hidden" as any)}
            className={[
              "rounded-xl border px-3 py-2 text-sm transition",
              "hi5-border hover:bg-black/5 dark:hover:bg-white/5",
              !isFixed
                ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.30)]"
                : "opacity-85",
            ].join(" ")}
          >
            Hidden
          </button>
        </div>
      </div>

      {/* Width */}
      <div className="hi5-panel p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Sidebar width</div>
            <div className="text-sm opacity-75">
              Applies when Desktop sidebar is <span className="font-medium">Fixed</span>.
            </div>
          </div>

          <div className="text-sm opacity-80 tabular-nums">
            {width}px
          </div>
        </div>

        <div className={isFixed ? "" : "opacity-50 pointer-events-none"}>
          <input
            type="range"
            min={180}
            max={360}
            value={width}
            onChange={(e) => setSidebarWidth(Number(e.target.value))}
            className="w-full"
            aria-label="Sidebar width"
          />

          <div className="flex flex-wrap gap-2 pt-3">
            <button
              type="button"
              className="rounded-xl border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
              onClick={() => setSidebarWidth(220)}
            >
              Compact
            </button>
            <button
              type="button"
              className="rounded-xl border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
              onClick={() => setSidebarWidth(280)}
            >
              Default
            </button>
            <button
              type="button"
              className="rounded-xl border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
              onClick={() => setSidebarWidth(340)}
            >
              Wide
            </button>

            <button
              type="button"
              className="ml-auto rounded-xl border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
              onClick={() => {
                setSidebarMode("fixed" as any);
                setSidebarWidth(280);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="hi5-panel p-5">
        <div className="text-sm opacity-75">
          Tip: if you hide the desktop sidebar, you can still navigate using the top tabs and direct links.
        </div>
      </div>
    </div>
  );
}
