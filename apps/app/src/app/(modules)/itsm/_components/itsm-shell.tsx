"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import TabsBar from "./tabs-bar";
import { useTabsStore, type OpenTab } from "./tabs-store";
import ITSMSidebar, { type SidebarMode } from "./itsm-sidebar";
import CommandPalette, { type CommandItem } from "./command-palette";
import {
  LayoutDashboard,
  TriangleAlert,
  FileText,
  GitPullRequest,
  BookOpen,
  Monitor,
  Settings,
  Plus,
  Palette,
  Search,
  Bell,
  CircleHelp,
  UserCircle2,
  Menu,
} from "lucide-react";

const SIDEBAR_KEY = "hi5_itsm_sidebar_mode_v1";
const TOPBAR_H = 48; // slimmer as requested

function loadSidebarMode(): SidebarMode {
  try {
    const raw = localStorage.getItem(SIDEBAR_KEY);
    if (raw === "pinned" || raw === "collapsed" || raw === "hidden") return raw;
  } catch {}
  return "pinned";
}
function saveSidebarMode(mode: SidebarMode) {
  try { localStorage.setItem(SIDEBAR_KEY, mode); } catch {}
}

function detectTab(pathname: string): OpenTab | null {
  const parts = pathname.split("?")[0].split("/").filter(Boolean);
  if (parts.length < 3) return null;

  const [itsm, area, id] = parts;
  if (itsm !== "itsm") return null;

  const isDetail =
    (area === "incidents" && id) ||
    (area === "requests" && id) ||
    (area === "changes" && id) ||
    (area === "assets" && id) ||
    (area === "knowledge" && id);

  if (!isDetail) return null;

  const key = `${area}:${id}`;
  const title =
    area === "incidents" ? `Incident ${id}` :
    area === "requests"  ? `Request ${id}` :
    area === "changes"   ? `Change ${id}` :
    area === "assets"    ? `Asset ${id}` :
    area === "knowledge" ? `Article ${id}` :
    `${area} ${id}`;

  return { key, title, href: `/${parts.join("/")}` };
}

function IconButton({ icon: Icon, title, onClick }: { icon: any; title: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hi5-chip w-9 h-9 grid place-items-center hover:bg-black/5 dark:hover:bg-white/5 transition"
      title={title}
      aria-label={title}
    >
      <Icon className="h-4 w-4 opacity-75" />
    </button>
  );
}

