// apps/app/src/app/(modules)/selfservice/request/new/ui/raise-request-client.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogItem } from "./request-catalog-data";
import { demoCatalog } from "./request-catalog-data";

type BasketLine = { item: CatalogItem; qty: number };

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "GBP" }).format(n);
}

function Icon({ name }: { name: CatalogItem["icon"] }) {
  // Simple inline icons (no deps)
  const base = "h-5 w-5 opacity-90";
  if (name === "keyboard")
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="7" width="18" height="10" rx="2" />
        <path d="M7 10h.01M10 10h.01M13 10h.01M16 10h.01M7 13h10" />
      </svg>
    );
  if (name === "mouse")
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="2" width="6" height="10" rx="3" />
        <path d="M12 6v2" />
        <path d="M9 6a3 3 0 0 1 6 0" />
        <path d="M7 12a5 5 0 0 0 10 0" />
        <path d="M7 12v5a5 5 0 0 0 10 0v-5" />
      </svg>
    );
  if (name === "monitor")
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8" />
        <path d="M12 16v4" />
      </svg>
    );
  if (name === "laptop")
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="5" width="16" height="10" rx="2" />
        <path d="M2 19h20" />
      </svg>
    );
  if (name === "headset")
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12a8 8 0 0 1 16 0" />
        <path d="M4 12v6a2 2 0 0 0 2 2h2v-8H6a2 2 0 0 0-2 2Z" />
        <path d="M20 12v6a2 2 0 0 1-2 2h-2v-8h2a2 2 0 0 1 2 2Z" />
      </svg>
    );
  if (name === "software")
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    );
  // access
  return (
    <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M17 8V7a5 5 0 0 0-10 0v1" />
      <rect x="6" y="8" width="12" height="13" rx="2" />
    </svg>
  );
}

export default function RaiseRequestClient() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | "Hardware" | "Software" | "Access">("All");
  const [basket, setBasket] = useState<Record<string, BasketLine>>({});
  const [note, setNote] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return demoCatalog.filter((i) => {
      const okCat = category === "All" ? true : i.category === category;
      const okQ =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.desc.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [query, category]);

  const basketLines = useMemo(() => Object.values(basket), [basket]);

  const total = useMemo(() => {
    return basketLines.reduce((sum, l) => sum + l.item.price * l.qty, 0);
  }, [basketLines]);

  function addToBasket(item: CatalogItem, qty = 1) {
    setBasket((prev) => {
      const existing = prev[item.id];
      const nextQty = (existing?.qty ?? 0) + qty;
      return {
        ...prev,
        [item.id]: { item, qty: Math.min(99, nextQty) },
      };
    });
  }

  function setQty(itemId: string, qty: number) {
    setBasket((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (qty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: { ...existing, qty: Math.min(99, qty) } };
    });
  }

  function clearBasket() {
    setBasket({});
  }

  async function submit() {
    setErr(null);
    setInfo(null);

    if (basketLines.length === 0) {
      setErr("Add at least one item to your basket.");
      return;
    }

    setLoading(true);
    try {
      // TODO: wire to API
      await new Promise((r) => setTimeout(r, 800));
      setInfo("Request submitted (demo). Next we’ll store this + route to approvals/workflow.");
      clearBasket();
      setNote("");
    } catch (e: any) {
      setErr(e?.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs opacity-70">Self Service</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">Raise a request</h1>
          <p className="text-sm opacity-75 mt-2 max-w-2xl">
            Browse the catalogue and drag items into your basket. Add a note and submit.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/selfservice" className="hi5-btn-ghost text-sm">
            Back
          </Link>
          <button
            type="button"
            className="hi5-btn-primary text-sm disabled:opacity-60"
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit request"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        {/* Catalogue */}
        <div className="hi5-panel p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <input
                className="hi5-input"
                placeholder="Search catalogue… (e.g. keyboard, access, software)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
            </div>

            <select
              className="hi5-input sm:max-w-[200px]"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              disabled={loading}
            >
              <option>All</option>
              <option>Hardware</option>
              <option>Software</option>
              <option>Access</option>
            </select>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border hi5-border p-4 hover:bg-black/5 dark:hover:bg-white/5 transition"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", item.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-2xl hi5-card flex items-center justify-center">
                      <Icon name={item.icon} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{item.name}</div>
                      <div className="text-xs opacity-70">{item.category}</div>
                    </div>
                  </div>

                  <div className="text-sm font-extrabold">{money(item.price)}</div>
                </div>

                <div className="text-sm opacity-80 mt-2">{item.desc}</div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="hi5-btn-ghost text-sm flex-1"
                    onClick={() => addToBasket(item, 1)}
                    disabled={loading}
                    title="Add to basket"
                  >
                    Add
                  </button>
                  <div className="rounded-2xl border hi5-border px-3 py-2 text-xs opacity-70">
                    Drag → basket
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 ? (
              <div className="sm:col-span-2 xl:col-span-3 rounded-3xl border hi5-border p-6 opacity-80">
                No catalogue items found.
              </div>
            ) : null}
          </div>
        </div>

        {/* Basket */}
        <div
          className="hi5-panel p-5"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/plain");
            const item = demoCatalog.find((x) => x.id === id);
            if (item) addToBasket(item, 1);
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Basket</div>
              <div className="text-xs opacity-70 mt-1">Drop items here • adjust quantities • submit</div>
            </div>

            <button
              type="button"
              className="hi5-btn-ghost text-sm"
              onClick={clearBasket}
              disabled={loading || basketLines.length === 0}
            >
              Clear
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {basketLines.length === 0 ? (
              <div className="rounded-3xl border hi5-border p-5 opacity-80">
                Drag items from the catalogue into this basket.
              </div>
            ) : (
              basketLines.map((line) => (
                <div key={line.item.id} className="rounded-3xl border hi5-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-10 w-10 rounded-2xl hi5-card flex items-center justify-center">
                        <Icon name={line.item.icon} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{line.item.name}</div>
                        <div className="text-xs opacity-70">{money(line.item.price)} each</div>
                      </div>
                    </div>

                    <div className="text-sm font-extrabold">
                      {money(line.item.price * line.qty)}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      className="hi5-btn-ghost text-sm"
                      onClick={() => setQty(line.item.id, line.qty - 1)}
                      disabled={loading}
                    >
                      −
                    </button>
                    <input
                      className="hi5-input text-center max-w-[90px]"
                      value={String(line.qty)}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isFinite(v)) return;
                        setQty(line.item.id, v);
                      }}
                      inputMode="numeric"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="hi5-btn-ghost text-sm"
                      onClick={() => setQty(line.item.id, line.qty + 1)}
                      disabled={loading}
                    >
                      +
                    </button>

                    <button
                      type="button"
                      className="hi5-btn-ghost text-sm ml-auto"
                      onClick={() => setQty(line.item.id, 0)}
                      disabled={loading}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 rounded-3xl border hi5-border p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="opacity-70">Estimated total</div>
              <div className="text-lg font-extrabold">{money(total)}</div>
            </div>
            <div className="text-xs opacity-70 mt-1">
              Demo pricing • approvals/workflow comes next.
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm">
              Note (optional)
              <textarea
                className="mt-1 hi5-input"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any details? Who is this for, urgency, justification…"
                disabled={loading}
              />
            </label>
          </div>

          {info ? <p className="text-sm opacity-80 mt-3">{info}</p> : null}
          {err ? <p className="text-sm text-red-600 mt-3">{err}</p> : null}
        </div>
      </div>
    </div>
  );
}
