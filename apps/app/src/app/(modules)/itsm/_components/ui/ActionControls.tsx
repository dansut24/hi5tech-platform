"use client";

import type { ReactNode } from "react";

export function ActionPill({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition"
    >
      {children}
    </button>
  );
}

export function IconChip({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-xl border h-10 w-10 hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition"
    >
      {children}
    </button>
  );
}
