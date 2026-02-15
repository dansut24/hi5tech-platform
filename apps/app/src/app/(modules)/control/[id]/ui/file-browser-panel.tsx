"use client";

import { useEffect, useState } from "react";

type FileItem = {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  mtime?: string;
};

const DEFAULT_ROOT_WIN = "C:\\";
const DEFAULT_ROOT_NIX = "/";

export default function FileBrowserPanel({ deviceId }: { deviceId: string }) {
  const [path, setPath] = useState<string>(DEFAULT_ROOT_WIN);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/control/files/list?device_id=${encodeURIComponent(deviceId)}&path=${encodeURIComponent(path)}`,
        {
          headers: {
            // TEMP until real auth
            "X-Tenant-ID": "tnt_demo",
          },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText}${txt ? `: ${txt}` : ""}`);
      }

      const data = await res.json();
      setItems((data.items ?? []) as FileItem[]);
    } catch (e: any) {
      setErr(e?.message ?? "File list not available yet (wire backend).");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // quick heuristic: switch default root if user types "/" first
  useEffect(() => {
    if (path.startsWith(DEFAULT_ROOT_NIX)) return;
    // leave as-is; Windows is your likely default right now
  }, [path]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Files</div>
          <p className="text-sm opacity-75 mt-1">
            This is the Control UI file browser. Next step: proxy to Go control server file APIs (Postgres-backed auth +
            device routing).
          </p>
        </div>
        <div className="flex gap-2">
          <button className="hi5-btn-ghost text-sm" type="button" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {err ? <div className="text-sm text-red-300">{err}</div> : null}
      {loading ? <div className="text-xs opacity-70">Loading…</div> : null}

      <div className="hi5-panel p-4">
        <div className="text-xs opacity-70 mb-1">Path</div>
        <div className="flex gap-2">
          <input className="hi5-input font-mono text-sm" value={path} onChange={(e) => setPath(e.target.value)} />
          <button className="hi5-btn-primary text-sm" type="button" onClick={refresh} disabled={loading}>
            Go
          </button>
        </div>

        <div className="mt-4 space-y-2 max-h-[420px] overflow-auto pr-1">
          {items.length === 0 ? (
            <div className="text-sm opacity-70">No items (or backend not wired yet).</div>
          ) : (
            items.map((it) => (
              <div key={it.path} className="hi5-panel p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {it.is_dir ? "📁 " : "📄 "}
                    {it.name}
                  </div>
                  <div className="text-[11px] opacity-70 font-mono truncate">{it.path}</div>
                </div>
                <div className="text-[11px] opacity-70 font-mono whitespace-nowrap">
                  {it.is_dir ? "DIR" : it.size ? `${it.size}b` : "—"}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 text-xs opacity-70">
          Next endpoints: download/upload/delete/rename + dual-pane transfers.
        </div>
      </div>
    </div>
  );
}
