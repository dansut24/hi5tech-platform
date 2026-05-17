"use client";

import { useState } from "react";

type DomainStatus = "pending" | "verified" | "active" | "failed" | "disabled";

export default function DomainStatusActions({
  domainId,
  currentStatus,
}: {
  domainId: string;
  currentStatus: string;
}) {
  const [loadingStatus, setLoadingStatus] = useState<DomainStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function updateStatus(status: DomainStatus) {
    setLoadingStatus(status);
    setErr(null);

    try {
      const res = await fetch("/api/platform-admin/custom-domains/update-status", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          domainId,
          status,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to update domain (${res.status})`);
      }

      window.location.reload();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to update domain.");
      setLoadingStatus(null);
    }
  }

  function Button({
    status,
    label,
  }: {
    status: DomainStatus;
    label: string;
  }) {
    const loading = loadingStatus === status;
    const disabled = Boolean(loadingStatus) || currentStatus === status;

    return (
      <button
        type="button"
        className="hi5-btn-ghost w-auto text-xs"
        disabled={disabled}
        onClick={() => updateStatus(status)}
      >
        {loading ? "Updating..." : label}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button status="verified" label="Mark verified" />
        <Button status="active" label="Activate" />
        <Button status="failed" label="Mark failed" />
        <Button status="disabled" label="Disable" />
        <Button status="pending" label="Reset pending" />
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
          {err}
        </div>
      ) : null}
    </div>
  );
}
