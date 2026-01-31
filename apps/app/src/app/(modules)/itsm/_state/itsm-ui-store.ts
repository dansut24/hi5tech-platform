"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SidebarMode = "fixed" | "collapsed" | "hidden";

export type ItsmTab = {
  id: string;
  title: string;
  href: string;
  pinned?: boolean; // use for Dashboard
};

type State = {
  // Sidebar
  sidebarMode: SidebarMode;
  sidebarWidth: number; // only relevant for "fixed"
  sidebarDrawerOpen: boolean; // mobile / hidden sidebar drawer state

  setSidebarMode: (mode: SidebarMode) => void;
  setSidebarWidth: (w: number) => void;

  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  // Tabs
  tabs: ItsmTab[];
  setTabs: (tabs: ItsmTab[]) => void;
  upsertTab: (tab: ItsmTab) => void;
  closeTab: (id: string) => void;
  closeOthers: (keepId: string) => void;
};

const DASHBOARD_TAB: ItsmTab = {
  id: "dashboard",
  title: "Dashboard",
  href: "/itsm",
  pinned: true,
};

export const useItsmUiStore = create<State>()(
  persist(
    (set, get) => ({
      // Sidebar (you said fixed 280)
      sidebarMode: "fixed",
      sidebarWidth: 280,
      sidebarDrawerOpen: false,

      setSidebarMode: (mode) => set({ sidebarMode: mode }),
      setSidebarWidth: (w) => {
        // enforce your fixed constraints even if future settings change
        const clamped = Math.max(80, Math.min(280, Math.round(w)));
        set({ sidebarWidth: clamped });
      },

      openDrawer: () => set({ sidebarDrawerOpen: true }),
      closeDrawer: () => set({ sidebarDrawerOpen: false }),
      toggleDrawer: () => set({ sidebarDrawerOpen: !get().sidebarDrawerOpen }),

      // Tabs
      tabs: [DASHBOARD_TAB],

      setTabs: (tabs) => {
        // Always keep Dashboard first and uncloseable
        const dedup = new Map<string, ItsmTab>();
        for (const t of tabs) dedup.set(t.id, t);

        dedup.set(DASHBOARD_TAB.id, DASHBOARD_TAB);

        const list = Array.from(dedup.values());
        list.sort((a, b) => (a.id === "dashboard" ? -1 : b.id === "dashboard" ? 1 : 0));

        set({ tabs: list });
      },

      upsertTab: (tab) => {
        const current = get().tabs ?? [];
        const map = new Map(current.map((t) => [t.id, t]));
        map.set(tab.id, tab);
        map.set(DASHBOARD_TAB.id, DASHBOARD_TAB);

        const list = Array.from(map.values());
        list.sort((a, b) => (a.id === "dashboard" ? -1 : b.id === "dashboard" ? 1 : 0));

        set({ tabs: list });
      },

      closeTab: (id) => {
        if (id === "dashboard") return; // cannot close dashboard
        const next = (get().tabs ?? []).filter((t) => t.id !== id);
        // ensure dashboard always exists
        if (!next.some((t) => t.id === "dashboard")) next.unshift(DASHBOARD_TAB);
        set({ tabs: next });
      },

      closeOthers: (keepId) => {
        const keep = (get().tabs ?? []).filter((t) => t.id === keepId || t.id === "dashboard");
        if (!keep.some((t) => t.id === "dashboard")) keep.unshift(DASHBOARD_TAB);
        // dashboard must stay first
        keep.sort((a, b) => (a.id === "dashboard" ? -1 : b.id === "dashboard" ? 1 : 0));
        set({ tabs: keep });
      },
    }),
    {
      name: "hi5-itsm-ui",
      version: 1,
      partialize: (state) => ({
        sidebarMode: state.sidebarMode,
        sidebarWidth: state.sidebarWidth,
        sidebarDrawerOpen: state.sidebarDrawerOpen,
        tabs: state.tabs,
      }),
    }
  )
);
