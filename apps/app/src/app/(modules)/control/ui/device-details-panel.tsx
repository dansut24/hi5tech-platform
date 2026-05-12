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

const VIEWER_DOWNLOAD_URL = "/downloads/Hi5TechViewerSetup.exe";

type ConnectState = "idle" | "requesting" | "launching" | "done" | "not_installed" | "error";
type LaunchMode = "console" | "backstage";

function modeTitle(mode: LaunchMode) {
  return mode === "backstage" ? "Background Mode" : "Remote Control";
}

function LaunchModal({
  state,
  mode,
  deviceName,
  deepLink,
  error,
  onLaunchAgain,
  onClose,
}: {
  state: ConnectState;
  mode: LaunchMode;
  deviceName: string;
  deepLink: string;
  error: string;
  onLaunchAgain: () => void;
  onClose: () => void;
}) {
  if (state === "idle" || state === "requesting") return null;

  const isError = state === "error";
  const isMissing = state === "not_installed";
  const isOpened = state === "done";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="hi5-panel w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-extrabold">
              {isError
                ? "Remote session failed"
                : isMissing
                  ? "Install Hi5Tech Viewer"
                  : isOpened
                    ? "Viewer opened"
                    : "Opening Hi5Tech Viewer…"}
            </div>
            <div className="mt-1 text-sm opacity-70">
              {modeTitle(mode)} for <span className="font-mono">{deviceName}</span>
            </div>
          </div>
          <button className="hi5-btn-ghost px-3 py-1 text-sm" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4 text-sm leading-relaxed">
          {isError ? (
            <div className="text-rose-300">
              <div className="font-semibold">Could not create or launch the session.</div>
              <div className="mt-2 break-all font-mono text-xs opacity-90">{error}</div>
            </div>
          ) : isMissing ? (
            <div className="text-amber-200">
              The viewer did not appear to open. Install the viewer, then click <strong>Launch again</strong>.
            </div>
          ) : isOpened ? (
            <div className="text-emerald-300">
              The viewer should now be connecting. Keep this browser page open if you want to launch again.
            </div>
          ) : (
            <div>Your browser may ask for permission to open Hi5Tech Viewer. Allow it to continue.</div>
          )}
        </div>

        {!isError && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button className="hi5-btn-primary text-sm" type="button" onClick={onLaunchAgain} disabled={!deepLink}>
              Launch again
            </button>
            <a className="hi5-btn-ghost text-center text-sm" href={VIEWER_DOWNLOAD_URL} download>
              Download Viewer
            </a>
          </div>
        )}

        <div className="mt-4 text-xs opacity-55">
          First time on this technician PC? Download and install the viewer once. It installs per-user into AppData and registers the <code className="font-mono">hi5tech://</code> launch protocol.
        </div>
      </div>
    </div>
  );
}

