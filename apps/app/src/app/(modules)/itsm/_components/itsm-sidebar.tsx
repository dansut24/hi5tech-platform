"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  TriangleAlert,
  FileText,
  GitPullRequest,
  BookOpen,
  Monitor,
  Settings,
} from "lucide-react";

export type SidebarMode = "pinned" | "collapsed" | "hidden";
const STORAGE_KEY = "hi5_itsm_sidebar_mode_v3";

type Item = { href: string; label: string; icon: LucideIcon; hint?: string; short?: string };

type Props = {
  mode?: SidebarMode;
  onCycleMode?: () => void;
  onRequestHide?: () => void;
};

function isActive(pathname: string, href: string) {
  if (href === "/itsm") return pathname === "/itsm";
  return pathname.startsWith(href);
}

function readMode(): SidebarMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "pinned" || raw === "collapsed" || raw === "hidden") return raw;
  } catch {}
  return "pinned";
}

export default function ITSMSidebar({ mode: modeProp, onCycleMode, onRequestHide }: Props) {
  const pathname = usePathname();

  // If parent drives mode, use it. Otherwise use internal mode via localStorage.
  const [internalMode, setInternalMode] = useState<SidebarMode>("pinned");
  const mode: SidebarMode = modeProp ?? internalMode;

  useEffect(() => {
    if (modeProp) return; // controlled by parent

    setInternalMode(readMode());
    function onSet(e: any) {
      const next = e?.detail as SidebarMode;
      if (next === "pinned" || next === "collapsed" || next === "hidden") setInternalMode(next);
    }
    window.addEventListener(`${STORAGE_KEY}:set`, onSet as any);
    return () => window.removeEventListener(`${STORAGE_KEY}:set`, onSet as any);
  }, [modeProp]);

  const groups = useMemo(() => {
    const workspace: Item[] = [
      { href: "/itsm", label: "Dashboard", icon: LayoutDashboard, hint: "Overview" },
      { href: "/itsm/incidents", label: "Incidents", icon: TriangleAlert, hint: "Break/fix" },
      { href: "/itsm/requests", label: "Requests", icon: FileText, hint: "Catalogue" },
      { href: "/itsm/changes", label: "Changes", icon: GitPullRequest, hint: "CAB" },
    ];
    const knowledge: Item[] = [
      { href: "/itsm/knowledge", label: "Knowledge", icon: BookOpen, hint: "Articles" },
      { href: "/itsm/assets", label: "Assets", icon: Monitor, hint: "Inventory" },
    ];
    const admin: Item[] = [{ href: "/itsm/settings", label: "Settings", icon: Settings, hint: "Prefs" }];
    return { workspace, knowledge, admin };
  }, []);

  const allItems = useMemo(() => [...groups.workspace, ...groups.knowledge, ...groups.admin], [groups]);

  // COLLAPSED: icons with label below (no cards)
  if (mode === "collapsed") {
    return (
      <div className="h-full w-full">
        <div className="h-full w-full hi5-panel px-1 py-2">
          <div className="flex flex-col items-center gap-2">
            {allItems.map((it) => {
              const active = isActive(pathname, it.href);
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={[
                    "w-full rounded-2xl border hi5-border py-2",
                    "flex flex-col items-center justify-center gap-1",
                    active ? "bg-[rgba(var(--hi5-accent),0.14)] border-[rgba(var(--hi5-accent),0.30)]" : "bg-[rgba(var(--hi5-card),0.18)]",
                    "hover:bg-black/5 dark:hover:bg-white/5 transition",
                  ].join(" ")}
                  title={it.label}
                >
                  <Icon className="h-5 w-5 opacity-90" />
                  <div className="text-[10px] leading-tight opacity-90 text-center w-full px-1 break-words">
                    {it.label}
                  </div>
                </Link>
              );
            })}
          </div>

          {(onCycleMode || onRequestHide) ? (
            <div className="mt-2 grid gap-2">
              {onCycleMode ? (
                <button
                  type="button"
                  onClick={onCycleMode}
                  className="w-full rounded-2xl border hi5-border py-2 text-xs opacity-90 hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  Toggle
                </button>
              ) : null}
              {onRequestHide ? (
                <button
                  type="button"
                  onClick={onRequestHide}
                  className="w-full rounded-2xl border hi5-border py-2 text-xs opacity-90 hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  Hide
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // PINNED: card links only
  function CardLink(it: Item) {
    const active = isActive(pathname, it.href);
    const Icon = it.icon;

    return (
      <Link
        key={it.href}
        href={it.href}
        className={[
          "rounded-2xl border hi5-border px-3 py-3",
          "hover:bg-black/5 dark:hover:bg-white/5 transition",
          "flex items-center gap-3",
          active ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.30)]" : "bg-[rgba(var(--hi5-card),0.18)]",
        ].join(" ")}
      >
        <Icon className="h-5 w-5 opacity-85 shrink-0" />
        <div className="min-w-0">
          <div className={["text-sm truncate", active ? "hi5-accent font-semibold" : "opacity-90"].join(" ")}>
            {it.label}
          </div>
          {it.hint ? <div className="text-xs opacity-65 truncate">{it.hint}</div> : null}
        </div>
      </Link>
    );
  }

  return (
    <div className="h-full w-full">
      <div className="h-full w-full hi5-panel px-3 py-3">
        <div className="text-[11px] uppercase tracking-wide opacity-60 mb-2">Workspace</div>
        <div className="grid gap-2">{groups.workspace.map(CardLink)}</div>

        <div className="text-[11px] uppercase tracking-wide opacity-60 mt-5 mb-2">Knowledge</div>
        <div className="grid gap-2">{groups.knowledge.map(CardLink)}</div>

        <div className="text-[11px] uppercase tracking-wide opacity-60 mt-5 mb-2">Admin</div>
        <div className="grid gap-2">{groups.admin.map(CardLink)}</div>
      </div>
    </div>
  );
}
