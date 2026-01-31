import type { ReactNode } from "react";
import ITSMFrame from "./_components/itsm-frame";

export default function Layout({ children }: { children: ReactNode }) {
  return <ITSMFrame>{children}</ITSMFrame>;
}