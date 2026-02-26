// apps/app/src/app/auth/reset/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!pw1 || pw1.length < 8) {
      setMsg("Password must be at least 8 characters.");
      return;
    }
    if (pw1 !== pw2) {
      setMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;

      setMsg("Password updated. Redirecting…");
      router.replace("/apps");
    } catch (err: any) {
      setMsg(err?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="hi5-panel border hi5-border rounded-3xl p-5 w-full max-w-md">
        <h1 className="text-lg font-semibold">Set a new password</h1>
        <p className="text-sm opacity-70 mt-1">
          Choose a new password for your account.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <label className="text-xs opacity-70">New password</label>
            <input
              className="hi5-input mt-1"
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="text-xs opacity-70">Confirm password</label>
            <input
              className="hi5-input mt-1"
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Repeat password"
            />
          </div>

          {msg ? (
            <div className="text-sm opacity-80 rounded-2xl border hi5-border px-3 py-2">
              {msg}
            </div>
          ) : null}

          <button className="hi5-btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
