"use client";

import { useState } from "react";

export default function UpgradeRequestButton({
  plan,
  label = "Request upgrade",
}: {
  plan: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function requestUpgrade() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/admin/billing/upgrade-request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Upgrade request failed (${res.status})`);
      }

      window.location.href = json?.redirectTo || "/admin/billing";
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Upgrade request failed");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="hi5-btn-primary w-auto"
        onClick={requestUpgrade}
        disabled={loading}
      >
        {loading ? "Requesting…" : label}
      </button>

      {err ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
          {err}
        </div>
      ) : null}
    </div>
  );
}
