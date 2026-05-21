"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ActionRecord = {
  action_id: string;
  device_id: string;
  action_type: string;
  status: "queued" | "sent" | "running" | "completed" | "failed" | string;
  progress?: number;
  message?: string;
  result_json?: any;
  error_message?: string;
  updated_at?: string;
  created_at?: string;
};

type FileItem = {
  name: string;
  path: string;
  parent?: string;
  is_dir: boolean;
  size?: number | null;
  extension?: string;
  attributes?: string;
  created_at?: string;
  modified_at?: string;
  accessed_at?: string;
  hidden?: boolean;
  readonly?: boolean;
};

type DriveItem = {
  name: string;
  path: string;
  drive_type?: string;
  is_ready?: boolean;
  volume_label?: string;
  filesystem?: string;
  total_bytes?: number | null;
  free_bytes?: number | null;
};

const ROOT = "This PC";
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const MAX_DOWNLOAD_BYTES = 5 * 1024 * 1024;

function formatBytes(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = n;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size >= 10 || i === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[i]}`;
}

function formatDate(value: any) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function joinWinPath(parent: string, name: string) {
  if (!parent || parent === ROOT) return name;
  const clean = parent.endsWith("\\") || parent.endsWith("/") ? parent : `${parent}\\`;
  return `${clean}${name}`;
}

function normaliseResult(action: ActionRecord) {
  const result = action.result_json ?? {};
  if (result?.parsed && typeof result.parsed === "object") {
    return { ...result.parsed, ...result };
  }
  return result;
}

function actionFinished(action: ActionRecord) {
  return action.status === "completed" || action.status === "failed" || action.status === "cancelled";
}

function base64ToBlob(base64: string, mime = "application/octet-stream") {
  const binary = atob(base64);
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < binary.length; offset += 8192) {
    const slice = binary.slice(offset, offset + 8192);
    const bytes = new Uint8Array(slice.length);
    for (let i = 0; i < slice.length; i++) bytes[i] = slice.charCodeAt(i);
    chunks.push(bytes);
  }
  return new Blob(chunks, { type: mime });
}

async function fileToBase64(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

export default function FileBrowserPanel({ deviceId }: { deviceId: string }) {
  const [path, setPath] = useState(ROOT);
  const [inputPath, setInputPath] = useState(ROOT);
  const [parent, setParent] = useState<string | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [drives, setDrives] = useState<DriveItem[]>([]);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FileItem | null>(null);
  const [recentActions, setRecentActions] = useState<ActionRecord[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const breadcrumbs = useMemo(() => {
    if (!path || path === ROOT) return [{ label: ROOT, path: ROOT }];
    const normal = path.replace(/\/+$/g, "");
    const parts = normal.split(/[\\/]+/).filter(Boolean);
    if (parts.length === 0) return [{ label: ROOT, path: ROOT }];
    const root = normal.match(/^[A-Za-z]:/)?.[0];
    const crumbs = [{ label: ROOT, path: ROOT }];
    if (root) {
      let current = `${root}\\`;
      crumbs.push({ label: current, path: current });
      for (const part of parts.slice(1)) {
        current = joinWinPath(current, part);
        crumbs.push({ label: part, path: current });
      }
    } else {
      let current = normal.startsWith("/") ? "/" : "";
      for (const part of parts) {
        current = current === "/" ? `/${part}` : current ? `${current}/${part}` : part;
        crumbs.push({ label: part, path: current });
      }
    }
    return crumbs;
  }, [path]);

  async function createAction(actionType: string, payload: Record<string, any>) {
    const res = await fetch("/api/control/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        device_id: deviceId,
        action_type: actionType,
        payload,
        created_by: "portal",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? `Action failed: ${res.status}`);
    const action = data?.actions?.[0] as ActionRecord | undefined;
    if (!action?.action_id) throw new Error("Action was not created");
    return action;
  }

  async function readAction(actionId: string) {
    const res = await fetch(`/api/control/actions?action_id=${encodeURIComponent(actionId)}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.action) return data.action as ActionRecord;
      if (Array.isArray(data?.actions)) {
        const hit = data.actions.find((item: ActionRecord) => item.action_id === actionId);
        if (hit) return hit as ActionRecord;
      }
    }

    const list = await fetch(`/api/control/actions?device_id=${encodeURIComponent(deviceId)}&limit=50`, { cache: "no-store" });
    const data = await list.json().catch(() => ({}));
    const hit = (data?.actions ?? []).find((item: ActionRecord) => item.action_id === actionId);
    if (!hit) throw new Error("Unable to read action status");
    return hit as ActionRecord;
  }

  async function runAction(actionType: string, payload: Record<string, any>, message: string) {
    setBusyMessage(message);
    setError(null);
    const created = await createAction(actionType, payload);
    let current = created;
    for (let i = 0; i < 120; i++) {
      await new Promise((resolve) => setTimeout(resolve, i < 4 ? 500 : 1000));
      current = await readAction(created.action_id);
      setBusyMessage(`${current.message || message}${current.progress !== undefined ? ` (${current.progress}%)` : ""}`);
      if (actionFinished(current)) break;
    }
    setRecentActions((prev) => [current, ...prev.filter((item) => item.action_id !== current.action_id)].slice(0, 8));
    if (!actionFinished(current)) throw new Error("Action is still running. Refresh actions to check the result.");
    if (current.status !== "completed") throw new Error(current.error_message || current.message || "Action failed");
    return current;
  }

  const refreshActions = useCallback(async () => {
    try {
      const res = await fetch(`/api/control/actions?device_id=${encodeURIComponent(deviceId)}&limit=10`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setRecentActions((data?.actions ?? []) as ActionRecord[]);
    } catch {}
  }, [deviceId]);

  const refresh = useCallback(
    async (nextPath = path) => {
      setLoading(true);
      setBusyMessage("Listing files");
      setError(null);
      try {
        const action = await runAction(
          "list_files",
          { path: nextPath === ROOT ? "" : nextPath, include_hidden: includeHidden, limit: 1000, timeout_seconds: 120 },
          "Listing files"
        );
        const result = normaliseResult(action);
        setPath(result.path || nextPath || ROOT);
        setInputPath(result.path || nextPath || ROOT);
        setParent(result.parent ?? null);
        setDrives(Array.isArray(result.drives) ? result.drives : []);
        setItems(Array.isArray(result.items) ? result.items : []);
        setSelected(null);
      } catch (e: any) {
        setError(e?.message ?? "Failed to list files");
      } finally {
        setLoading(false);
        setBusyMessage(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, includeHidden]
  );

  useEffect(() => {
    refresh(ROOT);
    refreshActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  async function openPath(nextPath: string) {
    await refresh(nextPath);
  }

  async function downloadFile(item: FileItem) {
    if (item.is_dir) return;
    setLoading(true);
    setError(null);
    try {
      const action = await runAction(
        "download_file",
        { path: item.path, max_bytes: MAX_DOWNLOAD_BYTES, timeout_seconds: 180 },
        `Preparing ${item.name} for download`
      );
      const result = normaliseResult(action);
      const base64 = result.content_base64;
      if (!base64) throw new Error("No file content returned by agent");
      const blob = base64ToBlob(base64);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename || item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message ?? "Download failed");
    } finally {
      setLoading(false);
      setBusyMessage(null);
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setLoading(true);
    setError(null);
    try {
      const targetDir = path === ROOT ? "C:\\" : path;
      for (const file of list) {
        if (file.size > MAX_UPLOAD_BYTES) {
          throw new Error(`${file.name} is too large for this first pass. Max upload is ${formatBytes(MAX_UPLOAD_BYTES)}.`);
        }
        const contentBase64 = await fileToBase64(file);
        await runAction(
          "upload_file",
          {
            path: joinWinPath(targetDir, file.name),
            content_base64: contentBase64,
            overwrite: true,
            timeout_seconds: 300,
          },
          `Uploading ${file.name}`
        );
      }
      await refresh(targetDir);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setLoading(false);
      setBusyMessage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteItem(item: FileItem) {
    const warning = item.is_dir
      ? `Delete folder and all contents?\n\n${item.path}`
      : `Delete file?\n\n${item.path}`;
    if (!window.confirm(warning)) return;
    setLoading(true);
    setError(null);
    try {
      await runAction("delete_path", { path: item.path, recursive: item.is_dir, timeout_seconds: 180 }, `Deleting ${item.name}`);
      await refresh(path);
    } catch (e: any) {
      setError(e?.message ?? "Delete failed");
    } finally {
      setLoading(false);
      setBusyMessage(null);
    }
  }

  async function renameItem(item: FileItem) {
    const next = window.prompt("New name", item.name);
    if (!next || next === item.name) return;
    setLoading(true);
    setError(null);
    try {
      await runAction("rename_path", { path: item.path, new_name: next, timeout_seconds: 120 }, `Renaming ${item.name}`);
      await refresh(path);
    } catch (e: any) {
      setError(e?.message ?? "Rename failed");
    } finally {
      setLoading(false);
      setBusyMessage(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-lg font-semibold">Files</div>
          <p className="mt-1 text-sm opacity-75">
            Browse, download, upload, rename, and delete files through the online agent action channel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="hi5-btn-ghost text-sm" type="button" onClick={() => refresh(path)} disabled={loading}>
            Refresh
          </button>
          <button className="hi5-btn-primary text-sm" type="button" onClick={() => fileInputRef.current?.click()} disabled={loading || path === ROOT}>
            Upload
          </button>
          <input ref={fileInputRef} className="hidden" type="file" multiple onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
        </div>
      </div>

      <div
        className={`rounded-2xl border border-dashed p-4 transition ${dragActive ? "border-blue-400 bg-blue-500/10" : "border-white/10 bg-white/5"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (path === ROOT) {
            setError("Open a drive or folder before uploading.");
            return;
          }
          if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-1 text-xs opacity-75">
              {breadcrumbs.map((crumb, idx) => (
                <span key={`${crumb.path}-${idx}`} className="flex items-center gap-1">
                  {idx > 0 ? <span>/</span> : null}
                  <button className="rounded px-1.5 py-0.5 hover:bg-white/10" type="button" onClick={() => openPath(crumb.path)} disabled={loading}>
                    {crumb.label}
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="hi5-input font-mono text-sm" value={inputPath} onChange={(e) => setInputPath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && refresh(inputPath)} />
              <button className="hi5-btn-primary text-sm" type="button" onClick={() => refresh(inputPath)} disabled={loading}>
                Go
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs opacity-80">
            <input type="checkbox" checked={includeHidden} onChange={(e) => setIncludeHidden(e.target.checked)} />
            Show hidden
          </label>
        </div>
        <div className="mt-3 text-xs opacity-60">Drag files onto this panel to upload to the current folder.</div>
      </div>

      {busyMessage ? <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-100">{busyMessage}</div> : null}
      {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

      {path === ROOT ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {drives.length === 0 ? <div className="hi5-panel p-4 text-sm opacity-70">No drives returned yet.</div> : null}
          {drives.map((drive) => (
            <button key={drive.path} type="button" className="hi5-panel p-4 text-left hover:border-blue-400/40" onClick={() => openPath(drive.path)} disabled={!drive.is_ready || loading}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">💽 {drive.name}</div>
                  <div className="text-xs opacity-70">{drive.volume_label || drive.drive_type || "Drive"}</div>
                </div>
                <div className="text-xs opacity-70">{drive.filesystem || ""}</div>
              </div>
              <div className="mt-3 text-xs opacity-75">
                {drive.is_ready ? `${formatBytes(drive.free_bytes)} free of ${formatBytes(drive.total_bytes)}` : "Not ready"}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="hi5-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 p-3 text-xs opacity-75">
            <button className="rounded px-2 py-1 hover:bg-white/10" type="button" onClick={() => parent && openPath(parent)} disabled={!parent || loading}>
              ↑ Up
            </button>
            <div>{items.length} item(s)</div>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-950/90 text-left text-xs uppercase tracking-wide opacity-70 backdrop-blur">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Size</th>
                  <th className="px-3 py-2">Modified</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center opacity-70" colSpan={4}>
                      {loading ? "Loading…" : "No files in this folder."}
                    </td>
                  </tr>
                ) : null}
                {items.map((item) => (
                  <tr key={item.path} className={`border-t border-white/5 hover:bg-white/5 ${selected?.path === item.path ? "bg-blue-500/10" : ""}`} onClick={() => setSelected(item)}>
                    <td className="max-w-[440px] px-3 py-2">
                      <button className="min-w-0 text-left" type="button" onDoubleClick={() => item.is_dir && openPath(item.path)}>
                        <div className="truncate font-medium">
                          {item.is_dir ? "📁" : "📄"} {item.name}
                          {item.hidden ? <span className="ml-2 text-[10px] opacity-50">hidden</span> : null}
                          {item.readonly ? <span className="ml-2 text-[10px] opacity-50">readonly</span> : null}
                        </div>
                        <div className="truncate font-mono text-[11px] opacity-50">{item.path}</div>
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs opacity-75">{item.is_dir ? "Folder" : formatBytes(item.size)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs opacity-75">{formatDate(item.modified_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        {item.is_dir ? (
                          <button className="hi5-btn-ghost text-xs" type="button" onClick={() => openPath(item.path)} disabled={loading}>
                            Open
                          </button>
                        ) : (
                          <button className="hi5-btn-ghost text-xs" type="button" onClick={() => downloadFile(item)} disabled={loading}>
                            Download
                          </button>
                        )}
                        <button className="hi5-btn-ghost text-xs" type="button" onClick={() => renameItem(item)} disabled={loading}>
                          Rename
                        </button>
                        <button className="hi5-btn-ghost text-xs text-red-300" type="button" onClick={() => deleteItem(item)} disabled={loading}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="hi5-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Recent file jobs</div>
            <div className="text-xs opacity-60">Useful when an operation is still queued or running.</div>
          </div>
          <button className="hi5-btn-ghost text-xs" type="button" onClick={refreshActions}>
            Refresh jobs
          </button>
        </div>
        <div className="space-y-2">
          {recentActions.filter((a) => ["list_files", "download_file", "upload_file", "delete_path", "rename_path"].includes(a.action_type)).slice(0, 5).map((action) => (
            <div key={action.action_id} className="rounded-xl border border-white/10 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-mono">{action.action_type}</div>
                <div className="opacity-70">{action.status} · {action.progress ?? 0}%</div>
              </div>
              <div className="mt-1 opacity-70">{action.message || action.error_message || "—"}</div>
            </div>
          ))}
          {recentActions.filter((a) => ["list_files", "download_file", "upload_file", "delete_path", "rename_path"].includes(a.action_type)).length === 0 ? (
            <div className="text-xs opacity-60">No file jobs yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
