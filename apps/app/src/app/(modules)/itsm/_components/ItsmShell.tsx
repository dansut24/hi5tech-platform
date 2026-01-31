// apps/app/src/app/(modules)/itsm/_components/ItsmShell.tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bell, User, Plus, Pin, X, MoreHorizontal } from "lucide-react";

import { useItsmUiStore } from "../_state/itsm-ui-store";

type Props = {
  children: ReactNode;
};

function tabTitleFromPath(pathname: string) {
  if (pathname === "/itsm") return "Dashboard";
  if (pathname.startsWith("/itsm/new-tab")) return "New Tab";
  if (pathname.startsWith("/itsm/incidents/new")) return "New Incident";
  if (pathname.startsWith("/itsm/incidents/")) return "Incident";
  if (pathname.startsWith("/itsm/incidents")) return "Incidents";
  if (pathname.startsWith("/itsm/settings")) return "Settings";
  return "Page";
}

function tabIdFromPath(pathname: string) {
  // stable id per route so revisiting updates the same tab
  if (pathname === "/itsm") return "dashboard";
  if (pathname.startsWith("/itsm/new-tab")) return "new-tab";
  if (pathname.startsWith("/itsm/incidents/new")) return "incidents-new";
  if (pathname.startsWith("/itsm/incidents/")) return `incident:${pathname}`;
  return pathname;
}

