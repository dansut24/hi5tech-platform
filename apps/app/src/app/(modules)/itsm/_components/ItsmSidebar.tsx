"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useItsmUiStore } from "../_state/itsm-ui-store";

function Item({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={[
        "block rounded-xl px-3 py-2 text-sm border hi5-border",
        "hover:bg-black/5 dark:hover:bg-white/5 transition",
        active ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.30)]" : "opacity-85",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function ItsmSidebar() {
  const sidebarMode = useItsmUiStore((s) => s.sidebarMode);
  const drawerOpen = useItsmUiStore((s) => s.sidebarDrawerOpen);
  const closeDrawer = useItsmUiStore((s) => s.closeDrawer);

  const hiddenDesktop = sidebarMode === "hidden";
  const collapsed = sidebarMode === "collapsed";

  const content = (
    <div className="h-full p-3 space-y-3">
      <div className="text-xs uppercase tracking-wide opacity-60">
        Navigation
      </div>

      <nav className="space-y-2">
        <Item href="/itsm" label={collapsed ? "🏠" : "Dashboard"} />
        <Item href="/itsm/incidents" label={collapsed ? "🎫" : "Incidents"} />
        <Item href="/itsm/problems" label={collapsed ? "⚠️" : "Problems"} />
        <Item href="/itsm/changes" label={collapsed ? "🛠️" : "Changes"} />
        <Item href="/itsm/assets" label={collapsed ? "💻" : "Assets"} />
        <Item href="/itsm/settings" label={collapsed ? "⚙️" : "Settings"} />
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={[
          "hidden md:block h-full border-r hi5-border hi5-panel",
          hiddenDesktop ? "hidden" : "",
        ].join(" ")}
      >
        {content}
      </aside>

      {/* Mobile drawer overlay */}
      <div className="md:hidden">
        {drawerOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/30"
              aria-label="Close menu"
              onClick={closeDrawer}
            />
            <aside className="fixed z-50 top-14 left-0 w-[85vw] max-w-[320px] h-[calc(100dvh-56px)] hi5-panel border-r hi5-border shadow-lg">
              <div className="p-3 flex items-center justify-between border-b hi5-border">
                <div className="font-semibold">Menu</div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded-xl border hi5-border px-3 py-2 text-sm"
                >
                  Close
                </button>
              </div>
              {content}
            </aside>
          </>
        ) : null}
      </div>
    </>
  );
}
