"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function ThemeIcon({ theme }: { theme: "light" | "dark" }) {
  return <span aria-hidden>{theme === "dark" ? "☀️" : "🌙"}</span>;
}

export default function SiteNav({ appUrl }: { appUrl: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("hi5-marketing-theme");
    const initial =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("hi5-marketing-theme", next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <header className="sticky top-0 z-50">
      <div className="container pt-4">
        <div className="hi5-panel px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="logo-mark">H</span>
            <span className="font-extrabold tracking-tight text-lg">Hi5Tech</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            <Link className="nav-link" href="/features">Features</Link>
            <Link className="nav-link" href="/pricing">Pricing</Link>
            <Link className="nav-link" href="/security">Security</Link>
            <Link className="nav-link" href="/contact">Contact</Link>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle colour mode"
            >
              <ThemeIcon theme={theme} />
            </button>

            <a className="hi5-btn hidden sm:inline-flex" href={`${appUrl}/login`}>
              Sign in
            </a>

            <Link className="hi5-btn hi5-btn-primary hidden sm:inline-flex" href="/signup">
              Start free trial
            </Link>
          </div>
        </div>

        <div className="mt-3 lg:hidden flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <Link className="hi5-btn shrink-0" href="/features">Features</Link>
          <Link className="hi5-btn shrink-0" href="/pricing">Pricing</Link>
          <Link className="hi5-btn shrink-0" href="/security">Security</Link>
          <Link className="hi5-btn shrink-0" href="/contact">Contact</Link>
          <Link className="hi5-btn hi5-btn-primary shrink-0 sm:hidden" href="/signup">
            Start trial
          </Link>
        </div>
      </div>
    </header>
  );
}
