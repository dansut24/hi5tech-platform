"use client";

import { useEffect } from "react";
import { initTheme } from "@/lib/theme/hi5-theme";

export default function ThemeClientInit() {
  useEffect(() => {
    const cleanup = initTheme();
    return () => cleanup?.();
  }, []);

  return null;
}