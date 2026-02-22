import type { ReactNode } from "react";

export type ShellNavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  exact?: boolean;
  badge?: ReactNode;
};
