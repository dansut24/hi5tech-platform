"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import ItsmHeader from "./ItsmHeader";
import ItsmTabs from "./ItsmTabs";
import ItsmSidebar from "./ItsmSidebar";
import { useItsmUiStore } from "../_state/itsm-ui-store";

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

type Props = {
  children: ReactNode;
  allowedModules: ModuleKey[];
  tenantLabel: string | null;
};

function labelFromPath(pathname: string) {
  if (pathname === "/itsm") return "Dashboard";
  if (pathname === "/itsm/new-tab") return "New Tab";

  // crude defaults (you can improve later with route metadata)
  if (pathname.startsWith("/itsm/incidents")) return "Incidents";
  if (pathname.startsWith("/itsm/problems")) return "Problems";
  if (pathname.startsWith("/itsm/changes")) return "Changes";
  if (pathname.startsWith("/itsm/assets")) return "Assets";
  if (pathname.startsWith("/itsm/settings")) return "Settings";

  const last = pathname.split("/").filter(Boolean).slice(-1)[0] ?? "Tab";
  return last.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function keyFromPath(pathname: string) {
  // stable key for tab list
  return pathname;
}

export default function ItsmShell({ children, allowedModules, tenantLabel }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const sidebarMode = useItsmUiStore((s) => s.sidebarMode);
  const sidebarWidth = useItsmUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useItsmUiStore((s) => s.setSidebarWidth);

  const tabs = useItsmUiStore((s) => s.tabs);
  const upsertTab = useItsmUiStore((s) => s.upsertTab);
  const closeTab = useItsmUiStore((s) => s.closeTab);

  // Ensure current route is represented as a tab (except dashboard which is always there)
  useEffect(() => {
    if (!pathname?.startsWith("/itsm")) return;

    if (pathname === "/itsm") {
      upsertTab({ key: "dashboard", href: "/itsm", label: "Dashboard", closable: false });
      return;
    }

    upsertTab({
      key: keyFromPath(pathname),
      href: pathname,
      label: labelFromPath(pathname),
      closable: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Desktop grid column width based on mode
  const sidebarCol = useMemo(() => {
    if (sidebarMode === "hidden") return "0px";
    if (sidebarMode === "collapsed") return "80px";
    if (sidebarMode === "fixed") return "280px";
    return `${sidebarWidth}px`; // resizable
  }, [sidebarMode, sidebarWidth]);

  // Drag to resize
  const dragRef = useRef<{ dragging: boolean; startX: number; startW: number } | null>(null);

  function onDragStart(e: React.PointerEvent) {
    if (sidebarMode !== "resizable") return;
    const startX = e.clientX;
    const startW = sidebarWidth;
    dragRef.current = { dragging: true, startX, startW };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onDragMove(e: React.PointerEvent) {
    if (sidebarMode !== "resizable") return;
    const st = dragRef.current;
    if (!st?.dragging) return;
    const dx = e.clientX - st.startX;
    setSidebarWidth(st.startW + dx);
  }

  function onDragEnd() {
    if (!dragRef.current) return;
    dragRef.current.dragging = false;
  }

  // Close tab behavior: if you close the current tab, bounce to dashboard
  function handleCloseTab(tabKey: string) {
    closeTab(tabKey);
    if (pathname === tabKey) {
      router.push("/itsm");
    }
  }

  return (
    <div className="min-h-dvh">
      {/* Header + Tabs (fixed) */}
      <ItsmHeader allowedModules={allowedModules} tenantLabel={tenantLabel} />
      <ItsmTabs
        tabs={tabs}
        activeHref={pathname}
        onCloseTab={handleCloseTab}
      />

      {/* Body */}
      <div
        className="w-full"
        style={{
          // Header (56px) + tabs (44px) = 100px; keep content below
          paddingTop: 100,
        }}
      >
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: `${sidebarCol} 1fr`,
            minHeight: "calc(100dvh - 100px)",
          }}
        >
          {/* Sidebar */}
          <div className="relative">
            <ItsmSidebar />

            {/* Resize handle (desktop only) */}
            {sidebarMode === "resizable" ? (
              <div
                onPointerDown={onDragStart}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
                className="hidden md:block absolute top-0 right-0 h-full w-2 cursor-col-resize"
                aria-label="Resize sidebar"
                title="Drag to resize"
              />
            ) : null}
          </div>

          {/* Main content */}
          <main className="min-w-0 p-3 sm:p-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
