"use client";

import { useState } from "react";

type TrialDays = 7 | 14 | 30 | 60 | 90;

export default function TenantTrialActions({
  tenantId,
}: {
  tenantId: string;
}) {
  const [loadingDays, setLoadingDays] = useState<TrialDays | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function extendTrial(days: TrialDays) {
    setLoadingDays(days);
    setErr(null);

    try {
      const res = await fetch("/api/platform-admin/tenants/extend-trial", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tenantId,
          days,
          note,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to extend trial (${res.status})`);
      }

      window.location.reload();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to extend trial.");
      setLoadingDays(null);
    }
  }

  function Button({ days }: { days: TrialDays }) {
    const loading = loadingDays === days;

    return (
      <button
        type="button"
        className="hi5-btn-ghost w-auto text-xs"
        disabled={Boolean(loadingDays)}
        onClick={() => extendTrial(days)}
      >
        {loading ? "Extending..." : `+${days} days`}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5">
      <div className="text-sm font-extrabold">Trial actions</div>
      <p className="mt-1 text-xs opacity-70">
        Extend the tenant trial manually. This updates the tenant and billing profile.
      </p>

      <label className="mt-3 block text-xs font-semibold">
        Optional note
        <textarea
          className="hi5-input mt-2 min-h-20 resize-y text-sm"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Reason for extension..."
          disabled={Boolean(loadingDays)}
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button days={7} />
        <Button days={14} />
        <Button days={30} />
        <Button days={60} />
        <Button days={90} />
      </div>

      {err ? (
        <div className="mt-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
          {err}
        </div>
      ) : null}
    </div>
  );
}
