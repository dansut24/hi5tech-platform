// apps/app/src/app/(modules)/selfservice/incident/new/ui/raise-incident-client.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function RaiseIncidentClient() {
  const router = useRouter();

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

  /**
   * Reliably retrieve a live access token.
   *
   * getSession() reads from localStorage and can return null on subdomains
   * or after navigation if the session hasn't been hydrated yet.
   *
   * Instead we call refreshSession() which always talks to Supabase directly
   * and returns a fresh token — no dependency on localStorage state.
   */
  async function getLiveAccessToken(): Promise<string | null> {
    // First try: refresh the session to get a guaranteed live token
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
    if (!refreshErr && refreshed?.session?.access_token) {
      return refreshed.session.access_token;
    }

    // Second try: fall back to getSession() in case refresh fails (e.g. offline)
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData?.session?.access_token ?? null;
  }

  async function submit() {
    setLoading(true);
    setErr(null);

    try {
      const accessToken = await getLiveAccessToken();

      if (!accessToken) {
        setErr(
          "Your session could not be verified. Please sign out and sign back in, then try again."
        );
        setLoading(false);
        return;
      }

      const r = await fetch("/api/selfservice/incident", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ title, description, priority }),
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setErr(j?.error || "Failed to submit incident. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/selfservice");
      router.refresh();
    } catch {
      setErr("A network error occurred. Please check your connection and try again.");
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
          placeholder="e.g. Can't access email"
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
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      {err && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
          {err}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={loading || !title.trim() || !description.trim()}
        className="w-full hi5-btn-primary"
      >
        {loading ? "Submitting…" : "Submit Incident"}
      </button>
    </div>
  );
}
