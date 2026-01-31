"use client";

import { ReactNode, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import TabsBar from "./tabs-bar";
import { tabsApi } from "./tabs-store";

export const CHROME_METRICS = {
  TOPBAR_H: 56,
  TABBAR_H: 44,
};

function titleFromPath(pathname: string): string | null {
  const p = pathname.replace(/\/$/, "");

  // ITSM
  if (p === "/itsm") return "ITSM · Dashboard";
  if (p === "/itsm/incidents") return "ITSM · Incidents";
  if (p.startsWith("/itsm/incidents/")) return `ITSM · Incident ${p.split("/").pop()}`;
  if (p === "/itsm/requests") return "ITSM · Requests";
  if (p.startsWith("/itsm/requests/")) return `ITSM · Request ${p.split("/").pop()}`;
  if (p === "/itsm/changes") return "ITSM · Changes";
  if (p.startsWith("/itsm/changes/")) return `ITSM · Change ${p.split("/").pop()}`;
  if (p === "/itsm/knowledge") return "ITSM · Knowledge";
  if (p.startsWith("/itsm/knowledge/")) return `ITSM · Article ${p.split("/").pop()}`;
  if (p === "/itsm/assets") return "ITSM · Assets";
  if (p.startsWith("/itsm/assets/")) return `ITSM · Asset ${p.split("/").pop()}`;
  if (p === "/itsm/settings") return "ITSM · Settings";

  // Control (future-friendly placeholders)
  if (p === "/control") return "Control · Dashboard";
  if (p.startsWith("/control/")) return `Control · ${p.split("/")[2] ?? "Page"}`;

  // Admin / Selfservice / Settings / Apps
  if (p === "/admin") return "Admin";
  if (p === "/selfservice") return "Self Service";
  if (p === "/settings") return "Settings";
  if (p === "/apps") return null; // no tab for landing
  if (p === "/login" || p === "/no-access") return null;

  // Default: no tabs for unknown routes
  return null;
}

function shouldTab(pathname: string) {
  const p = pathname.replace(/\/$/, "");
  // Only tab inside module areas
  return (
    p.startsWith("/itsm") ||
    p.startsWith("/control") ||
    p.startsWith("/admin") ||
    p.startsWith("/selfservice") ||
    p.startsWith("/settings")
  );
}

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Auto-open tabs on route changes
  useEffect(() => {
    if (!pathname) return;
    if (!shouldTab(pathname)) return;

    const title = titleFromPath(pathname);
    if (!title) return;

    tabsApi.open({
      id: pathname,
      title,
      href: pathname,
      closable: pathname !== "/itsm" && pathname !== "/control" && pathname !== "/admin" && pathname !== "/selfservice",
    });
  }, [pathname]);

  const topOffset = useMemo(() => CHROME_METRICS.TOPBAR_H + CHROME_METRICS.TABBAR_H, []);

  return (
    <div className="w-full">
      {/* Top toolbar should already be in your app/layout.tsx or global header.
          We only render the tabs bar here to guarantee it's everywhere. */}
      <div className="fixed left-0 right-0 z-[60]" style={{ top: CHROME_METRICS.TOPBAR_H }}>
        <TabsBar />
      </div>

      {/* Content below top+tabs */}
      <div style={{ paddingTop: topOffset }}>{children}</div>
    </div>
  );
}