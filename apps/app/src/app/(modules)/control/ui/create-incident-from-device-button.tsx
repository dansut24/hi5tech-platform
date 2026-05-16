"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Loader2 } from "lucide-react";

type Props = {
  deviceId: string;
  hostname?: string | null;
};

export default function CreateIncidentFromDeviceButton({ deviceId, hostname }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`Issue with ${hostname || deviceId}`);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [createAssetIfMissing, setCreateAssetIfMissing] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createIncident() {
    setWorking(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/control/devices/${encodeURIComponent(deviceId)}/create-incident`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            priority,
            category: "Device",
            create_asset_if_missing: createAssetIfMissing,
          }),
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to create incident (${res.status})`);
      }

      router.push(json?.redirect_to || `/itsm/incidents/${json?.incident?.number || json?.incident?.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create incident");
    } finally {
      setWorking(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="hi5-btn-ghost text-sm inline-flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <FilePlus2 size={16} />
        Create ticket
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        aria-label="Close create ticket dialog"
        onClick={() => {
          if (!working) setOpen(false);
        }}
      />

      <div className="hi5-panel relative z-10 w-full max-w-xl p-5 space-y-4">
        <div>
          <div className="text-lg font-extrabold">Create ticket from device</div>
          <div className="text-sm opacity-70 mt-1">
            This creates an ITSM incident and links it to this Control device. If an ITSM asset is linked,
            it will be attached automatically.
          </div>
        </div>

        <label className="block">
          <div className="text-xs opacity-70 mb-1">Title</div>
          <input
            className="hi5-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
          />
        </label>

        <label className="block">
          <div className="text-xs opacity-70 mb-1">Description</div>
          <textarea
            className="hi5-input min-h-[110px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes for the ticket…"
          />
        </label>

        <label className="block">
          <div className="text-xs opacity-70 mb-1">Priority</div>
          <select
            className="hi5-input"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>

        <label className="flex items-start gap-2 rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={createAssetIfMissing}
            onChange={(e) => setCreateAssetIfMissing(e.target.checked)}
          />
          <span>
            <span className="font-semibold">Create/link ITSM asset if missing</span>
            <span className="block text-xs opacity-70 mt-0.5">
              Recommended. This keeps the ticket connected to the asset register.
            </span>
          </span>
        </label>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="hi5-btn-ghost text-sm"
            onClick={() => setOpen(false)}
            disabled={working}
          >
            Cancel
          </button>

          <button
            type="button"
            className="hi5-btn-primary text-sm inline-flex items-center gap-2"
            onClick={createIncident}
            disabled={working || !title.trim()}
          >
            {working ? <Loader2 size={16} className="animate-spin" /> : <FilePlus2 size={16} />}
            {working ? "Creating…" : "Create ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
