// apps/app/src/app/auth/reset/page.tsx
"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function setPassword() {
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
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    window.location.assign("/login");
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md hi5-panel p-6 space-y-4">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <p className="text-sm opacity-80">
          Choose a strong password to secure your account.
        </p>

        <label className="block text-sm">
          New password
          <input
            className="mt-1 w-full hi5-input"
            type="password"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
          />
        </label>

        <label className="block text-sm">
          Confirm new password
          <input
            className="mt-1 w-full hi5-input"
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
          />
        </label>

        <button
          className="w-full rounded-xl border px-3 py-2 font-medium hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
          onClick={setPassword}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save password"}
        </button>

        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </div>
    </div>
  );
}
