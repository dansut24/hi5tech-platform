"use client";

import { ReactNode } from "react";

export default function RailCard({
  title,
  children,
  accent = false,
}: {
  title: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border hi5-border bg-[rgba(var(--hi5-card),0.35)] backdrop-blur-xl overflow-hidden">
      <div className="px-4 py-3 border-b hi5-divider flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        {accent ? <div className="h-2 w-2 rounded-full" style={{ background: "rgba(var(--hi5-accent),0.95)" }} /> : null}
      </div>
      <div className="p-4 text-sm">{children}</div>
    </div>
  );
}