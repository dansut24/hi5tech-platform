"use client";

import type { ReactNode } from "react";
import LayoutGrid from "../../../../components/chrome/layout-grid";
import ITSMSidebar from "./itsm-sidebar";

export default function ITSMFrame({ children }: { children: ReactNode }) {
  return (
    <LayoutGrid
      storageKey="hi5_itsm_sidebar_mode_v3"
      pinnedWidth={280}
      collapsedWidth={80}
      minWidth={80}
      maxWidth={280}
      sidebar={<ITSMSidebar />}
    >
      {children}
    </LayoutGrid>
  );
}