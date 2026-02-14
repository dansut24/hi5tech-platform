// apps/app/src/app/(modules)/control/devices/[id]/ui/device-tools-client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import TerminalPanel from "./terminal-panel";
import FileBrowserPanel from "./file-browser-panel";

type Tab = "terminal" | "files";

type ApiDevice = {
  device_id: string;
  hostname: string;
  os: string;
  arch?: string;
  last_seen_at?: string;
  online?: boolean;
};

function prettyOs(osRaw: string) {
  const v = String(osRaw || "").toLowerCase();
  if (v === "windows") return "Windows";
  if (v === "linux") return "Linux";
  if (v === "darwin" || v === "mac" || v === "macos") return "macOS";
  return osRaw;
}

export default function DeviceToolsClient({ deviceId }: { deviceId: string }) {
  const [tab, setTab] = useState<Tab>("terminal");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [device, setDevice] = useState<ApiDevice | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/control/devices", {
          headers: {
            // TEMP until real auth
            "X-Tenant-ID": "tnt_demo",
          },
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = (await res.json()) as unknown;

        const list = Array.isArray(data) ? (data as ApiDevice[]) : ((data as any)?.devices ?? []);
        const found = (list as ApiDevice[]).find((d) => d.device_id === deviceId) ?? null;

        if (!cancelled) setDevice(found);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load device");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  const header = useMemo(() => {
    if (!device) return null;
    return {
      name: device.hostname || device.device_id,
      os: `${prettyOs(device.os)}${device.arch ? ` · ${device.arch}` : ""}`,
      status: device.online ? "Online" : "Offline",
      id: device.device_id,
    };
  }, [device]);

  return (
    <div className="space-y-4">
      <div className="hi5-panel p-4">
        {loading ? <div className="text-sm opacity-70">Loading device…</div> : null}
        {err ? <div className="text-sm text-red-300">{err}</div> : null}

        {!loading && !err && header ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-lg font-extrabold">{header.name}</div>
              <div className="text-xs opacity-70 mt-1">
                {header.os} · {header.status} · ID: <span className="font-mono">{header.id}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className={tab === "terminal" ? "hi5-btn-primary text-sm" : "hi5-btn-ghost text-sm"}
                onClick={() => setTab("terminal")}
              >
                Terminal
              </button>
              <button
                type="button"
                className={tab === "files" ? "hi5-btn-primary text-sm" : "hi5-btn-ghost text-sm"}
                onClick={() => setTab("files")}
              >
                Files
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {tab === "terminal" ? <TerminalPanel deviceId={deviceId} /> : null}
      {tab === "files" ? <FileBrowserPanel deviceId={deviceId} /> : null}
    </div>
  );
}
