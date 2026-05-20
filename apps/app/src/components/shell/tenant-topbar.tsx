// apps/app/src/components/shell/tenant-topbar.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  TenantShellModule,
  TenantShellNavItem,
} from "@/components/shell/tenant-sidebar";
import type {
  TenantShellTenant,
  TenantShellUser,
} from "@/components/shell/tenant-shell";

function initials(name?: string | null, email?: string | null) {
  const cleanName = String(name || "").trim();

  if (cleanName) {
    return cleanName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }

  const cleanEmail = String(email || "").trim();
  return cleanEmail ? cleanEmail[0].toUpperCase() : "U";
}

function environmentLabel(value?: string | null) {
  if (value === "test") return "Test";
  if (value === "staging") return "Staging";
  return "Production";
}

function environmentClass(value?: string | null) {
  if (value === "test") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-200";
  }

  if (value === "staging") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200";
  }

  return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
}

export default function TenantTopbar({
  tenant,
  user,
  modules,
  activeModule,
  navigationTitle,
  navigation = [],
}: {
  tenant: TenantShellTenant;
  user: TenantShellUser;
  modules: TenantShellModule[];
  activeModule?: string;
  navigationTitle?: string;
  navigation?: TenantShellNavItem[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const tenantName = tenant.name || tenant.subdomain || "Workspace";

  return (
    <header className="sticky top-0 z-50 border-b hi5-border bg-[rgb(var(--hi5-topbar)/0.78)] backdrop-blur-2xl">
      <div className="mx-auto flex h-[76px] w-full max-w-[1560px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border hi5-border bg-black/5 text-xl font-black dark:bg-white/5 lg:hidden"
            aria-label="Open navigation"
          >
            ☰
          </button>

          <Link href="/apps" className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[rgb(var(--hi5-accent)/0.14)] text-sm font-black hi5-accent">
              H5
            </div>

            <div className="min-w-0">
              <div className="truncate text-lg font-black tracking-tight sm:text-xl">
                Hi5Tech
              </div>
              <div className="hidden truncate text-xs opacity-65 sm:block">
                {tenantName}
              </div>
            </div>
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 px-4 md:flex">
          <span
            className={[
              "rounded-full border px-3 py-1 text-xs font-black",
              environmentClass(tenant.environmentKey),
            ].join(" ")}
          >
            {environmentLabel(tenant.environmentKey)}
          </span>

          {tenant.planLabel ? (
            <span className="rounded-full border hi5-border bg-black/5 px-3 py-1 text-xs font-bold dark:bg-white/5">
              {tenant.planLabel}
            </span>
          ) : null}

          {activeModule ? (
            <span className="rounded-full border hi5-border bg-black/5 px-3 py-1 text-xs font-bold capitalize dark:bg-white/5">
              {activeModule}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/workspaces"
            className="hidden rounded-2xl border hi5-border bg-black/5 px-3 py-2 text-xs font-black dark:bg-white/5 sm:inline-flex"
          >
            Workspaces
          </Link>

          <form action="/auth/signout" method="post" className="hidden sm:block">
            <button
              type="submit"
              className="rounded-2xl border hi5-border bg-black/5 px-3 py-2 text-xs font-black dark:bg-white/5"
            >
              Logout
            </button>
          </form>

          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border hi5-border bg-black/5 text-sm font-black dark:bg-white/5">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              initials(user.name, user.email)
            )}
          </div>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t hi5-border bg-[rgb(var(--hi5-card)/0.96)] p-4 backdrop-blur-2xl lg:hidden">
          <div className="text-xs font-black uppercase tracking-[0.18em] opacity-55">
            Apps
          </div>

          <div className="mt-2 grid gap-2">
            {modules.map((module) => {
              const active = module.key === activeModule;

              return (
                <Link
                  key={module.key}
                  href={module.href}
                  onClick={() => setMenuOpen(false)}
                  className={[
                    "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-black",
                    active
                      ? "border-[rgb(var(--hi5-accent)/0.38)] bg-[rgb(var(--hi5-accent)/0.12)] hi5-accent"
                      : "hi5-border bg-black/5 dark:bg-white/5",
                  ].join(" ")}
                >
                  <span>{module.title}</span>
                  <span>→</span>
                </Link>
              );
            })}
          </div>

          {navigation.length ? (
            <>
              <div className="mt-5 text-xs font-black uppercase tracking-[0.18em] opacity-55">
                {navigationTitle || "Navigation"}
              </div>

              <div className="mt-2 grid gap-2">
                {navigation.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between rounded-2xl border hi5-border bg-black/5 px-4 py-3 text-sm font-black dark:bg-white/5"
                  >
                    <span>{item.title}</span>
                    <span>→</span>
                  </Link>
                ))}
              </div>
            </>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/workspaces"
              className="rounded-2xl border hi5-border bg-black/5 px-4 py-3 text-center text-sm font-black dark:bg-white/5"
            >
              Workspaces
            </Link>

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="w-full rounded-2xl border hi5-border bg-black/5 px-4 py-3 text-sm font-black dark:bg-white/5"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </header>
  );
}