type MenuState =
  | {
      open: true;
      tabId: string;
      x: number;
      y: number;
    }
  | { open: false };

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
    setTabs,
  } = useItsmUiStore();

  // ===== Ensure tabs are created/updated for current route =====
  useEffect(() => {
    if (!pathname?.startsWith("/itsm")) return;

    // Always ensure dashboard exists + pinned
    if (pathname === "/itsm") {
      upsertTab({ id: "dashboard", href: "/itsm", title: "Dashboard", pinned: true });
      return;
    }

    const id = tabIdFromPath(pathname);
    const title = tabTitleFromPath(pathname);
    upsertTab({ id, href: pathname, title });
  }, [pathname, upsertTab]);

  const effectiveSidebarWidth = useMemo(() => {
    if (sidebarMode !== "fixed") return 0;
    return Math.max(80, Math.min(280, sidebarWidth || 280));
  }, [sidebarMode, sidebarWidth]);

  // ===== Tabs scrolling + auto-scroll to newly opened/active tab =====
  const stripRef = useRef<HTMLDivElement | null>(null);
  const tabEls = useRef<Map<string, HTMLDivElement>>(new Map());

  const prevTabsSigRef = useRef<string>("");

  useEffect(() => {
    const sig = (tabs ?? []).map((t) => t.id).join("|");
    const prevSig = prevTabsSigRef.current;
    prevTabsSigRef.current = sig;

    // If new tab added OR route changed, bring active tab into view
    const activeId = tabIdFromPath(pathname || "/itsm");
    const el = tabEls.current.get(activeId) || tabEls.current.get((tabs ?? []).at(-1)?.id || "");
    if (!el) return;

    // only scroll if:
    // - tabs changed (new one opened) OR
    // - pathname changed
    if (sig !== prevSig || pathname) {
      try {
        el.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
      } catch {
        // ignore
      }
    }
  }, [tabs, pathname]);

  // ===== Long-press / context menu on tabs =====
  const [menu, setMenu] = useState<MenuState>({ open: false });
  const longPressTimerRef = useRef<number | null>(null);

  function closeMenu() {
    setMenu({ open: false });
  }

  function openMenuAt(tabId: string, x: number, y: number) {
    setMenu({ open: true, tabId, x, y });
  }

  function onTabContextMenu(e: React.MouseEvent, tabId: string) {
    e.preventDefault();
    e.stopPropagation();
    openMenuAt(tabId, e.clientX, e.clientY);
  }

  function startLongPress(tabId: string, x: number, y: number) {
    // ~450ms feels right on mobile
    longPressTimerRef.current = window.setTimeout(() => {
      openMenuAt(tabId, x, y);
    }, 450);
  }

  function cancelLongPress() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function togglePin(tabId: string) {
    const list = [...(tabs ?? [])];
    const idx = list.findIndex((t) => t.id === tabId);
    if (idx < 0) return;

    const t = list[idx];
    const next = { ...t, pinned: !t.pinned };

    // Keep Dashboard pinned always
    if (tabId === "dashboard") {
      next.pinned = true;
    }

    list[idx] = next;

    // Optional: keep pinned tabs at front (after dashboard)
    const dashboard = list.find((x) => x.id === "dashboard");
    const others = list.filter((x) => x.id !== "dashboard");

    const pinned = others.filter((x) => x.pinned);
    const unpinned = others.filter((x) => !x.pinned);

    const reordered = [
      ...(dashboard ? [{ ...dashboard, pinned: true }] : []),
      ...pinned,
      ...unpinned,
    ];

    setTabs(reordered);
    closeMenu();
  }

  function closeOthers(tabId: string) {
    const list = [...(tabs ?? [])];
    const keep = new Set<string>(["dashboard", tabId]);

    const next = list.filter((t) => keep.has(t.id) || t.pinned);

    // Ensure dashboard pinned
    const dashIdx = next.findIndex((t) => t.id === "dashboard");
    if (dashIdx >= 0) next[dashIdx] = { ...next[dashIdx], pinned: true };

    setTabs(next);
    closeMenu();
  }

  // Close menu on route change
  useEffect(() => {
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close menu on any global click / scroll
  useEffect(() => {
    function onGlobal() {
      if (menu.open) closeMenu();
    }
    window.addEventListener("click", onGlobal, { capture: true });
    window.addEventListener("scroll", onGlobal, { capture: true, passive: true });
    return () => {
      window.removeEventListener("click", onGlobal, { capture: true } as any);
      window.removeEventListener("scroll", onGlobal, { capture: true } as any);
    };
  }, [menu.open]);

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
        <div className="border-t hi5-border px-2 relative">
          <div className="h-12 flex items-center gap-2">
            {/* Scroll strip */}
            <div
              ref={stripRef}
              className="relative flex-1 flex items-center gap-2 flex-nowrap overflow-x-auto overflow-y-hidden no-scrollbar"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {(tabs ?? []).map((t) => {
                const isActive =
                  pathname === t.href || (t.id !== "dashboard" && pathname === t.id);
                const canClose = !t.pinned && t.id !== "dashboard";

                return (
                  <div
                    key={t.id}
                    ref={(el) => {
                      if (el) tabEls.current.set(t.id, el);
                      else tabEls.current.delete(t.id);
                    }}
                    onContextMenu={(e) => onTabContextMenu(e, t.id)}
                    onTouchStart={(e) => {
                      // open menu near finger
                      const touch = e.touches?.[0];
                      if (touch) startLongPress(t.id, touch.clientX, touch.clientY);
                    }}
                    onTouchEnd={cancelLongPress}
                    onTouchCancel={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    className={[
                      "shrink-0 md:shrink",
                      "inline-flex items-center",
                      "h-9 px-3 rounded-xl border hi5-border",
                      // MOBILE: shorter + forces overflow -> scroll
                      "min-w-[120px] max-w-[60vw]",
                      // DESKTOP: keep your sizing behaviour
                      "md:min-w-0 md:max-w-[18vw]",
                      isActive
                        ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.30)]"
                        : "opacity-90 hover:bg-black/5 dark:hover:bg-white/5",
                    ].join(" ")}
                  >
                    {/* inner layout keeps X beside the text and prevents it drifting */}
                    <div className="flex items-center gap-2 min-w-0 w-full">
                      {t.pinned ? (
                        <Pin size={14} className="opacity-60 flex-none" />
                      ) : null}

                      <Link href={t.href} className="min-w-0 text-sm font-medium truncate">
                        {t.title}
                      </Link>

                      {canClose ? (
                        <button
                          type="button"
                          className="flex-none text-xs opacity-70 hover:opacity-100"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            closeTab(t.id);
                          }}
                          aria-label="Close tab"
                          title="Close"
                        >
                          ✕
                        </button>
                      ) : (
                        <span className="flex-none w-0" />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* iOS-style fade mask (mobile only) */}
              <div className="pointer-events-none md:hidden absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-[rgba(var(--hi5-bg),1)] to-transparent" />
              <div className="pointer-events-none md:hidden absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-[rgba(var(--hi5-bg),1)] to-transparent" />
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

          {/* Long-press / context menu */}
          {menu.open ? (
            <div className="fixed inset-0 z-[60]" onClick={closeMenu}>
              <div
                className="absolute hi5-panel border hi5-border rounded-xl shadow-lg p-2 min-w-[200px]"
                style={{
                  left: Math.min(menu.x, window.innerWidth - 220),
                  top: Math.min(menu.y, window.innerHeight - 140),
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-xs opacity-70 flex items-center justify-between">
                  <span>Tab options</span>
                  <MoreHorizontal size={16} className="opacity-60" />
                </div>

                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sm"
                  onClick={() => closeOthers(menu.tabId)}
                >
                  <X size={16} className="opacity-70" />
                  Close others
                </button>

                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sm"
                  onClick={() => togglePin(menu.tabId)}
                >
                  <Pin size={16} className="opacity-70" />
                  Pin / unpin
                </button>

                <div className="pt-1">
                  <button
                    type="button"
                    className="w-full px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sm opacity-80"
                    onClick={closeMenu}
                  >
                    Close menu
                  </button>
                </div>
              </div>
            </div>
          ) : null}
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
            <Link
              className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
              href="/itsm"
            >
              Dashboard
            </Link>
            <Link
              className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
              href="/itsm/incidents"
            >
              Incidents
            </Link>
            <Link
              className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
              href="/itsm/incidents/new"
            >
              New Incident
            </Link>
            <Link
              className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
              href="/itsm/settings"
            >
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
                <Link
                  onClick={closeDrawer}
                  className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
                  href="/itsm"
                >
                  Dashboard
                </Link>
                <Link
                  onClick={closeDrawer}
                  className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
                  href="/itsm/incidents"
                >
                  Incidents
                </Link>
                <Link
                  onClick={closeDrawer}
                  className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
                  href="/itsm/incidents/new"
                >
                  New Incident
                </Link>
                <Link
                  onClick={closeDrawer}
                  className="block px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
                  href="/itsm/settings"
                >
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
