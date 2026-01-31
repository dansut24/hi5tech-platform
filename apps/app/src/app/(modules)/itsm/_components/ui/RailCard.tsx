"use client";

import type { ReactNode } from "react";

export default function RailCard({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="hi5-card p-4">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className="text-sm opacity-90">{children}</div>
    </div>
  );
}
