"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export default function NewSelfServiceIncidentPage() {
  const supabase = useMemo(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function getToken(): Promise<string | null> {
    // refreshSession() makes a live call to Supabase — doesn't depend on
    // localStorage being populated, works reliably across subdomains.
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed?.session?.access_token) {
      return refreshed.session.access_token;
    }
    // Fallback to getSession if refresh fails (e.g. truly logged out)
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData?.session?.access_token ?? null;
  }

  async function submit() {
    setLoading(true);
    setErr(null);
    setInfo(null);

    try {
      const token = await getToken();

      if (!token) {
        setErr("Your session has expired. Please sign in again.");
        setLoading(false);
        return;
      }

      const r = await fetch("/selfservice/incident", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, priority }),
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok || !j?.ok) {
        setErr(j?.error || "Failed to submit incident. Please try again.");
        setLoading(false);
        return;
      }

      setInfo("Incident submitted. Redirecting…");
      window.location.assign("/selfservice");
    } catch {
      setErr("A network error occurred. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-xs opacity-70">Self Service</div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Raise an incident
          </h1>
          <p className="mt-2 text-sm opacity-70 max-w-xl">
            Tell us what&apos;s broken, how it affects you, and any details that help us reproduce it.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/selfservice" className="hi5-btn-ghost text-sm">
            Back
          </Link>
          <button
            type="button"
            onClick={submit}
            disabled={loading || !title.trim() || !description.trim()}
            className="hi5-btn-primary text-sm"
          >
            {loading ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>

      <div className="hi5-panel border hi5-border rounded-3xl p-4 sm:p-6 space-y-4">
        <div>
          <label className="text-sm opacity-80">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="hi5-input mt-2"
            placeholder="e.g. Can't access email"
          />
        </div>

        <div>
          <label className="text-sm opacity-80">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="hi5-input mt-2"
            placeholder="What happened? What did you expect? Any error messages?"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm opacity-80">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="hi5-input mt-2"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="text-sm opacity-80">Impact</label>
            <select className="hi5-input mt-2" defaultValue="just_me" disabled>
              <option value="just_me">Just me</option>
              <option value="team">My team</option>
              <option value="site">Whole site</option>
            </select>
          </div>
        </div>

        {info && <div className="text-sm opacity-80">{info}</div>}
        {err && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
            {err}
          </div>
        )}
      </div>
    </div>
  );
}
