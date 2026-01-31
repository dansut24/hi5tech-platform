"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useItsmUiStore } from "../_state/itsm-ui-store";

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

type Props = {
  allowedModules: ModuleKey[];
  tenantLabel: string | null;
};

export default function ItsmHeader({ tenantLabel }: Props) {
  const router = useRouter();
  const toggleDrawer = useItsmUiStore((s) => s.toggleDrawer);
  const sidebarMode = useItsmUiStore((s) => s.sidebarMode);

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("q") ?? "").trim();
    if (!q) return;
    router.push(`/itsm/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="fixed left-0 right-0 z-50" style={{ top: 0 }}>
      <div className="hi5-panel border-b hi5-border">
        <div className="h-14 px-3 sm:px-4 flex items-center gap-3">
          {/* Left: menu + logo */}
          <button
            type="button"
            onClick={toggleDrawer}
            className="md:hidden rounded-xl border hi5-border px-3 py-2 text-sm"
            aria-label="Open menu"
          >
            ☰
          </button>

          <Link href="/itsm" className="font-semibold tracking-tight whitespace-nowrap">
            Hi5Tech ITSM
          </Link>

          <div className="hidden sm:block h-6 w-px bg-[rgba(var(--hi5-border),var(--hi5-border-alpha))]" />

          <div className="hidden sm:block min-w-0">
            <div className="text-xs opacity-70 leading-tight">Tenant</div>
            <div className="text-sm font-medium truncate">{tenantLabel ?? "—"}</div>
          </div>

          {/* Center: search */}
          <form onSubmit={onSearch} className="flex-1 min-w-0">
            <input
              name="q"
              placeholder="Search incidents, users, assets…"
              className="w-full rounded-xl border hi5-border px-3 py-2 text-sm bg-transparent"
            />
          </form>

          {/* Right: icons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border hi5-border px-3 py-2 text-sm"
              title="Notifications"
              aria-label="Notifications"
            >
              🔔
            </button>

            <Link
              href="/itsm/settings"
              className="rounded-xl border hi5-border px-3 py-2 text-sm"
              title="Profile / Settings"
              aria-label="Profile / Settings"
            >
              👤
            </Link>

            {/* Desktop: optional hide toggle (quick) */}
            <div className="hidden md:block">
              <span className="text-xs opacity-60">
                {sidebarMode === "hidden" ? "Menu" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
