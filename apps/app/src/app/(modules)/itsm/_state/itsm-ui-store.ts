"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SidebarMode = "fixed" | "resizable" | "collapsed" | "hidden";

export type ItsmTab = {
  key: string;       // stable unique key
  href: string;      // route
  label: string;     // tab title
  closable: boolean; // dashboard = false
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type State = {
  // Sidebar
  sidebarMode: SidebarMode;
  sidebarWidth: number; // 80-280 (desktop)
  sidebarDrawerOpen: boolean; // mobile / hidden mode
  setSidebarMode: (mode: SidebarMode) => void;
  setSidebarWidth: (w: number) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  // Tabs
  tabs: ItsmTab[];
  setTabs: (tabs: ItsmTab[]) => void;
  upsertTab: (tab: ItsmTab) => void;
  closeTab: (key: string) => void;
};

const DASH_TAB: ItsmTab = {
  key: "dashboard",
  href: "/itsm",
  label: "Dashboard",
  closable: false,
};

export const useItsmUiStore = create<State>()(
  persist(
    (set, get) => ({
      // BEFORE
      // sidebarMode: "resizable",
      // sidebarWidth: 280,

      // ✅ AFTER
      sidebarMode: "fixed",
      sidebarWidth: 280,

      setSidebarMode: (mode) => set({ sidebarMode: mode }),
      setSidebarWidth: (w) => set({ sidebarWidth: clamp(w, 80, 280) }),
      openDrawer: () => set({ sidebarDrawerOpen: true }),
      closeDrawer: () => set({ sidebarDrawerOpen: false }),
      toggleDrawer: () => set({ sidebarDrawerOpen: !get().sidebarDrawerOpen }),

      tabs: [DASH_TAB],
      setTabs: (tabs) => set({ tabs }),
      upsertTab: (tab) => {
        const current = get().tabs;
        const exists = current.find((t) => t.key === tab.key);
        if (exists) {
          set({
            tabs: current.map((t) => (t.key === tab.key ? { ...t, ...tab } : t)),
          });
          return;
        }
        set({ tabs: [...current, tab] });
      },
      closeTab: (key) => {
        const current = get().tabs;
        const next = current.filter((t) => t.key !== key || t.closable === false);
        set({ tabs: next });
      },
    }),
    {
      name: "hi5-itsm-ui",
      partialize: (s) => ({
        sidebarMode: s.sidebarMode,
        sidebarWidth: s.sidebarWidth,
        tabs: s.tabs,
      }),
    }
  )
);
