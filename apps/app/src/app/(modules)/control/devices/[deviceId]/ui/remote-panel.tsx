// apps/app/src/app/(modules)/control/[id]/ui/remote-panel.tsx
//
// Handles the "Remote" tab on the device page.
//
// Provides two locked launch paths:
//   - Remote Control     -> mode=console
//   - Background Mode    -> mode=backstage
//
// After every launch attempt we show a fallback modal so first-time technicians
// can download the user-installed viewer and then launch the same session again.

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

const VIEWER_DOWNLOAD_URL = "/downloads/Hi5TechViewerSetup.exe";

function modeTitle(mode: LaunchMode) {
  return mode === "backstage" ? "Background Mode" : "Remote Control";
}

function modeDescription(mode: LaunchMode) {
  return mode === "backstage"
    ? "Launches directly into the private Backstage Desktop. The user console is not streamed and the viewer cannot switch back to console."
    : "Launches directly into the active user console. Backstage switching is disabled for this session.";
}

function LaunchModal({
  status,
  mode,
  deviceId,
  deepLink,
  errorMsg,
  onLaunchAgain,
  onClose,
}: {
  status: Status;
  mode: LaunchMode;
  deviceId: string;
  deepLink: string;
  errorMsg: string;
  onLaunchAgain: () => void;
  onClose: () => void;
}) {
  if (status === "idle" || status === "requesting") return null;

  const isError = status === "error";
  const isMissing = status === "not_installed";
  const isOpened = status === "launched";

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
              {modeTitle(mode)} for <span className="font-mono">{deviceId}</span>
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
              <div className="mt-2 break-all font-mono text-xs opacity-90">{errorMsg}</div>
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
            <div>
              Your browser may ask for permission to open Hi5Tech Viewer. Allow it to continue.
            </div>
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

export default function RemotePanel({ deviceId }: { deviceId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeMode, setActiveMode] = useState<LaunchMode | null>(null);
  const [activeDeepLink, setActiveDeepLink] = useState("");
  const launchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didBlur = useRef(false);

  useEffect(() => {
    return () => {
      if (launchTimer.current) clearTimeout(launchTimer.current);
    };
  }, []);

  const fireDeepLink = useCallback((deepLink: string) => {
    if (!deepLink) return;
    didBlur.current = false;
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
  }, []);

  const handleConnect = useCallback(async (mode: LaunchMode) => {
    setStatus("requesting");
    setErrorMsg("");
    setActiveMode(mode);
    setActiveDeepLink("");

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

    setActiveMode(finalMode);
    setActiveDeepLink(deepLink);
    fireDeepLink(deepLink);
  }, [deviceId, fireDeepLink]);

  const busy = status === "requesting" || status === "launching";

  return (
    <div className="space-y-4">
      <LaunchModal
        status={status}
        mode={activeMode ?? "console"}
        deviceId={deviceId}
        deepLink={activeDeepLink}
        errorMsg={errorMsg}
        onLaunchAgain={() => fireDeepLink(activeDeepLink)}
        onClose={() => setStatus("idle")}
      />

      <div>
        <div className="text-lg font-semibold">Remote Desktop</div>
        <p className="mt-1 text-sm opacity-75">
          Choose how this remote session should open. The selected mode is locked
          into the session by the portal, control server, viewer, and agent.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(["console", "backstage"] as LaunchMode[]).map((mode) => (
          <div key={mode} className="hi5-card flex flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[rgba(var(--hi5-accent),0.25)] bg-[rgba(var(--hi5-accent),0.12)]">
                {mode === "backstage" ? (
                  <svg className="h-6 w-6 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div>
                <div className="font-semibold">{modeTitle(mode)}</div>
                <div className="mt-1 text-sm opacity-70">{modeDescription(mode)}</div>
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

      <div className="hi5-card border border-white/10 p-4 text-sm">
        <div className="font-semibold">First time using this technician PC?</div>
        <div className="mt-1 opacity-70">
          Install the Hi5Tech Viewer once, then Remote Control and Background Mode will launch directly from the portal.
        </div>
        <a href={VIEWER_DOWNLOAD_URL} className="mt-3 inline-flex hi5-btn-ghost text-sm" download>
          Download Viewer
        </a>
      </div>

      {status === "error" && (
        <div className="hi5-card border border-rose-500/25 p-4 text-sm text-rose-300">
          <div className="font-semibold">Connection failed</div>
          <div className="mt-1 break-all font-mono">{errorMsg}</div>
        </div>
      )}

      <div className="space-y-1 text-xs opacity-50">
        <p>
          <strong>How it works:</strong> the portal creates a short-lived session token
          with a fixed mode, launches the viewer using <code className="font-mono">hi5tech://</code>,
          and the control server forwards the selected mode to the agent.
        </p>
        <p>The viewer must be installed on <strong>the technician&apos;s computer</strong>, not the remote device.</p>
      </div>
    </div>
  );
}
