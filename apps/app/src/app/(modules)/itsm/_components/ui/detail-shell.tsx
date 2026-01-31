"use client";

import { ReactNode } from "react";

export default function DetailShell({
  header,
  subTabs,
  main,
  rightRail,
}: {
  header: ReactNode;
  subTabs?: ReactNode;
  main: ReactNode;
  rightRail?: ReactNode;
}) {
  return (
    <div className="w-full">
      <div className="hi5-panel overflow-hidden">
        {header}
        {subTabs ? <div className="bg-[rgba(var(--hi5-card),0.15)]">{subTabs}</div> : null}

        <div className="p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">{main}</div>
            {rightRail ? <aside className="min-w-0">{rightRail}</aside> : null}
          </div>
        </div>
      </div>
    </div>
  );
}