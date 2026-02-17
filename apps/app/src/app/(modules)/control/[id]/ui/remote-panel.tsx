// apps/app/src/app/(modules)/control/[id]/ui/remote-panel.tsx
//
// Handles the "Remote" tab on the device page.
//
// Flow:
//   1. User clicks "Connect" → POST /api/control/session to get a signed token
//   2. We build a hi5tech:// deep link and call window.location to launch it
//   3. We detect if the app didn't open (via a visibility-change / blur heuristic)
//      and show an install prompt with a download link if it seems missing.
//
// Place at: apps/app/src/app/(modules)/control/[id]/ui/remote-panel.tsx

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status =
  | "idle"
  | "requesting"     // fetching session token
  | "launching"      // deep link sent, waiting to see if app opened
  | "launched"       // app seems to have opened (window blurred)
  | "not_installed"  // app did not open (no blur after timeout)
  | "error";

const VIEWER_DOWNLOAD_URL = "https://rmm.hi5tech.co.uk/downloads/Hi5TechViewer-Setup.exe";

export default function RemotePanel({ deviceId }: { deviceId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const launchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didBlur = useRef(false);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (launchTimer.current) clearTimeout(launchTimer.current);
    };
  }, []);

  const handleConnect = useCallback(async () => {
    setStatus("requesting");
    setErrorMsg("");
    didBlur.current = false;

    // --- 1. Request a signed session token from our Next.js API ---
    let sessionData: { session_id: string; token: string; device_id: string; wss_url: string };
    try {
      const res = await fetch("/api/control/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": "tnt_demo", // replace with real auth session
        },
        body: JSON.stringify({ device_id: deviceId }),
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

    // --- 2. Build the deep link and fire it ---
    // Format: hi5tech://connect?session_id=xxx&token=yyy&wss_url=zzz&device_id=aaa
    const params = new URLSearchParams({
      session_id: sessionData.session_id,
      token: sessionData.token,
      device_id: sessionData.device_id,
      wss_url: sessionData.wss_url,
    });
    const deepLink = `hi5tech://connect?${params.toString()}`;

    setStatus("launching");

    // --- 3. Detect whether Electron opened ---
    // The heuristic: if the browser window loses focus within 2 seconds, the
    // OS opened another app (Electron). If it doesn't blur, we assume it's not
    // installed and show the download prompt.
    const onBlur = () => {
      didBlur.current = true;
      setStatus("launched");
      window.removeEventListener("blur", onBlur);
      if (launchTimer.current) clearTimeout(launchTimer.current);
    };
    window.addEventListener("blur", onBlur);

    // Fire the link
    window.location.href = deepLink;

    // Give the OS 2.5 seconds to open the app
    launchTimer.current = setTimeout(() => {
      window.removeEventListener("blur", onBlur);
      if (!didBlur.current) {
        setStatus("not_installed");
      }
    }, 2500);
  }, [deviceId]);

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold">Remote Desktop</div>
      <p className="text-sm opacity-75">
        Connect opens the Hi5Tech Viewer app on your computer and streams the remote
        desktop directly over an encrypted WebRTC connection. No data passes through
        our servers — only the signalling handshake does.
      </p>

      {/* Main connect card */}
      <div className="hi5-card p-6 flex flex-col items-center gap-4 text-center">
        {/* Status icon */}
        <div className="w-16 h-16 rounded-full bg-[rgba(var(--hi5-accent),0.12)] border border-[rgba(var(--hi5-accent),0.25)] flex items-center justify-center">
          {status === "launched" ? (
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : status === "not_installed" ? (
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          ) : status === "error" ? (
            <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-8 h-8 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        {/* Status text */}
        {status === "idle" && (
          <>
            <div>
              <div className="font-semibold">Ready to connect</div>
              <div className="text-sm opacity-70 mt-1">
                Device ID: <span className="font-mono">{deviceId}</span>
              </div>
            </div>
            <button className="hi5-btn-primary px-8 py-2.5 text-sm" onClick={handleConnect}>
              Connect
            </button>
          </>
        )}

        {status === "requesting" && (
          <>
            <div className="font-semibold">Requesting session…</div>
            <div className="text-sm opacity-60">Generating a secure session token</div>
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          </>
        )}

        {status === "launching" && (
          <>
            <div className="font-semibold">Launching viewer…</div>
            <div className="text-sm opacity-60">
              Your browser should ask to open the Hi5Tech Viewer app.
            </div>
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          </>
        )}

        {status === "launched" && (
          <>
            <div className="font-semibold text-emerald-400">Viewer opened</div>
            <div className="text-sm opacity-70">
              The Hi5Tech Viewer should now be connecting to <span className="font-mono">{deviceId}</span>.
            </div>
            <button
              className="hi5-btn-ghost text-sm"
              onClick={() => setStatus("idle")}
            >
              Connect again
            </button>
          </>
        )}

        {status === "not_installed" && (
          <>
            <div className="font-semibold text-amber-400">Viewer not detected</div>
            <div className="text-sm opacity-70 max-w-sm">
              The Hi5Tech Viewer app doesn't appear to be installed on this computer.
              Download and install it, then try connecting again.
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              <a
                href={VIEWER_DOWNLOAD_URL}
                className="hi5-btn-primary text-sm"
                download
              >
                Download Viewer
              </a>
              <button
                className="hi5-btn-ghost text-sm"
                onClick={handleConnect}
              >
                Try again
              </button>
            </div>
            <div className="text-xs opacity-50 mt-1">
              Windows · macOS · Linux
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="font-semibold text-rose-400">Connection failed</div>
            <div className="text-sm opacity-70 font-mono bg-black/20 rounded px-3 py-2 max-w-sm break-all">
              {errorMsg}
            </div>
            <button className="hi5-btn-ghost text-sm" onClick={() => setStatus("idle")}>
              Try again
            </button>
          </>
        )}
      </div>

      {/* Info footer */}
      <div className="text-xs opacity-50 space-y-1">
        <p>
          <strong>How it works:</strong> Clicking Connect asks our server to create a
          session token, then launches the viewer app on your computer via the{" "}
          <code className="font-mono">hi5tech://</code> protocol. The viewer uses that
          token to open an authenticated WebSocket to the RMM server for WebRTC
          signalling, then streams video directly from the agent — peer to peer.
        </p>
        <p>
          The viewer must be installed on <strong>the technician's computer</strong>,
          not the remote device.
        </p>
      </div>
    </div>
  );
}
