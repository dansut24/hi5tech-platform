"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { tabsApi, useTabsStore } from "./tabs-store";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function TabsBar() {
  const router = useRouter();
  const pathname = usePathname();
  const tabs = useTabsStore((s) => s.tabs);
  const activeHref = useTabsStore((s) => s.activeHref) ?? pathname;

  const list = useMemo(() => tabs, [tabs]);
  if (!list.length) return null;

  const active = activeHref;

  function go(href: string) {
    tabsApi.setActive(href);
    router.push(href);
  }

  function close(href: string) {
    const wasActive = (active === href);
    tabsApi.close(href);
    const next = tabsApi.getState().activeHref;
    if (wasActive) router.push(next ?? "/apps");
  }

  return (
    <div className="w-full">
      <div className="hi5-tabsbar h-[44px] px-2 flex items-center gap-2">
        <div className="flex-1 min-w-0 flex items-stretch gap-1" role="tablist" aria-label="Open tabs">
          {list.map((t) => {
            const isActive = t.href === active;

            return (
              <div
                key={t.id}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => go(t.href)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    go(t.href);
                  }
                }}
                className={cx(
                  "group relative flex-1 min-w-0 cursor-pointer select-none",
                  "rounded-2xl border hi5-border",
                  "px-2 py-2",
                  "transition",
                  isActive
                    ? "bg-[rgba(var(--hi5-accent),0.14)] border-[rgba(var(--hi5-accent),0.30)]"
                    : "bg-[rgba(var(--hi5-card),0.18)] hover:bg-black/5 dark:hover:bg-white/5",
                )}
                title={t.title}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cx("text-xs sm:text-sm font-semibold min-w-0 truncate", isActive ? "hi5-accent" : "opacity-90")}>
                    {t.title}
                  </div>

                  {t.closable !== false ? (
                    <div className="ml-auto flex items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          close(t.href);
                        }}
                        className={cx(
                          "rounded-xl border hi5-border",
                          "w-7 h-7 grid place-items-center",
                          "opacity-70 hover:opacity-100",
                          "bg-transparent hover:bg-black/5 dark:hover:bg-white/5",
                        )}
                        aria-label="Close tab"
                        title="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}