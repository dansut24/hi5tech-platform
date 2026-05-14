"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function ThemeIcon({ theme }: { theme: "light" | "dark" }) {
  return <span aria-hidden>{theme === "dark" ? "☀️" : "🌙"}</span>;
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-5 w-5" aria-hidden>
      <span
        className={[
          "absolute left-0 top-[4px] h-[2px] w-5 rounded-full bg-current transition",
          open ? "translate-y-[6px] rotate-45" : "",
        ].join(" ")}
      />
      <span
        className={[
          "absolute left-0 top-[10px] h-[2px] w-5 rounded-full bg-current transition",
          open ? "opacity-0" : "",
        ].join(" ")}
      />
      <span
        className={[
          "absolute left-0 top-[16px] h-[2px] w-5 rounded-full bg-current transition",
          open ? "-translate-y-[6px] -rotate-45" : "",
        ].join(" ")}
      />
    </span>
  );
}

export default function SiteNav({ appUrl }: { appUrl: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("hi5-marketing-theme", next);
    document.documentElement.dataset.theme = next;
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-50">
        <div className="container pt-4">
          <div className="hi5-panel px-4 py-3 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3" onClick={closeMenu}>
              <span className="logo-mark">H</span>
              <span className="font-extrabold tracking-tight text-lg">Hi5Tech</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              <Link className="nav-link" href="/features">Features</Link>
              <Link className="nav-link" href="/pricing">Pricing</Link>
              <Link className="nav-link" href="/security">Security</Link>
              <Link className="nav-link" href="/contact">Contact</Link>
            </nav>

            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label="Toggle colour mode"
              >
                <ThemeIcon theme={theme} />
              </button>

              <a className="hi5-btn" href={`${appUrl}/login`}>
                Sign in
              </a>

              <Link className="hi5-btn hi5-btn-primary" href="/signup">
                Start free trial
              </Link>
            </div>

            <div className="flex lg:hidden items-center gap-2">
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label="Toggle colour mode"
              >
                <ThemeIcon theme={theme} />
              </button>

              <button
                type="button"
                className="theme-toggle"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
              >
                <MenuIcon open={menuOpen} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        className={[
          "mobile-liquid-menu lg:hidden",
          menuOpen ? "mobile-liquid-menu-open" : "",
        ].join(" ")}
        aria-hidden={!menuOpen}
      >
        <div className="mobile-liquid-backdrop" onClick={closeMenu} />

        <div className="mobile-liquid-panel">
          <div className="mobile-liquid-glow mobile-liquid-glow-one" />
          <div className="mobile-liquid-glow mobile-liquid-glow-two" />

          <div className="mobile-liquid-content">
            <div className="flex items-center gap-3 justify-center">
              <span className="logo-mark">H</span>
              <span className="font-extrabold tracking-tight text-xl">Hi5Tech</span>
            </div>

            <nav className="mobile-liquid-links">
              <Link onClick={closeMenu} href="/features">Features</Link>
              <Link onClick={closeMenu} href="/pricing">Pricing</Link>
              <Link onClick={closeMenu} href="/security">Security</Link>
              <Link onClick={closeMenu} href="/contact">Contact</Link>
            </nav>

            <div className="mobile-liquid-actions">
              <a onClick={closeMenu} className="hi5-btn w-full" href={`${appUrl}/login`}>
                Sign in
              </a>

              <Link onClick={closeMenu} className="hi5-btn hi5-btn-primary w-full" href="/signup">
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
