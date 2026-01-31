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
      <div className="h-12 flex items-center gap-1 overflow-hidden">
        {(tabs ?? []).map((t) => {
          const isActive = pathname === t.href;
          const canClose = !t.pinned && t.id !== "dashboard";

          return (
            <div
              key={t.id}
              className={[
                "min-w-0 flex items-center gap-2 rounded-xl border hi5-border",
                "px-3 h-9",
                "max-w-[40vw] md:max-w-[18vw]",
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

        {/* New tab button (always visible at end) */}
        <Link
          href="/itsm/new-tab"
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5"
          aria-label="New tab"
          title="New tab"
        >
          <Plus size={16} />
        </Link>
      </div>
    </div>
  );
}
