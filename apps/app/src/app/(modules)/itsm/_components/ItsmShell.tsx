"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bell, User, Plus } from "lucide-react";

import { useItsmUiStore } from "../_state/itsm-ui-store";

type Props = {
  children: ReactNode;
};

function tabTitleFromPath(pathname: string) {
  if (pathname === "/itsm") return "Dashboard";
  if (pathname.startsWith("/itsm/incidents/new")) return "New Incident";
  if (pathname.startsWith("/itsm/incidents/")) return "Incident";
  if (pathname.startsWith("/itsm/incidents")) return "Incidents";
  if (pathname.startsWith("/itsm/settings")) return "Settings";
  return "Page";
}

function tabIdFromPath(pathname: string) {
  // stable id per route so revisiting updates the same tab
  if (pathname === "/itsm") return "dashboard";
  if (pathname.startsWith("/itsm/incidents/new")) return "incidents-new";
  if (pathname.startsWith("/itsm/incidents/")) return `incident:${pathname}`;
  return pathname;
}

export default function ItsmShell({ children }: Props) {
  const pathname = usePathname();

  const {
    sidebarMode,
    sidebarWidth,
    sidebarDrawerOpen,
    toggleDrawer,
    closeDrawer,
    tabs,
    upsertTab,
    closeTab,
  } = useItsmUiStore();

  // Header + Tabs exist only inside ITSM
  useEffect(() => {
    if (!pathname?.startsWith("/itsm")) return;

    // Always ensure dashboard exists + is pinned
    if (pathname === "/itsm") {
      upsertTab({ id: "dashboard", href: "/itsm", title: "Dashboard", pinned: true });
      return;
    }

    // Create/update a tab for the current page
    const id = tabIdFromPath(pathname);
    const title = tabTitleFromPath(pathname);

    upsertTab({ id, href: pathname, title });
  }, [pathname, upsertTab]);

  const effectiveSidebarWidth = useMemo(() => {
    if (sidebarMode !== "fixed") return 0;
    return Math.max(80, Math.min(280, sidebarWidth || 280));
  }, [sidebarMode, sidebarWidth]);

  return (
    <div className="min-h-dvh">
      {/* ===== Header bar (full width) ===== */}
      <div className="sticky top-0 z-40 hi5-panel border-b hi5-border">
        <div className="h-14 px-3 sm:px-4 flex items-center gap-3">
          {/* Left: menu (mobile) + logo */}
          <button
            type="button"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5"
            onClick={toggleDrawer}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          <Link href="/itsm" className="font-semibold tracking-tight whitespace-nowrap">
            Hi5Tech ITSM
          </Link>

          {/* Center: search */}
          <div className="flex-1 min-w-0">
            <div className="hi5-input flex items-center gap-2 px-3 h-10 rounded-xl border hi5-border">
              <input
                className="bg-transparent outline-none w-full text-sm"
                placeholder="Search incidents, users, assets..."
                inputMode="search"
              />
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/itsm/new-tab"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5"
              aria-label="New tab"
              title="New tab"
            >
              <Plus size={18} />
            </Link>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5"
              aria-label="Profile"
            >
              <User size={18} />
            </button>
          </div>
        </div>

{/* ===== Tabs bar (full width, single line) ===== */}
<div className="border-t hi5-border px-2">
  <div className="h-12 flex items-center gap-2">
    {/* Scroll strip */}
    <div
      className="flex-1 flex items-center gap-2 flex-nowrap overflow-x-auto overflow-y-hidden no-scrollbar"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {(tabs ?? []).map((t) => {
        const isActive = pathname === t.href || (t.id !== "dashboard" && pathname === t.id);
        const canClose = !t.pinned && t.id !== "dashboard";

        return (
          <div
            key={t.id}
            className={[
              "shrink-0",                       // IMPORTANT: prevents shrinking
              "inline-flex items-center gap-2",
              "h-9 px-3 rounded-xl border hi5-border",
              "min-w-[160px] max-w-[70vw]",      // MOBILE: forces overflow -> scroll
              "md:min-w-0 md:max-w-[18vw]",      // DESKTOP: keep your sizing behaviour
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

    {/* Pinned + button */}
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
      {/* ===== Body: sidebar + content ===== */}
      <div className="flex w-full">
        {/* Desktop sidebar (fixed 280) */}
        <aside
          className="hidden md:block border-r hi5-border"
          style={{ width: sidebarMode === "fixed" ? effectiveSidebarWidth : 0 }}
        >
          <div className="p-3 space-y-2">
            <Link className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5" href="/itsm">
              Dashboard
            </Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5" href="/itsm/incidents">
              Incidents
            </Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5" href="/itsm/incidents/new">
              New Incident
            </Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5" href="/itsm/settings">
              Settings
            </Link>
          </div>
        </aside>

        {/* Mobile overlay drawer */}
        {sidebarDrawerOpen ? (
          <div className="md:hidden fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close navigation"
              onClick={closeDrawer}
            />
            <div className="absolute top-0 left-0 h-full w-[85vw] max-w-[320px] hi5-panel border-r hi5-border p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Navigation</div>
                <button
                  type="button"
                  className="h-9 px-3 rounded-xl border hi5-border"
                  onClick={closeDrawer}
                >
                  Close
                </button>
              </div>

              <div className="mt-3 space-y-2">
                <Link onClick={closeDrawer} className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5" href="/itsm">
                  Dashboard
                </Link>
                <Link onClick={closeDrawer} className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5" href="/itsm/incidents">
                  Incidents
                </Link>
                <Link onClick={closeDrawer} className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5" href="/itsm/incidents/new">
                  New Incident
                </Link>
                <Link onClick={closeDrawer} className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5" href="/itsm/settings">
                  Settings
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* Main content */}
        <main className="flex-1 min-w-0 p-3 sm:p-4">{children}</main>
      </div>
    </div>
  );
}
