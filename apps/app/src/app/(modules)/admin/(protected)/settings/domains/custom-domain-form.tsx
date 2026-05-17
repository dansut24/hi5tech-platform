"use client";

import { useState } from "react";

export default function CustomDomainForm() {
  const [domain, setDomain] = useState("");
  const [environmentKey, setEnvironmentKey] = useState("production");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/admin/custom-domains", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          domain,
          environmentKey,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to add domain (${res.status})`);
      }

      window.location.reload();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to add domain");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold">
        Custom domain
        <input
          className="hi5-input mt-2"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="support.example.com"
          disabled={loading}
        />
      </label>

      <label className="block text-sm font-semibold">
        Environment
        <select
          className="hi5-input mt-2"
          value={environmentKey}
          onChange={(e) => setEnvironmentKey(e.target.value)}
          disabled={loading}
        >
          <option value="production">Production</option>
          <option value="test">Test</option>
          <option value="staging">Staging</option>
        </select>
      </label>

      <button
        type="button"
        className="hi5-btn-primary w-full"
        onClick={submit}
        disabled={loading || !domain.trim()}
      >
        {loading ? "Adding domain..." : "Add domain"}
      </button>

      {err ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
          {err}
        </div>
      ) : null}
    </div>
  );
}
