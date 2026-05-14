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
            className="absolute inset-0 bg-black/35 backdrop-blur-xl"
          />

          <div className="absolute left-[5%] right-[5%] top-[100px] h-[calc(90dvh-100px)] overflow-hidden rounded-[34px] border border-white/20 bg-white/70 shadow-2xl backdrop-blur-[36px] dark:bg-slate-950/70">
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-purple-500/30 blur-3xl" />
            <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-cyan-500/25 blur-3xl" />

            <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex items-center justify-center gap-3">
                <span className="logo-mark">H</span>
                <span className="text-2xl font-extrabold tracking-tight">Hi5Tech</span>
              </div>

              <nav className="mt-10 grid w-full gap-3">
                <Link onClick={closeMenu} href="/features" className="text-5xl font-black tracking-[-0.06em]">
                  Features
                </Link>
                <Link onClick={closeMenu} href="/pricing" className="text-5xl font-black tracking-[-0.06em]">
                  Pricing
                </Link>
                <Link onClick={closeMenu} href="/security" className="text-5xl font-black tracking-[-0.06em]">
                  Security
                </Link>
                <Link onClick={closeMenu} href="/contact" className="text-5xl font-black tracking-[-0.06em]">
                  Contact
                </Link>
              </nav>

              <div className="mt-10 grid w-full max-w-sm gap-3">
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
