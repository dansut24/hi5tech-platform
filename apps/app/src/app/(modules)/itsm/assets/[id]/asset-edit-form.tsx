"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Archive, Loader2, Pencil, Save, Unlink, X } from "lucide-react";

type Asset = Record<string, any>;

type Props = {
  asset: Asset;
  hasLinkedDevice?: boolean;
};

function valueOf(value: any) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function dateValue(value: any) {
  if (!value) return "";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toISOString().slice(0, 10);
}

export default function AssetEditForm({ asset, hasLinkedDevice = false }: Props) {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [actionWorking, setActionWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: valueOf(asset.name),
    hostname: valueOf(asset.hostname),
    serial_number: valueOf(asset.serial_number),
    asset_tag: valueOf(asset.asset_tag),
    manufacturer: valueOf(asset.manufacturer),
    model: valueOf(asset.model),
    operating_system: valueOf(asset.operating_system),
    assigned_user_name: valueOf(asset.assigned_user_name),
    assigned_user_email: valueOf(asset.assigned_user_email),
    department: valueOf(asset.department),
    location: valueOf(asset.location),
    warranty_status: valueOf(asset.warranty_status),
    warranty_expires_at: dateValue(asset.warranty_expires_at),
    status: valueOf(asset.status || "active"),
    notes: valueOf(asset.notes),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [open]);

  function setField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveAsset() {
    setWorking(true);
    setError(null);

    try {
      const res = await fetch(`/api/itsm/assets/${encodeURIComponent(asset.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to save asset (${res.status})`);
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save asset");
    } finally {
      setWorking(false);
    }
  }

  async function runAction(action: "unlink_control_device" | "retire") {
    const confirmMessage =
      action === "unlink_control_device"
        ? "Unlink this asset from its Control device?"
        : "Retire this asset? You can reactivate it later by editing the status.";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setActionWorking(action);
    setError(null);

    try {
      const res = await fetch(`/api/itsm/assets/${encodeURIComponent(asset.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Asset action failed (${res.status})`);
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Asset action failed");
    } finally {
      setActionWorking(null);
    }
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain">
            <button
              type="button"
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
              aria-label="Close asset editor"
              onClick={() => {
                if (!working && !actionWorking) setOpen(false);
              }}
            />

            <div
              className={[
                "relative z-10 min-h-[100dvh] w-full",
                "px-3 sm:px-4",
                "pt-[calc(env(safe-area-inset-top,0px)+14px)]",
                "pb-[calc(env(safe-area-inset-bottom,0px)+90px)]",
              ].join(" ")}
            >
              <div className="hi5-panel mx-auto w-full max-w-5xl p-4 sm:p-5 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-extrabold">Edit asset</div>
                    <div className="text-sm opacity-70 mt-1">
                      Update ownership, hardware identity and lifecycle details.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                    onClick={() => setOpen(false)}
                    disabled={working || !!actionWorking}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">
                    {error}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <Field label="Asset name" value={form.name} onChange={(v) => setField("name", v)} required />
                  <Field label="Hostname" value={form.hostname} onChange={(v) => setField("hostname", v)} />
                  <Field label="Serial number" value={form.serial_number} onChange={(v) => setField("serial_number", v)} />
                  <Field label="Asset tag" value={form.asset_tag} onChange={(v) => setField("asset_tag", v)} />
                  <Field label="Manufacturer" value={form.manufacturer} onChange={(v) => setField("manufacturer", v)} />
                  <Field label="Model" value={form.model} onChange={(v) => setField("model", v)} />
                  <Field label="Operating system" value={form.operating_system} onChange={(v) => setField("operating_system", v)} />
                  <Field label="Assigned user" value={form.assigned_user_name} onChange={(v) => setField("assigned_user_name", v)} />
                  <Field label="Assigned email" value={form.assigned_user_email} onChange={(v) => setField("assigned_user_email", v)} type="email" />
                  <Field label="Department" value={form.department} onChange={(v) => setField("department", v)} />
                  <Field label="Location" value={form.location} onChange={(v) => setField("location", v)} />
                  <Field label="Warranty status" value={form.warranty_status} onChange={(v) => setField("warranty_status", v)} />
                  <Field label="Warranty expires" value={form.warranty_expires_at} onChange={(v) => setField("warranty_expires_at", v)} type="date" />

                  <label className="block">
                    <div className="text-xs opacity-70 mb-1">Status</div>
                    <select
                      className="hi5-input"
                      value={form.status}
                      onChange={(e) => setField("status", e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="spare">Spare</option>
                      <option value="retired">Retired</option>
                      <option value="lost">Lost</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <div className="text-xs opacity-70 mb-1">Notes</div>
                  <textarea
                    className="hi5-input min-h-[140px] resize-y"
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="Asset notes, ownership history, warranty details…"
                  />
                </label>

                <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4">
                  <div className="text-sm font-bold">Lifecycle actions</div>
                  <div className="text-xs opacity-70 mt-1">
                    Use these carefully. They affect how this asset appears across ITSM and Control.
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {hasLinkedDevice ? (
                      <button
                        type="button"
                        className="hi5-btn-ghost text-sm w-auto inline-flex items-center gap-2"
                        onClick={() => runAction("unlink_control_device")}
                        disabled={working || !!actionWorking}
                      >
                        {actionWorking === "unlink_control_device" ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Unlink size={16} />
                        )}
                        Unlink Control device
                      </button>
                    ) : null}

                    <button
                      type="button"
                      className="hi5-btn-ghost text-sm w-auto inline-flex items-center gap-2"
                      onClick={() => runAction("retire")}
                      disabled={working || !!actionWorking || form.status === "retired"}
                    >
                      {actionWorking === "retire" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Archive size={16} />
                      )}
                      Retire asset
                    </button>
                  </div>
                </div>

                <div className="sticky bottom-0 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 border-t hi5-border bg-[rgb(var(--hi5-card)/0.92)] dark:bg-[rgb(var(--hi5-card)/0.92)] backdrop-blur-xl px-4 sm:px-5 py-3 safe-bottom">
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <button
                      type="button"
                      className="hi5-btn-ghost text-sm w-full sm:w-auto"
                      onClick={() => setOpen(false)}
                      disabled={working || !!actionWorking}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="hi5-btn-primary text-sm w-full sm:w-auto inline-flex items-center justify-center gap-2"
                      onClick={saveAsset}
                      disabled={working || !!actionWorking || !form.name.trim()}
                    >
                      {working ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {working ? "Saving…" : "Save asset"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        className="hi5-btn-primary text-sm inline-flex w-auto items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <Pencil size={16} />
        Edit asset
      </button>

      {modal}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-xs opacity-70 mb-1">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </div>
      <input
        className="hi5-input"
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
