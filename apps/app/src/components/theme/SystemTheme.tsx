"use client";

import { useEffect } from "react";

export default function SystemTheme() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      document.documentElement.classList.toggle("dark", mq.matches);
    };

    apply();

    // React to changes (user flips OS theme)
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    } else {
      // iOS/Safari older fallback
      mq.addListener(apply);
      return () => mq.removeListener(apply);
    }
  }, []);

  return null;
}
