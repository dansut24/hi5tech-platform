"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export default function DetailTabs({
  items,
  activeKey,
  right,
}: {
  items: Array<{ key: string; label: ReactNode; href?: string }>;
  activeKey: string;
  right?: ReactNode;
}) {
  return (
    <div className="hi5-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-2 py-2 border-b hi5-border">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {items.map((it) => {
            const active = it.key === activeKey;
            const cls = [
              "shrink-0 rounded-xl border px-3 py-1.5 text-sm transition",
              "hi5-border hover:bg-black/5 dark:hover:bg-white/5",
              active
                ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.30)] hi5-accent"
                : "opacity-80",
            ].join(" ");

            return it.href ? (
              <Link key={it.key} href={it.href} className={cls}>
                {it.label}
              </Link>
            ) : (
              <div key={it.key} className={cls}>
                {it.label}
              </div>
            );
          })}
        </div>

        {right ? <div className="shrink-0 pr-1">{right}</div> : null}
      </div>
    </div>
  );
}
