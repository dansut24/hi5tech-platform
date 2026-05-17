"use client";

import { useState } from "react";

type TenantStatusAction = "suspend" | "reactivate" | "mark_trial" | "mark_active";

export default function TenantStatusActions({
  tenantId,
  currentStatus,
}: {
  tenantId: string;
  currentStatus?: string | null;
}) {
  const [loadingAction, setLoadingAction] = useState<TenantStatusAction | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function updateStatus(action: TenantStatusAction) {
    setLoadingAction(action);
    setErr(null);

    try {
      const res = await fetch("/api/platform-admin/tenants/update-status", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tenantId,
          action,
          note,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to update tenant (${res.status})`);
      }

      window.location.reload();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to update tenant.");
      setLoadingAction(null);
    }
  }

  function Button({
    action,
    label,
    disabled,
  }: {
    action: TenantStatusAction;
    label: string;
    disabled?: boolean;
  }) {
    const loading = loadingAction === action;

    return (
      <button
        type="button"
        className="hi5-btn-ghost w-auto text-xs"
        disabled={Boolean(loadingAction) || disabled}
        onClick={() => updateStatus(action)}
      >
        {loading ? "Updating..." : label}
      </button>
    );
  }

  const status = String(currentStatus || "").toLowerCase();

  return (
    <div className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5">
      <div className="text-sm font-extrabold">Tenant status actions</div>
      <p className="mt-1 text-xs opacity-70">
        Manual platform-admin actions. Every change is written to the platform audit log.
      </p>

      <label className="mt-3 block text-xs font-semibold">
        Optional note
        <textarea
          className="hi5-input mt-2 min-h-20 resize-y text-sm"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Reason for action..."
          disabled={Boolean(loadingAction)}
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button action="suspend" label="Suspend" disabled={status === "suspended"} />
        <Button action="reactivate" label="Reactivate" disabled={status === "active"} />
        <Button action="mark_trial" label="Mark trial" disabled={status === "trial"} />
        <Button action="mark_active" label="Mark active" disabled={status === "active"} />
      </div>

      {err ? (
        <div className="mt-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
          {err}
        </div>
      ) : null}
    </div>
  );
}
