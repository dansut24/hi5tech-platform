"use client";

import { useState } from "react";

export default function MicrosoftIntegrationClient({
  initial,
}: {
  initial: any | null;
}) {
  const [enabled, setEnabled] = useState(Boolean(initial?.ms_enabled));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/tenant-settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ms_enabled: enabled }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Failed to save");
      setMsg("Saved");
    } catch (e: any) {
      setMsg(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function connect() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/integrations/microsoft/start", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Not ready yet");
      // Later: window.location.assign(j.url)
      setMsg("Connect stub wired. Next: implement OAuth + Graph consent.");
    } catch (e: any) {
      setMsg(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hi5-panel p-6 space-y-4">
      <div className="hi5-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Microsoft sign-in</div>
            <div className="text-xs opacity-70 mt-1">
              When enabled, users can sign in with Microsoft (once wired) and be auto-provisioned if their domain is allowed.
            </div>
          </div>

          <button
            type="button"
            className="hi5-btn-ghost text-sm"
            onClick={() => setEnabled((v) => !v)}
            disabled={saving}
          >
            {enabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="hi5-btn-primary text-sm" onClick={connect} disabled={saving}>
            Connect Microsoft
          </button>
          <button type="button" className="hi5-btn-ghost text-sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="text-xs opacity-70">
        Recommended: set your allowed domains in <b>/admin/setup</b> (Access step).
      </div>

      {msg ? <div className="text-sm opacity-80">{msg}</div> : null}
    </div>
  );
}
