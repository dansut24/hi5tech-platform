"use client";

import { create } from "zustand";

export type OpenTab = {
  key: string;
  title: string;
  href: string;
};

type TabsState = {
  tabs: OpenTab[];
  activeKey: string | null;
  addTab: (tab: OpenTab) => void;
  removeTab: (key: string) => void;
  setActive: (key: string) => void;
};

export const useTabsStore = create<TabsState>((set) => ({
  tabs: [],
  activeKey: null,

  addTab: (tab) =>
    set((state) => {
      const existing = state.tabs.some((t) => t.key === tab.key);
      if (existing) return { activeKey: tab.key };
      return { tabs: [...state.tabs, tab], activeKey: tab.key };
    }),

  removeTab: (key) =>
    set((state) => {
      const tabs = state.tabs.filter((t) => t.key !== key);
      const activeKey =
        state.activeKey === key ? (tabs.length ? tabs[tabs.length - 1].key : null) : state.activeKey;
      return { tabs, activeKey };
    }),

  setActive: (key) => set({ activeKey: key }),
}));