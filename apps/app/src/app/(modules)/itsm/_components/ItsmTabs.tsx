"use client";

import Link from "next/link";
import type { ItsmTab } from "../_state/itsm-ui-store";

type Props = {
  tabs: ItsmTab[];
  activeHref: string;
  onCloseTab: (key: string) => void;
};

export default function ItsmTabs({ tabs, activeHref, onCloseTab }: Props) {
  return (
    <div className="fixed left-0 right-0 z-40" style={{ top: 56 }}>
      <div className="hi5-panel border-b hi5-border">
        <div className="h-11 px-2 flex items-center gap-2 overflow-hidden">
          {/* Tabs - must stay single line */}
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            {tabs.map((t) => {
              const active = activeHref === t.href || activeHref.startsWith(t.href + "/");
              return (
                <div
                  key={t.key}
                  className={[
                    "min-w-0 flex items-center gap-2 rounded-xl border hi5-border",
                    "px-3 h-9",
                    active
                      ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.30)]"
                      : "opacity-90 hover:bg-black/5 dark:hover:bg-white/5 transition",
                  ].join(" ")}
                  style={{
                    // shrink as more open, but keep readable
                    flex: "0 1 180px",
                  }}
                >
                  <Link href={t.href} className="min-w-0 truncate text-sm">
                    {t.label}
                  </Link>

                  {t.closable ? (
                    <button
                      type="button"
                      onClick={() => onCloseTab(t.key)}
                      className="text-xs opacity-70 hover:opacity-100"
                      aria-label={`Close ${t.label}`}
                      title="Close tab"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* + New tab (always visible) */}
          <Link
            href="/itsm/new-tab"
            className="shrink-0 rounded-xl border hi5-border px-3 h-9 flex items-center text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
            aria-label="New tab"
            title="New tab"
          >
            ＋
          </Link>
        </div>
      </div>
    </div>
  );
}
