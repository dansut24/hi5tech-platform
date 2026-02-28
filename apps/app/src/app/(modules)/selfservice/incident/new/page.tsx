"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewSelfServiceIncidentPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/selfservice/incident", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // 🔥 Important
      body: JSON.stringify({
        title,
        description,
        priority,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      setError(data?.error || "Failed to create incident");
      return;
    }

    router.push(`/selfservice/incident/${data.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-xs opacity-70">Self Service</div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Raise an incident
          </h1>
        </div>

        <Link href="/selfservice" className="hi5-btn-ghost text-sm">
          Back
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="hi5-panel border hi5-border rounded-3xl p-4 sm:p-6 space-y-4"
      >
        <div>
          <label className="text-sm opacity-80">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="hi5-input mt-2"
            placeholder="e.g. Can’t access email"
          />
        </div>

        <div>
          <label className="text-sm opacity-80">Description</label>
          <textarea
            required
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="hi5-input mt-2"
            placeholder="What happened?"
          />
        </div>

        <div>
          <label className="text-sm opacity-80">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="hi5-input mt-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="hi5-btn-primary"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit Incident"}
        </button>
      </form>
    </div>
  );
}
