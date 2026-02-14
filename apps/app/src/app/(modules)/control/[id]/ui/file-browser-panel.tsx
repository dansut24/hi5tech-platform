// apps/app/src/app/(modules)/control/devices/[id]/ui/file-browser-panel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [leftPath, setLeftPath] = useState<string>(DEFAULT_ROOT_WIN);
  const [rightPath, setRightPath] = useState<string>(DEFAULT_ROOT_WIN);

  const [leftItems, setLeftItems] = useState<FileItem[]>([]);
  const [rightItems, setRightItems] = useState<FileItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function list(path: string): Promise<FileItem[]> {
    const res = await fetch(`/api/control/files/list?device_id=${encodeURIComponent(deviceId)}&path=${encodeURIComponent(path)}`, {
      headers: {
        // TEMP until real auth
        "X-Tenant-ID": "tnt_demo",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
    }

    const data = await res.json();
    return (data.items ?? []) as FileItem[];
  }

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const [l, r] = await Promise.all([list(leftPath), list(rightPath)]);
      setLeftItems(l);
      setRightItems(r);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to list files (backend not wired yet).");
      // provide a gentle fallback so UI doesn’t look dead
      setLeftItems([]);
      setRightItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hint = useMemo(() => {
    return "Next step: implement /api/control/files/list proxy to your Go control server (Postgres-backed).";
  }, []);

  return (
    <div className="hi5-panel p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">File browser</div>
          <div className="text-xs opacity-70 mt-1">{hint}</div>
        </div>

        <div className="flex gap-2">
          <button className="hi5-btn-ghost text-sm" type="button" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {err ? <div className="text-sm text-red-300">{err}</div> : null}
      {loading ? <div className="text-xs opacity-70">Loading…</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Pane title="Remote (Left)" path={leftPath} setPath={setLeftPath} items={leftItems} />
        <Pane title="Remote (Right)" path={rightPath} setPath={setRightPath} items={rightItems} />
      </div>

      <div className="text-xs opacity-70">
        Transfers will call endpoints like <span className="font-mono">/api/control/files/download</span> and{" "}
        <span className="font-mono">/api/control/files/upload</span> (we’ll add these next).
      </div>
    </div>
  );
}

function Pane({
  title,
  path,
  setPath,
  items,
}: {
  title: string;
  path: string;
  setPath: (p: string) => void;
  items: FileItem[];
}) {
  return (
    <div className="hi5-panel p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">{title}</div>
      </div>

      <div className="mt-2">
        <div className="text-xs opacity-70 mb-1">Path</div>
        <input className="hi5-input font-mono text-sm" value={path} onChange={(e) => setPath(e.target.value)} />
      </div>

      <div className="mt-3 max-h-[420px] overflow-auto pr-1 space-y-1">
        {items.length === 0 ? (
          <div className="text-sm opacity-70">No items (or backend not wired yet).</div>
        ) : (
          items.map((it) => (
            <div key={it.path} className="flex items-center justify-between gap-3 hi5-panel p-2">
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
    </div>
  );
}
