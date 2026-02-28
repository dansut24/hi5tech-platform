// apps/app/src/app/(modules)/selfservice/incident/new/ui/raise-incident-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RaiseIncidentClient() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setErr(null);

    try {
      const r = await fetch("/api/selfservice/incident", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, description, priority }),
      });

      const j = await r.json().catch(() => ({}));

      if (r.status === 401) {
        setErr("Not authenticated");
        setLoading(false);
        return;
      }

      if (!r.ok) {
        setErr(j?.error || "Failed to submit incident");
        setLoading(false);
        return;
      }

      // If you have a detail page, go there:
      router.push(`/selfservice/incident/${j.id}`);
      router.refresh();
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hi5-panel border hi5-border rounded-3xl p-4 sm:p-6 space-y-4">
      <div>
        <label className="text-sm opacity-80">Title</label>
        <input
          className="hi5-input mt-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Can’t access email"
        />
      </div>

      <div>
        <label className="text-sm opacity-80">Description</label>
        <textarea
          className="hi5-input mt-2"
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened? What did you expect? Any error messages?"
        />
      </div>

      <div>
        <label className="text-sm opacity-80">Priority</label>
        <select
          className="hi5-input mt-2"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <button
        type="button"
        onClick={submit}
        disabled={loading || !title.trim() || !description.trim()}
        className="w-full hi5-btn-primary"
      >
        {loading ? "Submitting..." : "Submit Incident"}
      </button>
    </div>
  );
}
