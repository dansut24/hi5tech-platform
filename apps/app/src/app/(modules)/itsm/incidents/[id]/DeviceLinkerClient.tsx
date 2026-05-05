"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Search, X } from "lucide-react";

type DeviceRow = {
  device_id: string;
  tenant_id: string;
  hostname?: string | null;
  os?: string | null;
  arch?: string | null;
  online?: boolean | null;
  last_seen_at?: string | null;
};

export default function DeviceLinkerClient({
  incidentId,
  tenantId,
  currentDeviceId,
}: {
  incidentId: string;
  tenantId: string;
  currentDeviceId?: string | null;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const searchUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("tenant_id", tenantId);
    if (q.trim()) params.set("q", q.trim());
    return `/api/itsm/devices/search?${params.toString()}`;
  }, [tenantId, q]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    fetch(searchUrl, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setDevices(Array.isArray(json) ? json : []);
      })
      .catch(() => {
        if (!cancelled) setDevices([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, searchUrl]);

  async function linkDevice(deviceId: string | null) {
    setBusy(true);
    setErr(null);

    try {
      const res = await fetch("/api/itsm/incidents/link-device", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          incident_id: incidentId,
          device_id: deviceId,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to update linked device");
      }

      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update linked device");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="hi5-btn-ghost text-sm w-full flex items-center justify-center gap-2"
        onClick={() => setOpen((v) => !v)}
      >
        <Link2 className="h-4 w-4" />
        {currentDeviceId ? "Change linked device" : "Link device"}
      </button>

      {currentDeviceId ? (
        <button
          type="button"
          className="hi5-btn-ghost text-sm w-full flex items-center justify-center gap-2 text-red-500 disabled:opacity-50"
          disabled={busy}
          onClick={() => linkDevice(null)}
        >
          <X className="h-4 w-4" />
          Unlink device
        </button>
      ) : null}

      {open ? (
        <div className="rounded-2xl border hi5-border hi5-card p-3 space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              className="hi5-input pl-9"
              placeholder="Search hostname, OS or device ID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {err ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600">
              {err}
            </div>
          ) : null}

          <div className="max-h-64 overflow-auto divide-y hi5-divider">
            {devices.map((d) => {
              const name = d.hostname || d.device_id;
              const active = d.device_id === currentDeviceId;

              return (
                <button
                  key={d.device_id}
                  type="button"
                  disabled={busy || active}
                  onClick={() => linkDevice(d.device_id)}
                  className="w-full text-left px-2 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{name}</div>
                      <div className="text-xs opacity-70 truncate">
                        {d.os || "OS unknown"} {d.arch ? `• ${d.arch}` : ""}
                      </div>
                    </div>
                    <span className="text-xs opacity-70">
                      {active ? "Linked" : d.online ? "Online" : "Offline"}
                    </span>
                  </div>
                </button>
              );
            })}

            {!devices.length ? (
              <div className="px-2 py-3 text-sm opacity-70">No devices found.</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
