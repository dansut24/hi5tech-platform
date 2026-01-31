"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { CHROME_METRICS } from "./app-chrome";
import { ChevronDown, ChevronUp } from "lucide-react";

export type SidebarMode = "pinned" | "collapsed" | "hidden";

type Props = {
  sidebar: ReactNode;
  children: ReactNode;
  storageKey?: string;

  pinnedWidth?: number;     // default 280
  collapsedWidth?: number;  // default 80
  minWidth?: number;        // default 80
  maxWidth?: number;        // default 280
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function LayoutGrid({
  sidebar,
  children,
  storageKey = "hi5_sidebar_mode",
  pinnedWidth = 280,
  collapsedWidth = 80,
  minWidth = 80,
  maxWidth = 280,
}: Props) {
  const widthKey = `${storageKey}:w`;

  const [mode, setMode] = useState<SidebarMode>("pinned");
  const [width, setWidth] = useState<number>(pinnedWidth);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ dragging: boolean; startX: number; startW: number } | null>(null);

  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);

  const topOffset = CHROME_METRICS.TOPBAR_H + CHROME_METRICS.TABBAR_H;

  // Load persisted mode/width (but clamp)
  useEffect(() => {
    try {
      const rawMode = localStorage.getItem(storageKey);
      if (rawMode === "pinned" || rawMode === "collapsed" || rawMode === "hidden") setMode(rawMode);

      const rawW = Number(localStorage.getItem(widthKey));
      if (rawW && !Number.isNaN(rawW)) setWidth(clamp(rawW, minWidth, maxWidth));
    } catch {}
  }, [storageKey, widthKey, minWidth, maxWidth]);

  function persistMode(next: SidebarMode) {
    setMode(next);
    try { localStorage.setItem(storageKey, next); } catch {}
  }

  function persistWidth(next: number) {
    const clamped = clamp(next, minWidth, maxWidth);
    setWidth(clamped);
    try { localStorage.setItem(widthKey, String(clamped)); } catch {}
  }

  // External mode control
  useEffect(() => {
    function onSet(e: any) {
      const next = e?.detail as SidebarMode;
      if (next === "hidden") {
        persistMode("hidden");
        return;
      }
      if (next === "collapsed") {
        persistMode("collapsed");
        persistWidth(collapsedWidth);
        return;
      }
      if (next === "pinned") {
        persistMode("pinned");
        persistWidth(pinnedWidth);
        return;
      }
    }
    window.addEventListener(`${storageKey}:set`, onSet as any);
    return () => window.removeEventListener(`${storageKey}:set`, onSet as any);
  }, [storageKey, pinnedWidth, collapsedWidth]);

  // actual width
  const actualWidth = useMemo(() => {
    if (mode === "hidden") return 0;
    if (mode === "collapsed") return collapsedWidth;
    return clamp(width, minWidth, maxWidth);
  }, [mode, width, minWidth, maxWidth, collapsedWidth]);

  // Drag start (no pointer capture)
  function onDragStart(e: React.MouseEvent) {
    if (mode === "hidden") return;
    dragRef.current = { dragging: true, startX: e.clientX, startW: actualWidth };
  }

  // Rule:
  // - Always clamp between 80..280
  // - If width == 80 => collapsed
  // - If width >= 81 => pinned
  function onDragMove(clientX: number) {
    const d = dragRef.current;
    if (!d || !d.dragging) return;

    const delta = clientX - d.startX;
    const nextClamped = clamp(d.startW + delta, minWidth, maxWidth);

    // If at min -> collapsed UI
    if (nextClamped <= collapsedWidth) {
      if (mode !== "collapsed") persistMode("collapsed");
      persistWidth(collapsedWidth);
      return;
    }

    // Above min -> pinned UI
    if (mode !== "pinned") persistMode("pinned");
    persistWidth(nextClamped);
  }

  function onDragEnd() {
    const d = dragRef.current;
    if (!d) return;
    d.dragging = false;
    dragRef.current = null;
  }

  useEffect(() => {
    function onMove(ev: MouseEvent) { onDragMove(ev.clientX); }
    function onUp() { onDragEnd(); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  });

  // Close mobile drawer when resizing to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Arrow-only scrolling (wheel blocked)
  function updateScrollState() {
    const el = sidebarScrollRef.current;
    if (!el) return;
    setCanUp(el.scrollTop > 2);
    setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }

  useEffect(() => {
    setTimeout(updateScrollState, 50);
  }, [actualWidth, mode]);

  function scrollBy(delta: number) {
    const el = sidebarScrollRef.current;
    if (!el) return;
    el.scrollBy({ top: delta, behavior: "smooth" });
    setTimeout(updateScrollState, 120);
  }

  function onWheelBlock(e: React.WheelEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  const topBarOffset = CHROME_METRICS.TOPBAR_H + CHROME_METRICS.TABBAR_H;

  return (
    <div className="w-full">
      {/* Hidden launcher */}
      {mode === "hidden" ? (
        <div className="fixed left-2 z-[70]" style={{ top: topBarOffset + 8 }}>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(`${storageKey}:set`, { detail: "pinned" }))}
            className="hi5-chip w-12 h-12 grid place-items-center shadow-sm"
            title="Open sidebar"
          >
            <span className="font-bold">
              <span className="hi5-accent">Hi</span><span className="opacity-80">5</span>
            </span>
          </button>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block fixed left-0 z-[50]"
        style={{ top: topOffset, bottom: 0, width: actualWidth }}
      >
        <div className="h-full relative">
          {canUp ? (
            <button
              type="button"
              onClick={() => scrollBy(-360)}
              className="absolute left-0 right-0 top-0 h-10 hi5-panel rounded-none border-l-0 border-r-0 border-t-0 flex items-center justify-center"
              title="Scroll up"
            >
              <ChevronUp className="h-5 w-5 opacity-80" />
            </button>
          ) : null}

          <div
            ref={sidebarScrollRef}
            onWheel={onWheelBlock}
            className="h-full overflow-y-auto"
            style={{ paddingTop: canUp ? 40 : 0, paddingBottom: canDown ? 40 : 0 }}
            onScroll={updateScrollState}
          >
            <div className="h-full">{sidebar}</div>
          </div>

          {canDown ? (
            <button
              type="button"
              onClick={() => scrollBy(360)}
              className="absolute left-0 right-0 bottom-0 h-10 hi5-panel rounded-none border-l-0 border-r-0 border-b-0 flex items-center justify-center"
              title="Scroll down"
            >
              <ChevronDown className="h-5 w-5 opacity-80" />
            </button>
          ) : null}

          {/* Drag handle */}
          {mode !== "hidden" ? (
            <div
              role="separator"
              aria-orientation="vertical"
              title="Drag to resize"
              onMouseDown={onDragStart}
              onDoubleClick={() => {
                if (mode === "collapsed") {
                  window.dispatchEvent(new CustomEvent(`${storageKey}:set`, { detail: "pinned" }));
                } else {
                  window.dispatchEvent(new CustomEvent(`${storageKey}:set`, { detail: "collapsed" }));
                }
              }}
              className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
              style={{ transform: "translateX(50%)" }}
            >
              <div className="h-full w-[2px] mx-auto opacity-40 bg-black/20 dark:bg-white/20" />
            </div>
          ) : null}
        </div>
      </aside>

      {/* Mobile drawer unchanged */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed left-2 z-[70] hi5-chip w-12 h-12 grid place-items-center shadow-sm"
          style={{ top: topBarOffset + 8 }}
          title="Open menu"
        >
          <span className="font-bold">
            <span className="hi5-accent">Hi</span><span className="opacity-80">5</span>
          </span>
        </button>

        {mobileOpen ? (
          <div className="hi5-overlay z-[80]" onClick={() => setMobileOpen(false)}>
            <div
              className="absolute left-2 right-2 bottom-2"
              style={{ top: topBarOffset + 8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="hi5-panel h-full overflow-hidden">{sidebar}</div>
            </div>
          </div>
        ) : null}
      </div>

      <main className="min-w-0" style={{ marginLeft: mode === "hidden" ? 0 : actualWidth }}>
        <div className="w-full px-4 sm:px-6 py-4 sm:py-6 hi5-reset-bg">{children}</div>
      </main>
    </div>
  );
}