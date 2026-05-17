"use client";

import { useState } from "react";

type FeatureAction = "enable" | "disable";

export function SelectFeatureChangeButton({
  featureKey,
  action,
}: {
  featureKey: string;
  action: FeatureAction;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function selectChange() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/admin/environments/staging-changes/select", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          featureKey,
          action,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to select change (${res.status})`);
      }

      window.location.reload();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to select change");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className={action === "enable" ? "hi5-btn-primary w-auto text-xs" : "hi5-btn-ghost w-auto text-xs"}
        disabled={loading}
        onClick={selectChange}
      >
        {loading ? "Selecting..." : action === "enable" ? "Select enable" : "Select disable"}
      </button>

      {err ? (
        <div className="mt-2 rounded-2xl border border-red-500/25 bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-200">
          {err}
        </div>
      ) : null}
    </div>
  );
}

export function RemoveSelectedChangeButton({
  changeId,
}: {
  changeId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function removeChange() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/admin/environments/staging-changes/remove", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          changeId,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to remove change (${res.status})`);
      }

      window.location.reload();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to remove change");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="hi5-btn-ghost w-auto text-xs"
        disabled={loading}
        onClick={removeChange}
      >
        {loading ? "Removing..." : "Remove"}
      </button>

      {err ? (
        <div className="mt-2 rounded-2xl border border-red-500/25 bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-200">
          {err}
        </div>
      ) : null}
    </div>
  );
}

export function ApplySelectedChangesButton({
  disabled,
}: {
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function applyChanges() {
    const confirmed = window.confirm(
      "Apply all selected staging changes to production now? This will update the live production environment."
    );

    if (!confirmed) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/admin/environments/staging-changes/apply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to apply changes (${res.status})`);
      }

      window.location.reload();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to apply changes");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="hi5-btn-primary w-auto text-sm"
        disabled={disabled || loading}
        onClick={applyChanges}
      >
        {loading ? "Applying..." : "Apply to production now"}
      </button>

      {err ? (
        <div className="mt-2 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
          {err}
        </div>
      ) : null}
    </div>
  );
}

export function ScheduleSelectedChangesForm({
  disabled,
}: {
  disabled?: boolean;
}) {
  const [scheduledFor, setScheduledFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function scheduleChanges() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/admin/environments/staging-changes/schedule", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          scheduledFor,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to schedule changes (${res.status})`);
      }

      window.location.reload();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to schedule changes");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5">
      <div className="text-sm font-extrabold">Schedule changes</div>
      <p className="mt-1 text-xs opacity-70">
        This stores the scheduled time. A background worker can apply scheduled changes later.
      </p>

      <input
        className="hi5-input mt-3"
        type="datetime-local"
        value={scheduledFor}
        onChange={(event) => setScheduledFor(event.target.value)}
        disabled={disabled || loading}
      />

      <button
        type="button"
        className="hi5-btn-ghost mt-3 w-auto text-sm"
        disabled={disabled || loading || !scheduledFor}
        onClick={scheduleChanges}
      >
        {loading ? "Scheduling..." : "Schedule selected changes"}
      </button>

      {err ? (
        <div className="mt-2 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
          {err}
        </div>
      ) : null}
    </div>
  );
}
