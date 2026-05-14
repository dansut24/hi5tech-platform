"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-5 w-5">
      <span className={`absolute left-0 top-1 h-0.5 w-5 rounded-full bg-current transition ${open ? "translate-y-1.5 rotate-45" : ""}`} />
      <span className={`absolute left-0 top-2.5 h-0.5 w-5 rounded-full bg-current transition ${open ? "opacity-0" : ""}`} />
      <span className={`absolute left-0 top-4 h-0.5 w-5 rounded-full bg-current transition ${open ? "-translate-y-1.5 -rotate-45" : ""}`} />
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
      <header className="sticky top-0 z-[100]">
        <div className="container pt-4">
          <div className="hi5-panel px-4 py-3 flex items-center justify-between gap-4">
            <Link href="/" onClick={closeMenu} className="flex items-center gap-3">
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
              <button type="button" className="theme-toggle" onClick={toggleTheme}>
                {theme === "dark" ? "☀️" : "🌙"}
              </button>

              <a className="hi5-btn" href={`${appUrl}/login`}>
                Sign in
              </a>

              <Link className="hi5-btn hi5-btn-primary" href="/signup">
                Start free trial
              </Link>
            </div>

            <div className="flex lg:hidden items-center gap-2">
              <button type="button" className="theme-toggle" onClick={toggleTheme}>
                {theme === "dark" ? "☀️" : "🌙"}
              </button>

              <button
                type="button"
                className="theme-toggle"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                <MenuIcon open={menuOpen} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="absolute inset-0 bg-black/45 backdrop-blur-2xl"
          />

          <div className="absolute left-4 right-4 top-[104px] max-h-[calc(100dvh-128px)] overflow-hidden rounded-[32px] border border-white/20 bg-white/78 shadow-2xl backdrop-blur-[38px] dark:bg-slate-950/78">
            <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-sky-400/30 blur-3xl" />
            <div className="absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-cyan-400/25 blur-3xl" />

            <div className="relative z-10 flex flex-col items-center px-6 py-8 text-center">
              <div className="flex items-center justify-center gap-3">
                <span className="logo-mark">H</span>
                <span className="text-2xl font-extrabold tracking-tight">Hi5Tech</span>
              </div>

              <nav className="mt-8 grid w-full gap-2">
                {[
                  ["Features", "/features"],
                  ["Pricing", "/pricing"],
                  ["Security", "/security"],
                  ["Contact", "/contact"],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    onClick={closeMenu}
                    href={href}
                    className="rounded-3xl py-3 text-4xl font-black tracking-[-0.06em] transition hover:bg-sky-500/10 active:scale-[0.98]"
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              <div className="mt-8 grid w-full max-w-sm gap-3">
                <a onClick={closeMenu} href={`${appUrl}/login`} className="hi5-btn">
                  Sign in
                </a>
                <Link onClick={closeMenu} href="/signup" className="hi5-btn hi5-btn-primary">
                  Start free trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
