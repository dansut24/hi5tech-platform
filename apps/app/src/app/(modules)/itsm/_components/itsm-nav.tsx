"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type SidebarMode = "pinned" | "collapsed" | "hidden";

type Item = {
  href: string;
  label: string;
  icon: string;
};

const items: Item[] = [
  { href: "/itsm", label: "Dashboard", icon: "🏠" },
  { href: "/itsm/incidents", label: "Incidents", icon: "🚨" },
  { href: "/itsm/requests", label: "Requests", icon: "🧾" },
  { href: "/itsm/changes", label: "Changes", icon: "🧩" },
  { href: "/itsm/knowledge", label: "Knowledge", icon: "📚" },
  { href: "/itsm/assets", label: "Assets", icon: "💻" },
  { href: "/itsm/settings", label: "Settings", icon: "⚙️" },
];

function isActive(pathname: string, href: string) {
  if (href === "/itsm") return pathname === "/itsm";
  return pathname.startsWith(href);
}

function RailScrollButtons({ targetRef }: { targetRef: React.RefObject<HTMLDivElement | null> }) {
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);

  function recalc() {
    const el = targetRef.current;
    if (!el) return;
    setCanUp(el.scrollTop > 2);
    setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }

  useEffect(() => {
    recalc();
    const el = targetRef.current;
    if (!el) return;

    const onScroll = () => recalc();
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => recalc());
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scrollBy(delta: number) {
    const el = targetRef.current;
    if (!el) return;
    el.scrollBy({ top: delta, behavior: "smooth" });
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => scrollBy(-220)}
        disabled={!canUp}
        className={[
          "rounded-xl border px-2 py-2 text-sm hi5-border",
          canUp ? "hover:bg-black/5 dark:hover:bg-white/5" : "opacity-40 cursor-not-allowed",
          "transition",
        ].join(" ")}
        title="Scroll up"
      >
        ▲
      </button>
      <button
        type="button"
        onClick={() => scrollBy(220)}
        disabled={!canDown}
        className={[
          "rounded-xl border px-2 py-2 text-sm hi5-border",
          canDown ? "hover:bg-black/5 dark:hover:bg-white/5" : "opacity-40 cursor-not-allowed",
          "transition",
        ].join(" ")}
        title="Scroll down"
      >
        ▼
      </button>
    </div>
  );
}

export default function ITSMNav({
  mobile,
  mode = "pinned",
}: {
  mobile?: boolean;
  mode?: SidebarMode;
}) {
  const pathname = usePathname();

  // Mobile = horizontal quick nav
  if (mobile) {
    return (
      <div className="flex gap-2 overflow-x-auto px-2">
        {items.map((i) => {
          const active = isActive(pathname, i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              className={[
                "shrink-0 rounded-xl border px-3 py-2 text-sm",
                "hi5-border",
                active ? "bg-[rgba(var(--hi5-accent),0.10)] hi5-accent" : "opacity-80",
                "hover:bg-black/5 dark:hover:bg-white/5 transition",
              ].join(" ")}
            >
              <span className="mr-2">{i.icon}</span>
              {i.label}
            </Link>
          );
        })}
      </div>
    );
  }

  // Collapsed rail (scrollable) + arrows
  if (mode === "collapsed") {
    const scrollerRef = useRef<HTMLDivElement | null>(null);

    return (
      <div className="grid gap-2 p-2">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs opacity-70 leading-tight">
            Menu
          </div>
          <RailScrollButtons targetRef={scrollerRef} />
        </div>

        <div
          ref={scrollerRef}
          className="max-h-[calc(100dvh-180px)] overflow-y-auto pr-1"
        >
          <nav className="grid gap-2">
            {items.map((i) => {
              const active = isActive(pathname, i.href);
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  className={[
                    "group rounded-2xl border hi5-border",
                    "px-2 py-3 grid place-items-center gap-1",
                    active ? "bg-[rgba(var(--hi5-accent),0.10)]" : "hover:bg-black/5 dark:hover:bg-white/5",
                    "transition",
                  ].join(" ")}
                  title={i.label}
                >
                  <div className="text-xl">{i.icon}</div>
                  <div className={["text-[11px] leading-tight text-center", active ? "hi5-accent font-medium" : "opacity-80"].join(" ")}>
                    {i.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    );
  }

  // Pinned (normal)
  return (
    <nav className="grid gap-1 p-2">
      {items.map((i) => {
        const active = isActive(pathname, i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={[
              "rounded-2xl border hi5-border px-3 py-2",
              "flex items-center gap-3 text-sm",
              active ? "bg-[rgba(var(--hi5-accent),0.10)]" : "hover:bg-black/5 dark:hover:bg-white/5",
              "transition",
            ].join(" ")}
          >
            <div className="text-lg">{i.icon}</div>
            <div className={active ? "hi5-accent font-medium" : "opacity-80"}>{i.label}</div>
          </Link>
        );
      })}
    </nav>
  );
}