"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="hi5-panel p-5">
      <div className="text-xs opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-2 text-xs opacity-70">{hint}</div> : null}
    </div>
  );
}

export default function ControlHomeClient() {
  // If you want any UI state on the Control landing, it MUST live here
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");

  const stats = useMemo(() => {
    // template data for now
    if (range === "24h") return { online: 6, alerts: 1, actions: 14 };
    if (range === "30d") return { online: 12, alerts: 11, actions: 420 };
    return { online: 9, alerts: 4, actions: 88 };
  }, [range]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Control</h1>
          <p className="text-sm opacity-75 mt-1">
            Monitor devices, run actions, and review alerts.
          </p>
        </div>

        <div className="flex gap-2">
          {(["24h", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={[
                "rounded-2xl px-3 py-2 text-sm transition",
                "hi5-btn-ghost",
                range === r ? "ring-2 ring-[rgba(var(--hi5-accent),0.35)]" : "",
              ].join(" ")}
              type="button"
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Devices online" value={String(stats.online)} hint="Currently reachable agents" />
        <StatCard label="Open alerts" value={String(stats.alerts)} hint="Requires attention" />
        <StatCard label="Actions run" value={String(stats.actions)} hint={`Over the last ${range}`} />
      </div>

      <div className="hi5-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Quick actions</div>
            <div className="text-xs opacity-70 mt-1">Jump into the main areas.</div>
          </div>

          <Link href="/control/devices" className="hi5-btn-primary text-sm">
            View devices
          </Link>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Link href="/control/devices" className="hi5-btn-ghost text-sm text-center">
            Devices
          </Link>
          <div className="hi5-btn-ghost text-sm text-center opacity-60 cursor-not-allowed" title="Coming soon">
            Alerts (soon)
          </div>
          <div className="hi5-btn-ghost text-sm text-center opacity-60 cursor-not-allowed" title="Coming soon">
            Policies (soon)
          </div>
        </div>
      </div>
    </div>
  );
}
