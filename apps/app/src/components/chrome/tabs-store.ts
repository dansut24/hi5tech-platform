"use client";

import { useSyncExternalStore } from "react";

export type OpenTab = {
  id: string;
  title: string;
  href: string;
  module?: string;
  closable?: boolean;
  pinned?: boolean;
};

type State = {
  tabs: OpenTab[];
  activeHref: string | null;
};

type Listener = () => void;

const MAX_TABS = 10;

const state: State = {
  tabs: [],
  activeHref: null,
};

const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function normalizeHref(href: string) {
  // Drop trailing slash (except root)
  if (href.length > 1 && href.endsWith("/")) return href.slice(0, -1);
  return href;
}

function upsertTab(tab: OpenTab) {
  const href = normalizeHref(tab.href);
  const idx = state.tabs.findIndex((t) => normalizeHref(t.href) === href);

  if (idx >= 0) {
    state.tabs[idx] = { ...state.tabs[idx], ...tab, href };
  } else {
    state.tabs = [...state.tabs, { ...tab, href }];
    if (state.tabs.length > MAX_TABS) {
      // Trim oldest non-pinned first
      const pinned = state.tabs.filter((t) => t.pinned);
      const nonPinned = state.tabs.filter((t) => !t.pinned);
      state.tabs = [...pinned, ...nonPinned.slice(-Math.max(0, MAX_TABS - pinned.length))];
    }
  }
}

export const tabsApi = {
  getState(): State {
    return state;
  },

  setActive(href: string) {
    state.activeHref = normalizeHref(href);
    emit();
  },

  open(tab: OpenTab) {
    upsertTab(tab);
    state.activeHref = normalizeHref(tab.href);
    emit();
  },

  close(href: string) {
    const nh = normalizeHref(href);
    const idx = state.tabs.findIndex((t) => normalizeHref(t.href) === nh);
    if (idx < 0) return;

    const closingActive = state.activeHref === nh;

    state.tabs = state.tabs.filter((t) => normalizeHref(t.href) !== nh);

    if (closingActive) {
      const next = state.tabs[Math.max(0, idx - 1)] ?? state.tabs[state.tabs.length - 1] ?? null;
      state.activeHref = next ? normalizeHref(next.href) : null;
    }
    emit();
  },

  reset() {
    state.tabs = [];
    state.activeHref = null;
    emit();
  },
};

export function useTabsStore<T>(selector: (s: State) => T) {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
    () => selector(state),
  );
}