export default function ITSMShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { addTab, setActive, activeKey, tabs, removeTab } = useTabsStore();
  const maybeTab = useMemo(() => detectTab(pathname), [pathname]);

  const [mode, setMode] = useState<SidebarMode>("pinned");

  useEffect(() => { setMode(loadSidebarMode()); }, []);

  useEffect(() => {
    if (!maybeTab) return;
    addTab(maybeTab);
    setActive(maybeTab.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maybeTab?.key]);

  function cycleMode() {
    const next: SidebarMode = mode === "pinned" ? "collapsed" : mode === "collapsed" ? "hidden" : "pinned";
    setMode(next);
    saveSidebarMode(next);
  }

  function onSelectTab(key: string) {
    const t = tabs.find((x) => x.key === key);
    if (!t) return;
    setActive(key);
    router.push(t.href);
  }
  function onCloseTab(key: string) {
    removeTab(key);
    const remaining = tabs.filter((t) => t.key !== key);
    if (remaining.length) {
      const next = remaining[remaining.length - 1];
      setActive(next.key);
      router.push(next.href);
    } else {
      router.push("/itsm");
    }
  }

  const sidebarWidth =
    mode === "pinned" ? 360 :
    mode === "collapsed" ? 240 :
    0;

  const commands: CommandItem[] = useMemo(() => ([
    { id: "nav:dash", group: "Navigate", label: "Dashboard", icon: LayoutDashboard, keywords: ["itsm", "home"], run: () => router.push("/itsm") },
    { id: "nav:inc", group: "Navigate", label: "Incidents", icon: TriangleAlert, keywords: ["tickets", "issues", "inc"], run: () => router.push("/itsm/incidents") },
    { id: "nav:req", group: "Navigate", label: "Requests", icon: FileText, keywords: ["service requests", "sr"], run: () => router.push("/itsm/requests") },
    { id: "nav:chg", group: "Navigate", label: "Changes", icon: GitPullRequest, keywords: ["cab", "change"], run: () => router.push("/itsm/changes") },
    { id: "nav:kb",  group: "Navigate", label: "Knowledge Base", icon: BookOpen, keywords: ["kb", "articles"], run: () => router.push("/itsm/knowledge") },
    { id: "nav:assets", group: "Navigate", label: "Assets", icon: Monitor, keywords: ["devices", "inventory"], run: () => router.push("/itsm/assets") },
    { id: "nav:settings", group: "Navigate", label: "Settings", icon: Settings, keywords: ["preferences"], run: () => router.push("/itsm/settings") },

    { id: "act:newinc", group: "Actions", label: "New incident", icon: Plus, shortcut: "N I", keywords: ["create incident"], run: () => router.push("/itsm/incidents") },
    { id: "act:newreq", group: "Actions", label: "New request", icon: Plus, shortcut: "N R", keywords: ["create request"], run: () => router.push("/itsm/requests") },
    { id: "act:theme", group: "Actions", label: "Theme settings", icon: Palette, keywords: ["dark", "light", "accent"], run: () => router.push("/itsm/settings/theme") },
  ]), [router]);

  return (
    <div className="hi5-bg min-h-dvh w-full">
      <CommandPalette items={commands} />

      {/* Slim Topbar */}
      <div
        className="fixed left-0 right-0 top-0 z-50 hi5-topbar"
        style={{ height: TOPBAR_H }}
      >
        <div className="h-full flex items-center gap-2 px-3">
          <button
            type="button"
            onClick={cycleMode}
            className="hi5-chip w-9 h-9 grid place-items-center hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="Menu"
            aria-label="Menu"
          >
            <Menu className="h-4 w-4 opacity-80" />
          </button>

          {/* Tabs (fit + overflow) */}
          <div className="min-w-0 flex-1">
            <TabsBar tabs={tabs} activeKey={activeKey} onSelect={onSelectTab} onClose={onCloseTab} />
          </div>

          {/* Search in topbar */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("hi5-command-open"))}
            className="hidden lg:flex items-center gap-2 hi5-input px-3 py-2 text-sm w-[320px] justify-start"
            title="Search (âŒ˜K)"
          >
            <Search className="h-4 w-4 opacity-70" />
            <span className="opacity-70">Searchâ€¦</span>
            <span className="ml-auto text-xs opacity-50">âŒ˜K</span>
          </button>

          {/* Icon strip */}
          <div className="hidden md:flex items-center gap-2">
            <IconButton icon={Bell} title="Notifications" onClick={() => alert("Notifications coming next")} />
            <IconButton icon={CircleHelp} title="Help" onClick={() => alert("Help coming next")} />
            <IconButton icon={Settings} title="Settings" onClick={() => router.push("/itsm/settings")} />
            <IconButton icon={UserCircle2} title="Account" onClick={() => alert("Account menu next")} />
          </div>

          {/* Primary action */}
          <button
            type="button"
            onClick={() => router.push("/itsm/incidents")}
            className="hi5-accent-btn rounded-2xl px-3 py-2 text-sm font-semibold"
            title="New ticket"
          >
            + New
          </button>
        </div>
      </div>

      {/* Fixed sidebar (under topbar) */}
      {mode !== "hidden" ? (
        <aside
          className="hidden lg:block fixed left-0 z-40"
          style={{ top: TOPBAR_H, bottom: 0, width: sidebarWidth }}
        >
          <div className="h-full p-3">
            <div className="hi5-panel h-full overflow-hidden">
              <ITSMSidebar
                mode={mode}
                onCycleMode={cycleMode}
                onRequestHide={() => { setMode("hidden"); saveSidebarMode("hidden"); }}
              />
            </div>
          </div>
        </aside>
      ) : (
        <div className="fixed left-3 z-50" style={{ top: TOPBAR_H + 12 }}>
          <button
            type="button"
            onClick={() => { setMode("pinned"); saveSidebarMode("pinned"); }}
            className="hi5-chip w-12 h-12 grid place-items-center shadow-sm"
            title="Open sidebar"
          >
            <span className="font-bold">
              <span className="hi5-accent">Hi</span><span className="opacity-80">5</span>
            </span>
          </button>
        </div>
      )}

      {/* Content */}
      <main
        className="min-w-0"
        style={{
          paddingTop: TOPBAR_H,
          marginLeft: mode === "hidden" ? 0 : sidebarWidth,
        }}
      >
        <div className="w-full px-4 sm:px-6 py-4 sm:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}