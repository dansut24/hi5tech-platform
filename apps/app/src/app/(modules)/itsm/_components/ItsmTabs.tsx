"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useItsmUiStore } from "../_state/itsm-ui-store";

export default function ItsmTabs() {
  const pathname = usePathname();
  const { tabs, closeTab } = useItsmUiStore();

  return (
    <div className="border-t hi5-border">
      <div className="h-12 flex items-center">
        {/* MOBILE: horizontal finger-scroll tab strip */}
        <div className="md:hidden relative w-full h-full">
          {/* Scroll area */}
          <div
            className={[
              "h-full flex items-center gap-2",
              "flex-nowrap", // IMPORTANT: never wrap
              "overflow-x-auto overflow-y-hidden",
              "px-2 pr-14", // room for pinned + button
              "touch-pan-x", // IMPORTANT: finger scroll
              "[-webkit-overflow-scrolling:touch]",
              "scrollbar-hide",
            ].join(" ")}
          >
            {(tabs ?? []).map((t) => {
              const isActive = pathname === t.href;
              const canClose = !t.pinned && t.id !== "dashboard";

              return (
                <div
                  key={t.id}
                  className={[
                    "flex-none", // IMPORTANT: never shrink
                    "inline-flex items-center gap-2",
                    "rounded-xl border hi5-border",
                    "h-9 px-3",
                    "min-w-[140px]", // gives tabs a stable readable size
                    "max-w-[72vw]", // still prevents huge tabs
                    isActive
                      ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.30)]"
                      : "opacity-90 hover:bg-black/5 dark:hover:bg-white/5",
                  ].join(" ")}
                >
                  <Link href={t.href} className="text-sm font-medium truncate">
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

          {/* Pinned New Tab button (always visible on mobile) */}
          <div className="absolute right-0 top-0 h-full flex items-center pr-2">
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

        {/* DESKTOP: keep current behaviour */}
        <div className="hidden md:flex w-full items-center gap-1 px-2 overflow-hidden">
          {(tabs ?? []).map((t) => {
            const isActive = pathname === t.href;
            const canClose = !t.pinned && t.id !== "dashboard";

            return (
              <div
                key={t.id}
                className={[
                  "min-w-0 flex items-center gap-2 rounded-xl border hi5-border",
                  "px-3 h-9",
                  "max-w-[18vw]",
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
    </div>
  );
}
