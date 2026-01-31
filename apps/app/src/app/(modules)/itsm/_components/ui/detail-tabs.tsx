"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type DetailTab = { label: string; href: string };

export default function DetailTabs({ tabs }: { tabs: DetailTab[] }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-6 border-b hi5-divider px-5">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={[
              "py-3 text-sm font-medium",
              active ? "hi5-accent border-b-2 border-[rgba(var(--hi5-accent),0.9)]" : "opacity-70 hover:opacity-100",
              "transition",
            ].join(" ")}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}