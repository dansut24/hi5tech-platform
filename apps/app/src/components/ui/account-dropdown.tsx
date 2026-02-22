'use client';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";

function initials(name?: string | null, email?: string | null) {
  const base = name || email?.split("@")[0] || "?";
  const parts = base.trim().split(/[\s._-]+/).filter(Boolean);
  const a = (parts[0]?.[0] || base[0] || "?").toUpperCase();
  const b = (parts[1]?.[0] || "").toUpperCase();
  return (a + b).slice(0, 2);
}

type Props = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  tenantLabel?: string | null;
};

export default function AccountDropdown({ name, email, role, tenantLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function openMenu() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    function onScroll() { setOpen(false); }
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true } as any);
    };
  }, [open]);

  const userInitials = initials(name, email);
  const displayName = name || email?.split("@")[0] || "Account";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => open ? setOpen(false) : openMenu()}
        className={[
          "flex items-center gap-2 rounded-xl border hi5-border px-2.5 py-1.5",
          "hover:bg-black/5 dark:hover:bg-white/5 transition",
          open ? "bg-black/5 dark:bg-white/5" : "",
        ].join(" ")}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <div className="h-7 w-7 rounded-lg bg-[rgba(var(--hi5-accent),0.18)] border border-[rgba(var(--hi5-accent),0.30)] flex items-center justify-center text-xs font-bold text-[rgb(var(--hi5-accent))] shrink-0">
          {userInitials}
        </div>
        <span className="hidden sm:block text-xs font-medium max-w-[100px] truncate">
          {displayName}
        </span>
        <ChevronDown
          size={14}
          className={["opacity-60 transition-transform duration-200", open ? "rotate-180" : ""].join(" ")}
        />
      </button>

      {open && pos && (
        <div
          className="fixed z-[9000] w-64 py-2 hi5-panel border hi5-border shadow-xl rounded-2xl"
          style={{ top: pos.top, right: pos.right }}
          role="menu"
        >
          <div className="px-4 py-3 border-b hi5-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[rgba(var(--hi5-accent),0.18)] border border-[rgba(var(--hi5-accent),0.30)] flex items-center justify-center text-sm font-bold text-[rgb(var(--hi5-accent))] shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{displayName}</div>
                {email && <div className="text-xs opacity-60 truncate">{email}</div>}
                {role && <div className="text-xs opacity-50 mt-0.5 capitalize">{role}</div>}
              </div>
            </div>
            {tenantLabel && (
              <div className="mt-2 text-xs opacity-50 truncate">Tenant: {tenantLabel}</div>
            )}
          </div>

          <div className="py-1">
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition" role="menuitem">
              <User size={16} className="opacity-60" />
              Profile & Preferences
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition" role="menuitem">
              <Settings size={16} className="opacity-60" />
              Settings
            </Link>
          </div>

          <div className="border-t hi5-border py-1">
            <a href="/auth/signout" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition text-rose-600 dark:text-rose-400" role="menuitem">
              <LogOut size={16} />
              Sign out
            </a>
          </div>
        </div>
      )}
    </>
  );
}
