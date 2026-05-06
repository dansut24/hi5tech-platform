"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

export default function PremiumFeatureLock({
  featureKey,
  label,
  tenantId,
  incidentId,
  deviceId,
  className = "hi5-btn-ghost text-sm w-full",
}: {
  featureKey: string;
  label: string;
  tenantId: string;
  incidentId?: string | null;
  deviceId?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  async function openModal() {
    setOpen(true);

    await fetch("/api/platform/feature-attempt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        feature_key: featureKey,
        incident_id: incidentId,
        device_id: deviceId,
      }),
    }).catch(() => null);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`${className} flex items-center justify-between gap-2 opacity-90`}
      >
        <span className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          {label}
        </span>
        <span className="text-xs opacity-70">Premium</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="hi5-panel max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border hi5-border p-3">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold">Unlock {label}</h2>
                <p className="text-sm opacity-75 mt-1">
                  This feature is available with the Control / RMM premium add-on.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border hi5-border p-4 text-sm space-y-2">
              <div>Included with premium:</div>
              <ul className="list-disc pl-5 opacity-80 space-y-1">
                <li>Remote control from tickets</li>
                <li>Terminal and file browser</li>
                <li>Device inventory and reporting</li>
                <li>Automation, monitoring and patching options</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                className="hi5-btn-ghost text-sm"
                onClick={() => setOpen(false)}
              >
                Not now
              </button>

              <Link href="/admin/billing" className="hi5-btn-primary text-sm">
                View plans
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
