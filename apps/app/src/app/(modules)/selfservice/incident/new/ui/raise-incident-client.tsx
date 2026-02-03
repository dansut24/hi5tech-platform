// apps/app/src/app/(modules)/selfservice/incident/new/ui/raise-incident-client.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Priority = "low" | "medium" | "high" | "critical";

export default function RaiseIncidentClient() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [impact, setImpact] = useState<"me" | "team" | "company">("me");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return title.trim().length >= 4 && desc.trim().length >= 10 && !loading;
  }, [title, desc, loading]);

  async function submit() {
    setErr(null);
    setInfo(null);

    if (!canSubmit) {
      setErr("Please add a title and a helpful description.");
      return;
    }

    setLoading(true);
    try {
      // TODO: wire to API
      await new Promise((r) => setTimeout(r, 700));
      setInfo("Incident submitted (demo). Next we’ll wire this to Supabase + notifications.");
      setTitle("");
      setDesc("");
      setPriority("medium");
      setImpact("me");
    } catch (e: any) {
      setErr(e?.message || "Failed to submit incident.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs opacity-70">Self Service</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">Raise an incident</h1>
          <p className="text-sm opacity-75 mt-2 max-w-2xl">
            Tell us what’s broken, how it affects you, and any details that help us reproduce it.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/selfservice" className="hi5-btn-ghost text-sm">
            Back
          </Link>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="hi5-btn-primary text-sm disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>

      <div className="hi5-panel p-5 space-y-4">
        <label className="block text-sm">
          Title
          <input
            className="mt-1 hi5-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Can’t access email"
            disabled={loading}
          />
        </label>

        <label className="block text-sm">
          Description
          <textarea
            className="mt-1 hi5-input"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What happened? What did you expect? Any error messages?"
            rows={6}
            disabled={loading}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Priority
            <select
              className="mt-1 hi5-input"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              disabled={loading}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>

          <label className="block text-sm">
            Impact
            <select
              className="mt-1 hi5-input"
              value={impact}
              onChange={(e) => setImpact(e.target.value as any)}
              disabled={loading}
            >
              <option value="me">Just me</option>
              <option value="team">My team</option>
              <option value="company">Whole company</option>
            </select>
          </label>
        </div>

        {info ? <p className="text-sm opacity-80">{info}</p> : null}
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
      </div>
    </div>
  );
}
