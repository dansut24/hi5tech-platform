"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User, Settings, LogOut, ChevronDown, Moon, Sun, Monitor } from "lucide-react";

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
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const userInitials = initials(name, email);
  const displayName = name || email?.split("@")[0] || "Account";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-2 rounded-xl border hi5-border px-2.5 py-1.5",
          "hover:bg-black/5 dark:hover:bg-white/5 transition",
          open ? "bg-black/5 dark:bg-white/5" : "",
        ].join(" ")}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {/* Avatar circle */}
        <div className="h-7 w-7 rounded-lg bg-[rgba(var(--hi5-accent),0.18)] border border-[rgba(var(--hi5-accent),0.30)] flex items-center justify-center text-xs font-bold text-[rgb(var(--hi5-accent))] shrink-0">
          {userInitials}
        </div>
        {/* Name - hidden on very small screens */}
        <span className="hidden sm:block text-xs font-medium max-w-[100px] truncate">
          {displayName}
        </span>
        <ChevronDown
          size={14}
          className={["opacity-60 transition-transform duration-200", open ? "rotate-180" : ""].join(" ")}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={[
            "absolute right-0 top-full mt-2 z-50",
            "hi5-panel border hi5-border",
            "w-64 py-2",
            "animate-in fade-in slide-in-from-top-2 duration-150",
          ].join(" ")}
          role="menu"
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b hi5-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[rgba(var(--hi5-accent),0.18)] border border-[rgba(var(--hi5-accent),0.30)] flex items-center justify-center text-sm font-bold text-[rgb(var(--hi5-accent))] shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{displayName}</div>
                {email && (
                  <div className="text-xs opacity-60 truncate">{email}</div>
                )}
                {role && (
                  <div className="text-xs opacity-50 mt-0.5 capitalize">{role}</div>
                )}
              </div>
            </div>
            {tenantLabel && (
              <div className="mt-2 text-xs opacity-50 truncate">
                Tenant: {tenantLabel}
              </div>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
              role="menuitem"
            >
              <User size={16} className="opacity-60" />
              Profile & Preferences
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
              role="menuitem"
            >
              <Settings size={16} className="opacity-60" />
              Settings
            </Link>
          </div>

          <div className="border-t hi5-border py-1">
            <a
              href="/auth/signout"
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition text-rose-600 dark:text-rose-400"
              role="menuitem"
            >
              <LogOut size={16} />
              Sign out
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
