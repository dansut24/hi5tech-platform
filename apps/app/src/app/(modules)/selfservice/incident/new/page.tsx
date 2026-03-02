// apps/app/src/app/(modules)/selfservice/incident/new/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export default function NewSelfServiceIncidentPage() {
  const router = useRouter();

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);

    const t = title.trim();
    const d = description.trim();
    if (!t) return setErr("Title is required");
    if (!d) return setErr("Description is required");

    setLoading(true);
    try {
      // Get token (no cookies needed)
      const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const accessToken = sessionRes.session?.access_token;
      if (!accessToken) throw new Error("Not authenticated (no session). Please login again.");

      const r = await fetch("/api/selfservice/incident", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: t,
          description: d,
          priority,
        }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Failed to create incident");

      setInfo("Incident created.");
      router.push(`/selfservice/incident/${j.id}`);
    } catch (ex: any) {
      setErr(ex?.message || "Failed to create incident");
    } finally {
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
            type="submit"
            form="incident-form"
            className="hi5-btn-primary text-sm"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>

      <form
        id="incident-form"
        onSubmit={onSubmit}
        className="hi5-panel border hi5-border rounded-3xl p-4 sm:p-6 space-y-4"
      >
        <div>
          <label className="text-sm opacity-80">Title</label>
          <input
            required
            className="hi5-input mt-2"
            placeholder="e.g. Can’t access email"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="text-sm opacity-80">Description</label>
          <textarea
            required
            rows={6}
            className="hi5-input mt-2"
            placeholder="What happened? What did you expect? Any error messages?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm opacity-80">Priority</label>
            <select
              className="hi5-input mt-2"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={loading}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="text-sm opacity-80">Impact</label>
            <select className="hi5-input mt-2" defaultValue="just_me" disabled={loading}>
              <option value="just_me">Just me</option>
              <option value="team">My team</option>
              <option value="site">Whole site</option>
            </select>
          </div>
        </div>

        {info && <div className="text-sm opacity-80">{info}</div>}
        {err && <div className="text-sm text-red-600">{err}</div>}

        <div className="text-xs opacity-60">
          This will create a real incident in Supabase and redirect you to it.
        </div>
      </form>
    </div>
  );
}
