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

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setOk(null);

    if (pw1.length < 8) return setErr("Password must be at least 8 characters.");
    if (pw1 !== pw2) return setErr("Passwords do not match.");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setLoading(false);

    if (error) return setErr(error.message);

    setOk("Password set. Redirecting to login…");

    // optional: sign out then go login cleanly
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md hi5-panel p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Set your password</h1>
          <p className="text-sm opacity-80 mt-1">
            Create a password for future sign-ins.
          </p>
        </div>

        <label className="block text-sm">
          New password
          <input
            className="mt-1 w-full hi5-input"
            type="password"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <label className="block text-sm">
          Confirm password
          <input
            className="mt-1 w-full hi5-input"
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <button
          className="w-full rounded-xl px-3 py-2 font-medium hi5-accent-btn disabled:opacity-60"
          disabled={loading || !pw1 || !pw2}
          onClick={submit}
        >
          {loading ? "Saving..." : "Set password"}
        </button>

        {ok && <p className="text-sm hi5-accent">{ok}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </div>
  );
}
