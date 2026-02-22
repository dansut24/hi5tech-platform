"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronLeft, ChevronRight } from "lucide-react";

import type { ShellNavItem } from "./types";
import ShellBreadcrumbs from "./breadcrumbs";

function normalizePath(p: string) {
  return (p || "").split("?")[0].split("#")[0];
}

function isActivePath(pathname: string, item: ShellNavItem) {
  const p = normalizePath(pathname);
  const href = normalizePath(item.href);

  if (item.exact) return p === href;
  return p === href || p.startsWith(href + "/");
}

function NavItem({
  item,
  collapsed,
  onClick,
}: {
  item: ShellNavItem;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = isActivePath(pathname, item);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={[
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
        collapsed ? "justify-center px-2" : "",
        active
          ? "bg-[rgba(var(--hi5-accent),0.14)] border border-[rgba(var(--hi5-accent),0.28)] text-[rgb(var(--hi5-accent))]"
          : "hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 border border-transparent",
      ].join(" ")}
    >
      {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
      {!collapsed ? (
        <span className="truncate font-medium flex-1">{item.label}</span>
      ) : null}
      {!collapsed && item.badge ? <span className="shrink-0">{item.badge}</span> : null}
    </Link>
  );
}

export type AppShellProps = {
  // header
  title: string;
  homeHref: string;

  // nav
  navItems: ShellNavItem[];
  sidebarDefaultCollapsed?: boolean;
  sidebarMode?: "visible" | "hidden";

  // header slots
  headerLeftSlot?: React.ReactNode;   // e.g. module switcher
  headerRightSlot?: React.ReactNode;  // e.g. account dropdown, notifications

  // optional 2nd row under header (tabs / filters / etc)
  topBarSlot?: React.ReactNode;

  // body
  children: React.ReactNode;

  // content chrome
  showBreadcrumbs?: boolean;
  contentClassName?: string;
  headerClassName?: string;

  // optional: hide desktop collapse button
  allowDesktopCollapse?: boolean;
};

export default function AppShell({
  title,
  homeHref,
  navItems,
  sidebarDefaultCollapsed = false,
  sidebarMode = "visible",
  headerLeftSlot,
  headerRightSlot,
  topBarSlot,
  children,
  showBreadcrumbs = true,
  contentClassName = "",
  headerClassName = "",
  allowDesktopCollapse = true,
}: AppShellProps) {
  const showSidebar = sidebarMode !== "hidden";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(sidebarDefaultCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const hasTopBar = !!topBarSlot;

  const containerPad = useMemo(() => (hasTopBar ? "border-t hi5-border" : ""), [hasTopBar]);

  return (
    <div className="min-h-dvh flex flex-col">
      {/* ===== Sticky header ===== */}
      <header className={["sticky top-0 z-40 shrink-0 isolate", headerClassName].join(" ")}>
        <div className="hi5-panel border-b hi5-border">
          <div className="h-14 px-3 sm:px-4 flex items-center gap-2">
            {/* Hamburger - mobile */}
            {showSidebar ? (
              <button
                type="button"
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={18} />
              </button>
            ) : null}

            {/* Sidebar collapse - desktop */}
            {showSidebar && allowDesktopCollapse ? (
              <button
                type="button"
                className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0"
                onClick={() => setSidebarCollapsed((v) => !v)}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            ) : null}

            <Link href={homeHref} className="font-semibold tracking-tight whitespace-nowrap text-sm">
              {title}
            </Link>

            {headerLeftSlot ? <div className="ml-2 hidden sm:flex items-center">{headerLeftSlot}</div> : null}

            <div className="flex-1" />

            {headerRightSlot ? <div className="flex items-center gap-1.5">{headerRightSlot}</div> : null}
          </div>

          {/* Optional top bar row (tabs/filters/whatever) */}
          {hasTopBar ? (
            <div className={["px-2", containerPad].join(" ")}>
              {topBarSlot}
            </div>
          ) : null}
        </div>
      </header>

      {/* ===== Body ===== */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        {showSidebar ? (
          <aside
            className={[
              "hidden md:flex flex-col border-r hi5-border shrink-0 transition-all duration-200",
              sidebarCollapsed ? "w-[60px]" : "w-64",
            ].join(" ")}
          >
            <div className="p-2 space-y-0.5">
              {navItems.map((item) => (
                <NavItem key={item.href} item={item} collapsed={sidebarCollapsed} />
              ))}
            </div>
          </aside>
        ) : null}

        {/* Mobile drawer */}
        {showSidebar && drawerOpen ? (
          <div className="md:hidden fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute top-0 left-0 h-full w-[85vw] max-w-[320px] hi5-panel border-r hi5-border">
              <div className="flex items-center justify-between p-4 border-b hi5-border">
                <div className="font-semibold text-sm">Navigation</div>
                <button
                  type="button"
                  className="h-9 w-9 rounded-xl border hi5-border flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-2 space-y-0.5">
                {navItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    collapsed={false}
                    onClick={() => setDrawerOpen(false)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Main */}
        <main className={["flex-1 min-w-0 p-3 sm:p-4 md:p-5", contentClassName].join(" ")}>
          {showBreadcrumbs ? <ShellBreadcrumbs className="mb-3" /> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
