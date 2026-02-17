// apps/app/src/app/(modules)/control/ui/device-details-panel.tsx
"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import type { DeviceRow } from "./device-data";

function pill(status: DeviceRow["status"]) {
  if (status === "online") return "bg-emerald-500/10 border-emerald-500/25 text-emerald-100";
  if (status === "warning") return "bg-amber-500/10 border-amber-500/25 text-amber-100";
  return "bg-rose-500/10 border-rose-500/25 text-rose-100";
}

const API_BASE =
  process.env.NEXT_PUBLIC_RMM_API_BASE?.replace(/\/+$/, "") || "https://rmm.hi5tech.co.uk";

type ConnectState = "idle" | "requesting" | "launching" | "done" | "not_installed" | "error";

export default function DeviceDetailsPanel({
  device,
  compact,
}: {
  device: DeviceRow | null;
  compact?: boolean;
}) {
  const [shotTick, setShotTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [connectState, setConnectState] = useState<ConnectState>("idle");
  const [connectErr, setConnectErr] = useState("");
  const didBlur = useRef(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setTimeout(() => setShotTick((x) => x + 1), 700);
    } finally {
      setBusy(false);
    }
  }

  const handleConnect = useCallback(async () => {
    if (!device?.id) return;
    setConnectState("requesting");
    setConnectErr("");
    didBlur.current = false;

    // 1. Fetch session token
    let sessionData: { session_id: string; token: string; device_id: string; wss_url: string };
    try {
      const res = await fetch("/api/control/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": "tnt_demo",
        },
        body: JSON.stringify({ device_id: device.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as any)?.error ?? `HTTP ${res.status}`);
      }
      sessionData = await res.json();
    } catch (e: any) {
      setConnectState("error");
      setConnectErr(e?.message ?? "Failed to create session");
      return;
    }

    // 2. Build deep link
    const params = new URLSearchParams({
      session_id: sessionData.session_id,
      token: sessionData.token,
      device_id: sessionData.device_id,
      wss_url: sessionData.wss_url,
    });
    const deepLink = `hi5tech://connect?${params.toString()}`;

    setConnectState("launching");

    // 3. Blur detection heuristic
    const onBlur = () => {
      didBlur.current = true;
      setConnectState("done");
      window.removeEventListener("blur", onBlur);
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
    window.addEventListener("blur", onBlur);
    window.location.href = deepLink;

    blurTimer.current = setTimeout(() => {
      window.removeEventListener("blur", onBlur);
      if (!didBlur.current) setConnectState("not_installed");
    }, 2500);
  }, [device?.id]);

  const connectLabel = {
    idle: "Connect",
    requesting: "Requesting…",
    launching: "Launching…",
    done: "Opened ✓",
    not_installed: "Not installed",
    error: "Failed",
  }[connectState];

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
                <div className="text-xs opacity-70 mt-1">Click refresh to request a screenshot.</div>
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
                <img
                  src={screenshotUrl}
                  alt="Device screenshot"
                  className="w-full h-auto block"
                  onError={() => {}}
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

          {/* Quick actions */}
          <div className="hi5-card p-4">
            <div className="text-sm font-semibold">Quick actions</div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {/* Connect button — fires deep link */}
              <button
                className={[
                  "hi5-btn-primary text-sm",
                  connectState === "done" ? "opacity-80" : "",
                  connectState === "not_installed" || connectState === "error"
                    ? "hi5-btn-ghost border-rose-500/40 text-rose-300"
                    : "",
                ].join(" ")}
                type="button"
                disabled={
                  device.status !== "online" ||
                  connectState === "requesting" ||
                  connectState === "launching"
                }
                onClick={handleConnect}
                title={device.status !== "online" ? "Device must be online" : "Launch remote viewer"}
              >
                {connectLabel}
              </button>

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

            {/* Inline feedback for not_installed / error states */}
            {connectState === "not_installed" && (
              <div className="mt-3 text-xs text-amber-300">
                Viewer not detected.{" "}
                <a
                  href="https://rmm.hi5tech.co.uk/downloads/Hi5TechViewer-Setup.exe"
                  className="underline"
                  download
                >
                  Download Hi5Tech Viewer
                </a>
              </div>
            )}
            {connectState === "error" && (
              <div className="mt-3 text-xs text-rose-300 font-mono break-all">{connectErr}</div>
            )}
          </div>

          {!compact && (
            <div className="text-xs opacity-50 leading-relaxed">
              Connect launches the Hi5Tech Viewer on your computer via the{" "}
              <code className="font-mono">hi5tech://</code> protocol. Video streams
              direct device-to-viewer over WebRTC — only the signalling handshake
              goes through our servers.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
