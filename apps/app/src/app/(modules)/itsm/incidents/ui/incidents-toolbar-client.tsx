"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type ViewMode = "triage" | "mine" | "team" | "all";

function Tab({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition",
        "hi5-border",
        active ? "hi5-card" : "opacity-80 hover:opacity-100",
      ].join(" ")}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span className="text-[11px] rounded-full border hi5-border px-2 py-0.5 opacity-80">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export default function IncidentsToolbarClient({
  currentView,
  counts,
}: {
  currentView: ViewMode;
  counts: Record<ViewMode, number>;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();

  function hrefFor(view: ViewMode) {
    const next = new URLSearchParams(sp?.toString() || "");
    next.set("view", view);
    return `${pathname}?${next.toString()}`;
  }

  return (
    <div className="hi5-panel p-3 flex flex-wrap gap-2">
      <Tab href={hrefFor("triage")} active={currentView === "triage"} label="Triage" count={counts.triage} />
      <Tab href={hrefFor("mine")} active={currentView === "mine"} label="My tickets" count={counts.mine} />
      <Tab href={hrefFor("team")} active={currentView === "team"} label="Team" count={counts.team} />
      <Tab href={hrefFor("all")} active={currentView === "all"} label="All" count={counts.all} />
    </div>
  );
}
