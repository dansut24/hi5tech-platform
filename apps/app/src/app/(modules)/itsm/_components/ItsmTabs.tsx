"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useItsmUiStore } from "../_state/itsm-ui-store";

export default function ItsmTabs() {
  const pathname = usePathname();
  const { tabs, closeTab } = useItsmUiStore();

  return (
    <div className="border-t hi5-border px-2">
      <div className="h-12 flex items-center gap-2">
        {/* Scrollable strip */}
        <div
          className={[
            "flex-1",
            "flex items-center gap-2",
            "flex-nowrap",
            "overflow-x-auto overflow-y-hidden",
            "touch-pan-x",
            "whitespace-nowrap",
          ].join(" ")}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {(tabs ?? []).map((t) => {
            const isActive = pathname === t.href;
            const canClose = !t.pinned && t.id !== "dashboard";

            return (
              <div
                key={t.id}
                className={[
                  "shrink-0", // IMPORTANT: do not shrink
                  "inline-flex items-center gap-2",
                  "rounded-xl border hi5-border",
                  "h-9 px-3",
                  // MOBILE: fixed-ish readable width so it overflows and scrolls
                  "min-w-[160px] max-w-[70vw]",
                  // DESKTOP: keep your existing sizing behaviour
                  "md:min-w-0 md:max-w-[18vw]",
                  isActive
                    ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.30)]"
                    : "opacity-90 hover:bg-black/5 dark:hover:bg-white/5",
                ].join(" ")}
              >
                <Link href={t.href} className="min-w-0 text-sm font-medium truncate">
                  {t.title}
                </Link>

                {canClose ? (
                  <button
                    type="button"
                    className="text-xs opacity-70 hover:opacity-100"
                    onClick={() => closeTab(t.id)}
                    aria-label="Close tab"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Pinned New tab button */}
        <Link
          href="/itsm/new-tab"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5"
          aria-label="New tab"
          title="New tab"
        >
          <Plus size={16} />
        </Link>
      </div>
    </div>
  );
}
