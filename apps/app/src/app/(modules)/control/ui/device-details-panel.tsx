// apps/app/src/app/(modules)/control/ui/device-details-panel.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DeviceRow } from "./device-data";

function pill(status: DeviceRow["status"]) {
  if (status === "online") return "bg-emerald-500/10 border-emerald-500/25 text-emerald-100";
  if (status === "warning") return "bg-amber-500/10 border-amber-500/25 text-amber-100";
  return "bg-rose-500/10 border-rose-500/25 text-rose-100";
}

const API_BASE =
  process.env.NEXT_PUBLIC_RMM_API_BASE?.replace(/\/+$/, "") || "https://rmm.hi5tech.co.uk";

export default function DeviceDetailsPanel({
  device,
  compact,
}: {
  device: DeviceRow | null;
  compact?: boolean;
}) {
  const [shotTick, setShotTick] = useState(0);
  const [busy, setBusy] = useState(false);

  const screenshotUrl = useMemo(() => {
    if (!device?.id) return "";
    const t = Date.now() + shotTick;
    return `${API_BASE}/api/device_screenshot?device_id=${encodeURIComponent(device.id)}&t=${t}`;
  }, [device?.id, shotTick]);

  async function requestScreenshot() {
    if (!device?.id) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE}/api/devices/screenshot/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: device.id }),
      });
      // Give the agent a moment to respond, then bust cache
      setTimeout(() => setShotTick((x) => x + 1), 700);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hi5-panel p-5">
      {!device ? (
        <div className="text-sm opacity-80">Select a device to see details.</div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs opacity-70">Selected device</div>
              <div className="text-lg font-extrabold truncate mt-1">{device.name}</div>
              <div className="text-xs opacity-70 mt-1">{device.os}</div>
            </div>

            <span className={["rounded-full border px-3 py-1 text-xs font-semibold", pill(device.status)].join(" ")}>
              {device.status.toUpperCase()}
            </span>
          </div>

          {/* Live preview */}
          <div className="hi5-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Live preview</div>
                <div className="text-xs opacity-70 mt-1">Click refresh to request a new screenshot from the agent.</div>
              </div>
              <button
                className="hi5-btn-primary text-sm"
                type="button"
                disabled={busy || device.status !== "online"}
                onClick={requestScreenshot}
                title={device.status !== "online" ? "Device must be online" : "Request screenshot"}
              >
                {busy ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            <div className="mt-3 rounded-xl overflow-hidden border border-white/10 bg-black/20">
              {device.status !== "online" ? (
                <div className="p-6 text-sm opacity-70">Device is offline.</div>
              ) : (
                // If no screenshot exists yet, the server returns 404; browser will show broken image.
                // That’s OK for now; once the agent responds, it will render.
                <img
                  src={screenshotUrl}
                  alt="Device screenshot"
                  className="w-full h-auto block"
                  onError={() => {
                    // keep silent; user can refresh again
                  }}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="hi5-card p-3">
              <div className="text-xs opacity-70">User</div>
              <div className="font-semibold mt-1">{device.user ?? "—"}</div>
            </div>
            <div className="hi5-card p-3">
              <div className="text-xs opacity-70">IP</div>
              <div className="font-semibold mt-1">{device.ip ?? "—"}</div>
            </div>
            <div className="hi5-card p-3">
              <div className="text-xs opacity-70">Last seen</div>
              <div className="font-semibold mt-1">{device.lastSeen}</div>
            </div>
            <div className="hi5-card p-3">
              <div className="text-xs opacity-70">Tags</div>
              <div className="font-semibold mt-1 truncate">{device.tags.join(", ") || "—"}</div>
            </div>
          </div>

          <div className="hi5-card p-4">
            <div className="text-sm font-semibold">Quick actions</div>
            <div className="text-xs opacity-70 mt-1">Remote actions will be wired to WS commands next.</div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link className="hi5-btn-primary text-sm text-center" href={`/control/${device.id}?tab=remote`}>
                Remote
              </Link>
              <Link className="hi5-btn-ghost text-sm text-center" href={`/control/${device.id}?tab=terminal`}>
                Terminal
              </Link>
              <Link className="hi5-btn-ghost text-sm text-center" href={`/control/${device.id}?tab=files`}>
                Files
              </Link>
              <button className="hi5-btn-ghost text-sm" type="button" title="Soon">
                Reboot (soon)
              </button>
            </div>
          </div>

          {!compact ? (
            <div className="text-xs opacity-70 leading-relaxed">
              Next: WS auth for all actions, start/stop streamer commands, terminal streaming, file browser.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
