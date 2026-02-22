“use client”;

import type { ReactNode } from “react”;
import { useEffect, useMemo, useRef, useState } from “react”;
import Link from “next/link”;
import { usePathname } from “next/navigation”;
import {
Menu,
Bell,
Plus,
Pin,
X,
MoreHorizontal,
LayoutDashboard,
AlertCircle,
AlertTriangle,
GitBranch,
Monitor,
BookOpen,
Settings,
ChevronLeft,
ChevronRight,
ChevronRight as Chevron,
User,
} from “lucide-react”;

import { useItsmUiStore } from “../_state/itsm-ui-store”;

type Props = { children: ReactNode };

function tabTitleFromPath(pathname: string) {
if (pathname === “/itsm”) return “Dashboard”;
if (pathname.startsWith(”/itsm/new-tab”)) return “New Tab”;
if (pathname.startsWith(”/itsm/incidents/new”)) return “New Incident”;
if (pathname.startsWith(”/itsm/incidents/”)) return “Incident”;
if (pathname.startsWith(”/itsm/incidents”)) return “Incidents”;
if (pathname.startsWith(”/itsm/settings”)) return “Settings”;
return “Page”;
}

function tabIdFromPath(pathname: string) {
if (pathname === “/itsm”) return “dashboard”;
if (pathname.startsWith(”/itsm/new-tab”)) return “new-tab”;
if (pathname.startsWith(”/itsm/incidents/new”)) return “incidents-new”;
if (pathname.startsWith(”/itsm/incidents/”)) return `incident:${pathname}`;
return pathname;
}

type MenuState = { open: true; tabId: string; x: number; y: number } | { open: false };

const NAV_ITEMS = [
{ href: “/itsm”, label: “Dashboard”, icon: <LayoutDashboard size={16} />, exact: true },
{ href: “/itsm/incidents”, label: “Incidents”, icon: <AlertCircle size={16} /> },
{ href: “/itsm/problems”, label: “Problems”, icon: <AlertTriangle size={16} /> },
{ href: “/itsm/changes”, label: “Changes”, icon: <GitBranch size={16} /> },
{ href: “/itsm/assets”, label: “Assets”, icon: <Monitor size={16} /> },
{ href: “/itsm/knowledge”, label: “Knowledge”, icon: <BookOpen size={16} /> },
{ href: “/itsm/settings”, label: “Settings”, icon: <Settings size={16} /> },
];

function NavItem({
item,
collapsed,
onClick,
}: {
item: (typeof NAV_ITEMS)[0];
collapsed: boolean;
onClick?: () => void;
}) {
const pathname = usePathname();
const active = item.exact
? pathname === item.href
: pathname === item.href || pathname.startsWith(item.href + “/”);

return (
<Link
href={item.href}
onClick={onClick}
title={collapsed ? item.label : undefined}
className={[
“flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition”,
collapsed ? “justify-center px-2” : “”,
active
? “bg-[rgba(var(–hi5-accent),0.14)] border border-[rgba(var(–hi5-accent),0.28)] text-[rgb(var(–hi5-accent))]”
: “hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 border border-transparent”,
].join(” “)}
>
<span className="shrink-0">{item.icon}</span>
{!collapsed && <span className="truncate font-medium">{item.label}</span>}
</Link>
);
}

function Breadcrumb() {
const pathname = usePathname();
const segments = pathname.split(”/”).filter(Boolean);
if (segments.length <= 1) return null;

const crumbs: { label: string; href: string }[] = [];
let current = “”;
for (const seg of segments) {
current += `/${seg}`;
const label = seg.replace(/-/g, “ “).replace(/\b\w/g, (c) => c.toUpperCase());
crumbs.push({ label, href: current });
}

return (
<div className="flex items-center gap-1 text-xs opacity-50 mb-3 flex-wrap">
{crumbs.map((c, i) => (
<span key={c.href} className="flex items-center gap-1">
{i > 0 && <Chevron size={11} className="opacity-50" />}
{i === crumbs.length - 1 ? (
<span className="font-medium opacity-100 text-[rgb(var(--hi5-fg))]">{c.label}</span>
) : (
<Link href={c.href} className="hover:opacity-100 transition">
{c.label}
</Link>
)}
</span>
))}
</div>
);
}