export default function DeviceDetailsPanel({
  device,
  compact,
  onDelete,
  deleting,
}: {
  device: DeviceRow | null;
  compact?: boolean;
  onDelete?: (device: DeviceRow) => void;
  deleting?: boolean;
}) {
  const [shotTick, setShotTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [connectState, setConnectState] = useState<ConnectState>("idle");
  const [connectErr, setConnectErr] = useState("");
  const [connectMode, setConnectMode] = useState<LaunchMode | null>(null);
  const [connectDeepLink, setConnectDeepLink] = useState("");
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

  const fireDeepLink = useCallback((deepLink: string) => {
    if (!deepLink) return;
    didBlur.current = false;
    setConnectState("launching");

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
  }, []);

  const handleConnect = useCallback(async (mode: LaunchMode) => {
    if (!device?.id) return;
    setConnectState("requesting");
    setConnectErr("");
    setConnectMode(mode);
    setConnectDeepLink("");

    let sessionData: { session_id: string; token: string; device_id: string; wss_url: string; mode?: LaunchMode };
    try {
      const res = await fetch("/api/control/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": "tnt_demo",
        },
        body: JSON.stringify({ device_id: device.id, mode }),
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

    const finalMode: LaunchMode = sessionData.mode === "backstage" ? "backstage" : mode;
    const params = new URLSearchParams({
      session_id: sessionData.session_id,
      token: sessionData.token,
      device_id: sessionData.device_id,
      wss_url: sessionData.wss_url,
      mode: finalMode,
    });
    const deepLink = `hi5tech://connect?${params.toString()}`;

    setConnectMode(finalMode);
    setConnectDeepLink(deepLink);
    fireDeepLink(deepLink);
  }, [device?.id, fireDeepLink]);

  const connectLabel = (mode: LaunchMode) => {
    if (connectMode && connectMode !== mode && (connectState === "requesting" || connectState === "launching")) {
      return mode === "backstage" ? "Background Mode" : "Remote Control";
    }
    if (connectState === "requesting" && connectMode === mode) return "Requesting…";
    if (connectState === "launching" && connectMode === mode) return "Launching…";
    if (connectState === "done" && connectMode === mode) return "Opened ✓";
    if (connectState === "not_installed" && connectMode === mode) return "Not installed";
    if (connectState === "error" && connectMode === mode) return "Failed";
    return mode === "backstage" ? "Background Mode" : "Remote Control";
  };

  return (
    <div className="hi5-panel p-5">
      <LaunchModal
        state={connectState}
        mode={connectMode ?? "console"}
        deviceName={device?.name ?? device?.id ?? "selected device"}
        deepLink={connectDeepLink}
        error={connectErr}
        onLaunchAgain={() => fireDeepLink(connectDeepLink)}
        onClose={() => setConnectState("idle")}
      />

      {!device ? (
        <div className="text-sm opacity-80">Select a device to see details.</div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs opacity-70">Selected device</div>
              <div className="mt-1 truncate text-lg font-extrabold">{device.name}</div>
              <div className="mt-1 text-xs opacity-70">{device.os}</div>
            </div>
            <span className={["rounded-full border px-3 py-1 text-xs font-semibold", pill(device.status)].join(" ")}>
              {device.status.toUpperCase()}
            </span>
          </div>

          <div className="hi5-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Live preview</div>
                <div className="mt-1 text-xs opacity-70">Click refresh to request a screenshot.</div>
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
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/20">
              {device.status !== "online" ? (
                <div className="p-6 text-sm opacity-70">Device is offline.</div>
              ) : (
                <img
                  src={screenshotUrl}
                  alt="Device screenshot"
                  className="block h-auto w-full"
                  onError={() => {}}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="hi5-card p-3">
              <div className="text-xs opacity-70">User</div>
              <div className="mt-1 font-semibold">{device.user ?? "—"}</div>
            </div>
            <div className="hi5-card p-3">
              <div className="text-xs opacity-70">IP</div>
              <div className="mt-1 font-semibold">{device.ip ?? "—"}</div>
            </div>
            <div className="hi5-card p-3">
              <div className="text-xs opacity-70">Last seen</div>
              <div className="mt-1 font-semibold">{device.lastSeen}</div>
            </div>
            <div className="hi5-card p-3">
              <div className="text-xs opacity-70">Tags</div>
              <div className="mt-1 truncate font-semibold">{device.tags.join(", ") || "—"}</div>
            </div>
          </div>

          <div className="hi5-card p-4">
            <div className="text-sm font-semibold">Quick actions</div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className={[
                  "hi5-btn-primary text-sm",
                  connectState === "done" && connectMode === "console" ? "opacity-80" : "",
                  (connectState === "not_installed" || connectState === "error") && connectMode === "console"
                    ? "hi5-btn-ghost border-rose-500/40 text-rose-300"
                    : "",
                ].join(" ")}
                type="button"
                disabled={
                  device.status !== "online" ||
                  connectState === "requesting" ||
                  connectState === "launching"
                }
                onClick={() => handleConnect("console")}
                title={device.status !== "online" ? "Device must be online" : "Launch remote control in console mode"}
              >
                {connectLabel("console")}
              </button>

              <button
                className={[
                  "hi5-btn-ghost text-sm",
                  connectState === "done" && connectMode === "backstage" ? "opacity-80" : "",
                  (connectState === "not_installed" || connectState === "error") && connectMode === "backstage"
                    ? "border-rose-500/40 text-rose-300"
                    : "",
                ].join(" ")}
                type="button"
                disabled={
                  device.status !== "online" ||
                  connectState === "requesting" ||
                  connectState === "launching"
                }
                onClick={() => handleConnect("backstage")}
                title={device.status !== "online" ? "Device must be online" : "Launch private Backstage Desktop only"}
              >
                {connectLabel("backstage")}
              </button>

              <Link className="hi5-btn-ghost text-center text-sm" href={`/control/${device.id}?tab=terminal`}>
                Terminal
              </Link>
              <Link className="hi5-btn-ghost text-center text-sm" href={`/control/${device.id}?tab=files`}>
                Files
              </Link>
              <button className="hi5-btn-ghost text-sm" type="button" title="Soon">
                Reboot (soon)
              </button>
              {onDelete && (
                <button
                  className="hi5-btn-ghost text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
                  type="button"
                  disabled={deleting}
                  onClick={() => onDelete(device)}
                  title="Delete device"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>

            <div className="mt-3 text-xs opacity-60">
              First time on this technician PC?{" "}
              <a href={VIEWER_DOWNLOAD_URL} className="underline" download>
                Download Hi5Tech Viewer
              </a>
              .
            </div>

            {connectState === "error" && (
              <div className="mt-3 break-all font-mono text-xs text-rose-300">{connectErr}</div>
            )}
          </div>

          {!compact && (
            <div className="text-xs leading-relaxed opacity-50">
              Remote Control and Background Mode launch the Hi5Tech Viewer on your computer via the{" "}
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
