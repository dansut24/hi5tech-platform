"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronDown } from "lucide-react";

export type OpenTab = { key: string; title: string; href: string };

export default function TabsBar({
  tabs,
  activeKey,
  onSelect,
  onClose,
}: {
  tabs: OpenTab[];
  activeKey: string | null;
  onSelect: (key: string) => void;
  onClose: (key: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [maxVisible, setMaxVisible] = useState(6);
  const [openOverflow, setOpenOverflow] = useState(false);

  // Compute how many tabs can fit based on container width
  useEffect(() => {
    function recalc() {
      const el = containerRef.current;
      if (!el) return;

      const w = el.getBoundingClientRect().width;

      // Heuristics: base padding + buttons area
      // Each tab minimum ~110px, prefer ~140px when space allows
      const minTab = 112;
      const reserved = 120; // room for overflow button + breathing
      const available = Math.max(0, w - reserved);

      const fit = Math.max(2, Math.min(9, Math.floor(available / minTab)));
      setMaxVisible(fit);
    }

    recalc();
    const ro = new ResizeObserver(() => recalc());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", recalc);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, []);

  const { visible, overflow } = useMemo(() => {
    if (tabs.length <= maxVisible) return { visible: tabs, overflow: [] as OpenTab[] };

    // Keep active tab visible if possible
    const activeIdx = tabs.findIndex((t) => t.key === activeKey);
    const base = tabs.slice(0, maxVisible);
    if (activeIdx >= 0 && activeIdx >= maxVisible) {
      // Swap last visible with active tab
      const swapped = base.slice(0, maxVisible - 1).concat(tabs[activeIdx]);
      const overflowTabs = tabs.filter((t) => !swapped.some((x) => x.key === t.key));
      return { visible: swapped, overflow: overflowTabs };
    }

    return { visible: base, overflow: tabs.slice(maxVisible) };
  }, [tabs, maxVisible, activeKey]);

  // Close overflow on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("[data-overflow-root='1']")) return;
      setOpenOverflow(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={containerRef} className="w-full flex items-center gap-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {visible.map((t) => {
          const active = t.key === activeKey;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onSelect(t.key)}
              className={[
                "group min-w-0",
                "rounded-full border px-3 py-1.5 text-sm",
                "flex items-center gap-2",
                active
                  ? "hi5-chip border-[rgba(var(--hi5-accent),0.40)] bg-[rgba(var(--hi5-accent),0.12)]"
                  : "hi5-chip hover:bg-black/5 dark:hover:bg-white/5",
                "transition",
              ].join(" ")}
              title={t.title}
            >
              <span className={["truncate max-w-[18ch] sm:max-w-[26ch]", active ? "hi5-accent font-semibold" : "opacity-85"].join(" ")}>
                {t.title}
              </span>

              <span
                className="rounded-full w-7 h-7 grid place-items-center hover:bg-black/5 dark:hover:bg-white/5 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(t.key);
                }}
                aria-label="Close tab"
                title="Close"
              >
                <X className="h-4 w-4 opacity-70" />
              </span>
            </button>
          );
        })}
      </div>

      {overflow.length ? (
        <div className="relative shrink-0" data-overflow-root="1">
          <button
            type="button"
            className="hi5-chip px-3 py-1.5 text-sm inline-flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition"
            onClick={() => setOpenOverflow((v) => !v)}
            title="More tabs"
          >
            <span className="opacity-85">+{overflow.length}</span>
            <ChevronDown className="h-4 w-4 opacity-70" />
          </button>

          {openOverflow ? (
            <div className="absolute right-0 mt-2 w-[340px] max-w-[80vw] hi5-panel p-2 z-50">
              <div className="text-[11px] uppercase tracking-wide opacity-60 px-2 py-2">
                More tabs
              </div>
              <div className="grid gap-1 max-h-[55vh] overflow-auto">
                {overflow.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setOpenOverflow(false);
                      onSelect(t.key);
                    }}
                    className="rounded-2xl border hi5-border px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm truncate">{t.title}</div>
                      <div className="text-xs opacity-60 truncate">{t.href}</div>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border hi5-border w-8 h-8 grid place-items-center hover:bg-black/5 dark:hover:bg-white/5 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose(t.key);
                      }}
                      title="Close"
                    >
                      <X className="h-4 w-4 opacity-70" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}