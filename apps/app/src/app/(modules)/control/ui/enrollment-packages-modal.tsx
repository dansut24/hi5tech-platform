"use client";

import { useEffect, useMemo, useState } from "react";

type PackageStatus = "active" | "revoked";

type EnrollmentPackage = {
  id: string;
  tenant_id: string;
  group_id: string;
  name: string;
  status: PackageStatus;
  secret_hint?: string;
  created_at: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      // TEMP for testing until you wire real auth:
      "X-Tenant-ID": "tnt_demo",
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export default function EnrollmentPackagesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [pkgs, setPkgs] = useState<EnrollmentPackage[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("default");

  const active = useMemo(() => pkgs.filter((p) => p.status === "active"), [pkgs]);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const data = await api<{ packages: EnrollmentPackage[] }>("/api/admin/enrollment-packages");
      setPkgs(data.packages ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function createPackage() {
    if (!name.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      await api("/api/admin/enrollment-packages", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), group_id: groupId.trim() }),
      });
      setName("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create");
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    setLoading(true);
    setErr(null);
    try {
      await api(`/api/admin/enrollment-packages/revoke?id=${encodeURIComponent(id)}`, { method: "POST" });
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to revoke");
      setLoading(false);
    }
  }

  async function rotate(id: string) {
    setLoading(true);
    setErr(null);
    try {
      await api(`/api/admin/enrollment-packages/rotate?id=${encodeURIComponent(id)}`, { method: "POST" });
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to rotate");
      setLoading(false);
    }
  }

  function downloadMSI() {
    window.open("/api/admin/agent/download/msi", "_blank");
  }
  function downloadMST(id: string) {
    window.open(`/api/admin/enrollment-packages/download/mst?id=${encodeURIComponent(id)}`, "_blank");
  }
  function downloadEXE(id: string) {
    window.open(`/api/admin/enrollment-packages/download/exe?id=${encodeURIComponent(id)}`, "_blank");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(980px,92vw)] -translate-x-1/2 -translate-y-1/2 hi5-panel p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-extrabold">Agent downloads</div>
            <div className="text-sm opacity-70 mt-1">
              Create revocable enrollment packages, then download MSI/MST for MDMs or EXE for quick installs.
            </div>
          </div>
          <button className="hi5-btn-ghost text-sm" onClick={onClose}>Close</button>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_.9fr] gap-4">
          <div className="hi5-panel p-4">
            <div className="text-sm font-semibold">Create enrollment package</div>
            <div className="text-xs opacity-70 mt-1">Packages are long-lived and can be revoked/rotated.</div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block text-sm sm:col-span-2">
                <div className="text-xs opacity-70 mb-1">Name</div>
                <input className="hi5-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. UK Servers – Auto Enrol" />
              </label>
              <label className="block text-sm">
                <div className="text-xs opacity-70 mb-1">Group ID</div>
                <input className="hi5-input" value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="default" />
              </label>
            </div>

            <div className="mt-3 flex gap-2">
              <button className="hi5-btn-primary text-sm" onClick={createPackage} disabled={loading || !name.trim()}>
                Create
              </button>
              <button className="hi5-btn-ghost text-sm" onClick={refresh} disabled={loading}>
                Refresh
              </button>
              <div className="flex-1" />
              <button className="hi5-btn-ghost text-sm" onClick={downloadMSI}>
                Download MSI (generic)
              </button>
            </div>

            {err ? <div className="mt-3 text-sm text-red-300">{err}</div> : null}
          </div>

          <div className="hi5-panel p-4">
            <div className="text-sm font-semibold">Active packages</div>
            <div className="text-xs opacity-70 mt-1">Use MSI+MST for MDM, or EXE for quick deployment.</div>

            <div className="mt-3 space-y-2 max-h-[360px] overflow-auto pr-1">
              {loading && pkgs.length === 0 ? (
                <div className="text-sm opacity-70">Loading…</div>
              ) : active.length === 0 ? (
                <div className="text-sm opacity-70">No active packages yet.</div>
              ) : (
                active.map((p) => (
                  <div key={p.id} className="hi5-panel p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs opacity-70 mt-1">
                          Group: <span className="font-mono">{p.group_id}</span> · ID: <span className="font-mono">{p.id}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button className="hi5-btn-ghost text-xs" onClick={() => downloadMST(p.id)}>MST</button>
                        <button className="hi5-btn-ghost text-xs" onClick={() => downloadEXE(p.id)}>EXE</button>
                        <button className="hi5-btn-ghost text-xs" onClick={() => rotate(p.id)}>Rotate</button>
                        <button className="hi5-btn-primary text-xs" onClick={() => revoke(p.id)}>Revoke</button>
                      </div>
                    </div>

                    <div className="mt-2 text-xs opacity-70">
                      Suggested deployment:
                      <div className="mt-1 font-mono text-[11px] opacity-90 break-all">
                        msiexec /i Hi5TechAgent.msi /qn TRANSFORMS="{p.name}.mst"
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 text-xs opacity-70">
              Revoked packages remain downloadable, but installs will fail because <span className="font-semibold">enroll_ticket</span> issuance is blocked.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
