"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

export type CommandItem = {
  id: string;
  label: string;
  group: string;
  keywords?: string[];
  icon?: LucideIcon;
  shortcut?: string;
  run: () => void;
};

function normalize(s: string) {
  return (s ?? "").toLowerCase().trim();
}

export default function CommandPalette({ items }: { items: CommandItem[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const query = normalize(q);
    if (!query) return items;

    return items.filter((it) => {
      const hay = [
        it.label,
        ...(it.keywords ?? []),
        it.group,
      ]
        .map(normalize)
        .join(" ");
      return hay.includes(query);
    });
  }, [items, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const it of filtered) {
      if (!map.has(it.group)) map.set(it.group, []);
      map.get(it.group)!.push(it);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Flatten for keyboard navigation
  const flat = useMemo(() => filtered, [filtered]);

  function openPalette() {
    setOpen(true);
    setQ("");
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closePalette() {
    setOpen(false);
    setQ("");
    setActive(0);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      // Open: Cmd/Ctrl+K
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        openPalette();
        return;
      }

      if (!open) return;

      if (k === "escape") {
        e.preventDefault();
        closePalette();
        return;
      }

      if (k === "arrowdown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, Math.max(0, flat.length - 1)));
        return;
      }

      if (k === "arrowup") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
        return;
      }

      if (k === "enter") {
        e.preventDefault();
        const item = flat[active];
        if (item) {
          closePalette();
          item.run();
        }
        return;
      }
    };

    window.addEventListener("keydown", onKey);

    const onOpen = () => openPalette();
    window.addEventListener("hi5-command-open", onOpen as any);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hi5-command-open", onOpen as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, flat, active]);

  useEffect(() => {
    // Keep active index in range when filtering
    if (active > flat.length - 1) setActive(Math.max(0, flat.length - 1));
  }, [flat.length, active]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60]"
      onMouseDown={() => closePalette()}
    >
      <div className="hi5-overlay" />
      <div className="absolute inset-0 grid place-items-start sm:place-items-center p-3 sm:p-6">
        <div
          className="w-full max-w-2xl hi5-panel overflow-hidden"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b hi5-divider flex items-center gap-3">
            <div className="text-sm opacity-70">⌘K</div>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              placeholder="Search… (Incidents, Requests, Knowledge, Settings)"
              className="hi5-input w-full text-sm"
            />
            <div className="text-xs opacity-60">Esc</div>
          </div>

          <div className="max-h-[65vh] overflow-auto">
            {grouped.length === 0 ? (
              <div className="p-4 text-sm opacity-70">No results.</div>
            ) : (
              grouped.map(([group, list]) => (
                <div key={group} className="p-2">
                  <div className="px-2 pt-2 pb-1 text-[11px] uppercase tracking-wide opacity-60">
                    {group}
                  </div>

                  <div className="grid gap-1">
                    {list.map((it) => {
                      const idx = flat.findIndex((x) => x.id === it.id);
                      const isActive = idx === active;
                      const Icon = it.icon;

                      return (
                        <button
                          key={it.id}
                          type="button"
                          onMouseEnter={() => setActive(Math.max(0, idx))}
                          onClick={() => {
                            closePalette();
                            it.run();
                          }}
                          className={[
                            "w-full text-left rounded-2xl border hi5-border px-3 py-2",
                            "flex items-center justify-between gap-3",
                            isActive ? "bg-[rgba(var(--hi5-accent),0.12)]" : "hover:bg-black/5 dark:hover:bg-white/5",
                            "transition",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {Icon ? (
                              <Icon className="h-5 w-5 opacity-80 shrink-0" />
                            ) : null}
                            <div className="min-w-0">
                              <div className="text-sm truncate">{it.label}</div>
                              {it.keywords?.length ? (
                                <div className="text-xs opacity-60 truncate">
                                  {it.keywords.slice(0, 3).join(" · ")}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {it.shortcut ? (
                            <div className="text-xs opacity-60 shrink-0">{it.shortcut}</div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t hi5-divider text-xs opacity-60 flex items-center justify-between">
            <span>Use ↑ ↓ and Enter</span>
            <span>Click outside to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}