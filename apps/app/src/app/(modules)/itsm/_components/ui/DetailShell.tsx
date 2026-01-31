"use client";

import type { ReactNode } from "react";

export default function DetailShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="w-full space-y-3">
      <div className="hi5-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold truncate">{title}</div>
            {subtitle ? <div className="text-xs opacity-70 mt-1">{subtitle}</div> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </div>

      {children}
    </div>
  );
}
