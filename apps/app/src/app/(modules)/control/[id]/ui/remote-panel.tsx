// apps/app/src/app/(modules)/control/[id]/ui/remote-panel.tsx
//
// Handles the "Remote" tab on the device page.
//
// Provides two locked launch paths:
//   - Remote Control     -> mode=console
//   - Background Mode    -> mode=backstage
//
// The viewer and agent enforce the selected mode. A console session cannot switch
// into backstage, and a backstage session cannot switch back to the user's console.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status =
  | "idle"
  | "requesting"
  | "launching"
  | "launched"
  | "not_installed"
  | "error";

type LaunchMode = "console" | "backstage";

const VIEWER_DOWNLOAD_URL = "https://rmm.hi5tech.co.uk/downloads/Hi5TechViewer-Setup.exe";

function modeTitle(mode: LaunchMode) {
  return mode === "backstage" ? "Background Mode" : "Remote Control";
}

function modeDescription(mode: LaunchMode) {
  return mode === "backstage"
    ? "Launches directly into the private Backstage Desktop. The user console is not streamed and the viewer cannot switch back to console."
    : "Launches directly into the active user console. Backstage switching is disabled for this session.";
}

export default function RemotePanel({ deviceId }: { deviceId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeMode, setActiveMode] = useState<LaunchMode | null>(null);
  const launchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didBlur = useRef(false);

  useEffect(() => {
    return () => {
      if (launchTimer.current) clearTimeout(launchTimer.current);
    };
  }, []);

  const handleConnect = useCallback(async (mode: LaunchMode) => {
    setStatus("requesting");
    setErrorMsg("");
    setActiveMode(mode);
    didBlur.current = false;

    let sessionData: {
      session_id: string;
      token: string;
      device_id: string;
      wss_url: string;
      mode?: LaunchMode;
    };

    try {
      const res = await fetch("/api/control/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": "tnt_demo", // replace with real auth session
        },
        body: JSON.stringify({ device_id: deviceId, mode }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as any)?.error ?? `HTTP ${res.status}`);
      }
      sessionData = await res.json();
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message ?? "Failed to create session");
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

    setStatus("launching");

    const onBlur = () => {
      didBlur.current = true;
      setStatus("launched");
      window.removeEventListener("blur", onBlur);
      if (launchTimer.current) clearTimeout(launchTimer.current);
    };
    window.addEventListener("blur", onBlur);
    window.location.href = deepLink;

    launchTimer.current = setTimeout(() => {
      window.removeEventListener("blur", onBlur);
      if (!didBlur.current) setStatus("not_installed");
    }, 2500);
  }, [deviceId]);

  const busy = status === "requesting" || status === "launching";

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">Remote Desktop</div>
        <p className="text-sm opacity-75 mt-1">
          Choose how this remote session should open. The selected mode is locked
          into the session by the portal, control server, viewer, and agent.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(["console", "backstage"] as LaunchMode[]).map((mode) => (
          <div key={mode} className="hi5-card p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-[rgba(var(--hi5-accent),0.12)] border border-[rgba(var(--hi5-accent),0.25)] flex items-center justify-center shrink-0">
                {mode === "backstage" ? (
                  <svg className="w-6 h-6 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div>
                <div className="font-semibold">{modeTitle(mode)}</div>
                <div className="text-sm opacity-70 mt-1">{modeDescription(mode)}</div>
              </div>
            </div>

            <button
              className={mode === "backstage" ? "hi5-btn-ghost text-sm" : "hi5-btn-primary text-sm"}
              type="button"
              disabled={busy}
              onClick={() => handleConnect(mode)}
            >
              {busy && activeMode === mode
                ? status === "requesting"
                  ? "Requesting…"
                  : "Launching…"
                : mode === "backstage"
                  ? "Start Background Mode"
                  : "Start Remote Control"}
            </button>
          </div>
        ))}
      </div>

      {status === "launched" && (
        <div className="hi5-card p-4 border border-emerald-500/25 text-sm text-emerald-300">
          {modeTitle(activeMode ?? "console")} opened. The viewer should now be connecting to <span className="font-mono">{deviceId}</span>.
        </div>
      )}

      {status === "not_installed" && (
        <div className="hi5-card p-4 border border-amber-500/25 text-sm text-amber-300">
          Viewer not detected. <a href={VIEWER_DOWNLOAD_URL} className="underline" download>Download Hi5Tech Viewer</a>, install it, then try again.
        </div>
      )}

      {status === "error" && (
        <div className="hi5-card p-4 border border-rose-500/25 text-sm text-rose-300">
          <div className="font-semibold">Connection failed</div>
          <div className="font-mono break-all mt-1">{errorMsg}</div>
        </div>
      )}

      <div className="text-xs opacity-50 space-y-1">
        <p>
          <strong>How it works:</strong> the portal creates a short-lived session token
          with a fixed mode, launches the viewer using <code className="font-mono">hi5tech://</code>,
          and the control server forwards the selected mode to the agent.
        </p>
        <p>The viewer must be installed on <strong>the technician's computer</strong>, not the remote device.</p>
      </div>
    </div>
  );
}