export default function ItsmShell({ children }: Props) {
const pathname = usePathname();
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

const {
sidebarMode,
sidebarDrawerOpen,
toggleDrawer,
closeDrawer,
tabs,
upsertTab,
closeTab,
setTabs,
} = useItsmUiStore();

// Track current route as tab
useEffect(() => {
if (!pathname?.startsWith(”/itsm”)) return;
if (pathname === “/itsm”) {
upsertTab({ id: “dashboard”, href: “/itsm”, title: “Dashboard”, pinned: true });
return;
}
const id = tabIdFromPath(pathname);
const title = tabTitleFromPath(pathname);
upsertTab({ id, href: pathname, title });
}, [pathname, upsertTab]);

// Tab strip scrolling
const stripRef = useRef<HTMLDivElement | null>(null);
const tabEls = useRef<Map<string, HTMLDivElement>>(new Map());
const prevTabsSigRef = useRef<string>(””);

useEffect(() => {
const sig = (tabs ?? []).map((t) => t.id).join(”|”);
const prevSig = prevTabsSigRef.current;
prevTabsSigRef.current = sig;
const activeId = tabIdFromPath(pathname || “/itsm”);
const el = tabEls.current.get(activeId) || tabEls.current.get((tabs ?? []).at(-1)?.id || “”);
if (!el) return;
if (sig !== prevSig || pathname) {
try { el.scrollIntoView({ behavior: “smooth”, inline: “nearest”, block: “nearest” }); } catch { /* */ }
}
}, [tabs, pathname]);

// Context menu for tabs
const [menu, setMenu] = useState<MenuState>({ open: false });
const longPressTimerRef = useRef<number | null>(null);

function closeMenu() { setMenu({ open: false }); }
function openMenuAt(tabId: string, x: number, y: number) { setMenu({ open: true, tabId, x, y }); }
function onTabContextMenu(e: React.MouseEvent, tabId: string) { e.preventDefault(); e.stopPropagation(); openMenuAt(tabId, e.clientX, e.clientY); }
function startLongPress(tabId: string, x: number, y: number) { longPressTimerRef.current = window.setTimeout(() => openMenuAt(tabId, x, y), 450); }
function cancelLongPress() { if (longPressTimerRef.current) { window.clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } }

function togglePin(tabId: string) {
const list = […(tabs ?? [])];
const idx = list.findIndex((t) => t.id === tabId);
if (idx < 0) return;
const t = list[idx];
const next = { …t, pinned: !t.pinned };
if (tabId === “dashboard”) next.pinned = true;
list[idx] = next;
const dashboard = list.find((x) => x.id === “dashboard”);
const others = list.filter((x) => x.id !== “dashboard”);
const reordered = […(dashboard ? [{ …dashboard, pinned: true }] : []), …others.filter((x) => x.pinned), …others.filter((x) => !x.pinned)];
setTabs(reordered);
closeMenu();
}

function closeOthers(tabId: string) {
const list = […(tabs ?? [])];
const keep = new Set<string>([“dashboard”, tabId]);
const next = list.filter((t) => keep.has(t.id) || t.pinned);
const dashIdx = next.findIndex((t) => t.id === “dashboard”);
if (dashIdx >= 0) next[dashIdx] = { …next[dashIdx], pinned: true };
setTabs(next);
closeMenu();
}

useEffect(() => { closeMenu(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
useEffect(() => {
if (!menu.open) return;
function onGlobal() { if (menu.open) closeMenu(); }
window.addEventListener(“click”, onGlobal, { capture: true });
window.addEventListener(“scroll”, onGlobal, { capture: true, passive: true });
return () => {
window.removeEventListener(“click”, onGlobal, { capture: true } as any);
window.removeEventListener(“scroll”, onGlobal, { capture: true } as any);
};
}, [menu.open]);

const showSidebar = sidebarMode !== “hidden”;

return (
<div className="min-h-dvh flex flex-col">
{/* ===== Sticky header ===== */}
<div className="sticky top-0 z-40 hi5-panel border-b hi5-border shrink-0">
{/* Header row */}
<div className="h-14 px-3 sm:px-4 flex items-center gap-3">
{/* Hamburger — mobile */}
<button
type="button"
className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0"
onClick={toggleDrawer}
aria-label="Open navigation"
>
<Menu size={18} />
</button>

```
      {/* Sidebar collapse — desktop */}
      {showSidebar && (
        <button
          type="button"
          className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0"
          onClick={() => setSidebarCollapsed((v) => !v)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}

      <Link href="/itsm" className="font-semibold tracking-tight whitespace-nowrap text-sm">
        Hi5Tech ITSM
      </Link>

      {/* Search */}
      <div className="flex-1 min-w-0">
        <div className="hi5-input flex items-center gap-2 px-3 h-10 rounded-xl border hi5-border">
          <input
            className="bg-transparent outline-none w-full text-sm"
            placeholder="Search incidents, users, assets..."
            inputMode="search"
          />
        </div>
      </div>

      {/* Right icons */}
      <div className="flex items-center gap-1.5">
        <Link
          href="/itsm/new-tab"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition"
          aria-label="New tab"
          title="New tab"
        >
          <Plus size={18} />
        </Link>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition"
          aria-label="Profile"
        >
          <User size={18} />
        </button>
      </div>
    </div>

    {/* ===== Tabs bar ===== */}
    <div className="border-t hi5-border px-2 relative">
      <div className="h-11 flex items-center gap-2">
        <div
          ref={stripRef}
          className="relative flex-1 flex items-center gap-1.5 flex-nowrap overflow-x-auto overflow-y-hidden no-scrollbar"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {(tabs ?? []).map((t) => {
            const isActive = pathname === t.href || (t.id !== "dashboard" && pathname === t.id);
            const canClose = !t.pinned && t.id !== "dashboard";

            return (
              <div
                key={t.id}
                ref={(el) => { if (el) tabEls.current.set(t.id, el); else tabEls.current.delete(t.id); }}
                onContextMenu={(e) => onTabContextMenu(e, t.id)}
                onTouchStart={(e) => { const touch = e.touches?.[0]; if (touch) startLongPress(t.id, touch.clientX, touch.clientY); }}
                onTouchEnd={cancelLongPress}
                onTouchCancel={cancelLongPress}
                onTouchMove={cancelLongPress}
                className={[
                  "shrink-0 inline-flex items-center h-8 px-3 rounded-lg border hi5-border",
                  "min-w-[100px] max-w-[55vw] md:min-w-0 md:max-w-[16vw]",
                  isActive
                    ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.30)]"
                    : "opacity-80 hover:bg-black/5 dark:hover:bg-white/5",
                ].join(" ")}
              >
                <div className="flex items-center gap-1.5 min-w-0 w-full">
                  {t.pinned ? <Pin size={11} className="opacity-50 flex-none" /> : null}
                  <Link href={t.href} className="min-w-0 text-xs font-medium truncate">
                    {t.title}
                  </Link>
                  {canClose ? (
                    <button
                      type="button"
                      className="flex-none text-xs opacity-60 hover:opacity-100 ml-auto pl-1"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeTab(t.id); }}
                      aria-label="Close tab"
                    >
                      <X size={12} />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div className="pointer-events-none md:hidden absolute left-0 top-0 h-full w-5 bg-gradient-to-r from-[rgba(var(--hi5-bg),1)] to-transparent" />
          <div className="pointer-events-none md:hidden absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-[rgba(var(--hi5-bg),1)] to-transparent" />
        </div>

        <Link
          href="/itsm/new-tab"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border hi5-border hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
          aria-label="New tab"
        >
          <Plus size={14} />
        </Link>
      </div>

      {/* Context menu */}
      {menu.open ? (
        <div className="fixed inset-0 z-[60]" onClick={closeMenu}>
          <div
            className="absolute hi5-panel border hi5-border rounded-xl shadow-lg p-2 min-w-[200px]"
            style={{ left: Math.min(menu.x, window.innerWidth - 220), top: Math.min(menu.y, window.innerHeight - 140) }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-xs opacity-70 flex items-center justify-between">
              <span>Tab options</span>
              <MoreHorizontal size={16} className="opacity-60" />
            </div>
            <button type="button" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sm" onClick={() => closeOthers(menu.tabId)}>
              <X size={16} className="opacity-70" /> Close others
            </button>
            <button type="button" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sm" onClick={() => togglePin(menu.tabId)}>
              <Pin size={16} className="opacity-70" /> Pin / unpin
            </button>
            <div className="pt-1">
              <button type="button" className="w-full px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sm opacity-80" onClick={closeMenu}>
                Close menu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  </div>

  {/* ===== Body ===== */}
  <div className="flex flex-1 min-h-0">
    {/* Desktop sidebar */}
    {showSidebar && (
      <aside
        className={[
          "hidden md:flex flex-col border-r hi5-border shrink-0 transition-all duration-200",
          sidebarCollapsed ? "w-[60px]" : "w-64",
        ].join(" ")}
      >
        <div className="p-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} collapsed={sidebarCollapsed} />
          ))}
        </div>
      </aside>
    )}

    {/* Mobile overlay drawer */}
    {sidebarDrawerOpen ? (
      <div className="md:hidden fixed inset-0 z-50">
        <button
          type="button"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          aria-label="Close navigation"
          onClick={closeDrawer}
        />
        <div className="absolute top-0 left-0 h-full w-[85vw] max-w-[320px] hi5-panel border-r hi5-border">
          <div className="flex items-center justify-between p-4 border-b hi5-border">
            <div className="font-semibold text-sm">Navigation</div>
            <button type="button" className="h-9 w-9 rounded-xl border hi5-border flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition" onClick={closeDrawer} aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <div className="p-2 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.href} item={item} collapsed={false} onClick={closeDrawer} />
            ))}
          </div>
        </div>
      </div>
    ) : null}

    {/* Main content */}
    <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-5">
      <Breadcrumb />
      {children}
    </main>
  </div>
</div>
```

);
}
