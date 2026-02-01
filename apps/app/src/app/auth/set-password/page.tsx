"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function SetPasswordPage() {
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSave() {
    setErr(null);
    setOk(null);

    if (!password || password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== password2) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { data: sessionRes } = await supabase.auth.getSession();
    if (!sessionRes.session) {
      setLoading(false);
      setErr("Your setup link is invalid or has expired. Please request a new invite.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setOk("Password set! Redirecting to login…");
    setTimeout(() => window.location.assign("/login"), 800);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md hi5-panel p-6">
        <h1 className="text-xl font-semibold">Finish setting up your account</h1>
        <p className="text-sm opacity-80 mt-1">
          Choose a password to complete setup.
        </p>

        <div className="mt-6 space-y-3">
          <label className="block text-sm">
            New password
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 bg-transparent"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
          </label>

          <label className="block text-sm">
            Confirm password
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 bg-transparent"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
          </label>

          <button
            className="w-full rounded-xl border px-3 py-2 font-medium disabled:opacity-60"
            disabled={loading}
            onClick={onSave}
          >
            {loading ? "Saving..." : "Continue"}
          </button>

          {ok && <p className="text-sm opacity-80">{ok}</p>}
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
      </div>
    </div>
  );
}
