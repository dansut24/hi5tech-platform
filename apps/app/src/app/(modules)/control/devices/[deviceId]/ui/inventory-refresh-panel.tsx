"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  deviceId: string;
  remoteActive?: boolean;
  collectedAt?: string | null;
};

function formatTime(value?: string | null) {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function InventoryRefreshPanel({ deviceId, remoteActive = false, collectedAt }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const intervalMs = remoteActive ? 5000 : 60000;
  const label = useMemo(() => (remoteActive ? "Live session refresh: 5s" : "Auto-refresh: 60s"), [remoteActive]);

  useEffect(() => {
    const id = window.setInterval(() => {
      startTransition(() => router.refresh());
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs, router]);

  useEffect(() => {
    if (!remoteActive) return;

    // Pull a fresh server render as soon as a session is detected, rather than
    // waiting for the next interval tick.
    startTransition(() => router.refresh());
  }, [remoteActive, router]);

  async function refreshInventory() {
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/control/devices/${encodeURIComponent(deviceId)}/inventory`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      setMessage("Refresh requested");

      // The agent usually replies within a few seconds. Refresh now and again
      // shortly after so the page picks up the new collected_at timestamp.
      startTransition(() => router.refresh());
      window.setTimeout(() => startTransition(() => router.refresh()), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          className="hi5-btn-ghost text-sm disabled:opacity-60"
          type="button"
          disabled={isPending}
          onClick={refreshInventory}
        >
          {isPending ? "Refreshing…" : "Refresh inventory"}
        </button>

        <button
          className="hi5-btn-ghost text-sm disabled:opacity-60"
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => router.refresh())}
          title="Refresh this page without asking the agent to recollect inventory"
        >
          Refresh page
        </button>
      </div>

      <div className="text-[11px] opacity-65 text-right">
        {label} · Inventory {formatTime(collectedAt)}
      </div>

      {message ? <div className="text-[11px] text-emerald-700 dark:text-emerald-300">{message}</div> : null}
      {error ? <div className="text-[11px] text-rose-700 dark:text-rose-300">{error}</div> : null}
    </div>
  );
}
