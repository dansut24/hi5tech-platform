"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function InviteClient() {
  const sp = useSearchParams();
  const token_hash = sp.get("token_hash") || "";
  const type = sp.get("type") || "invite";
  const next = sp.get("next") || "/auth/set-password";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onContinue() {
    setLoading(true);
    setErr(null);

    try {
      const r = await fetch("/api/auth/verify-invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token_hash, type, next }),
      });

      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Invite verification failed");

      window.location.assign(j.redirect || next);
    } catch (e: any) {
      setErr(e.message || "Invite verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        className="w-full rounded-xl border px-3 py-2 font-medium disabled:opacity-60"
        disabled={!token_hash || loading}
        onClick={onContinue}
      >
        {loading ? "Verifying..." : "Continue"}
      </button>

      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
