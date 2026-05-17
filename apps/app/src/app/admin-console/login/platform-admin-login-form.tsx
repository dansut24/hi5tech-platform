"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function PlatformAdminLoginForm() {
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setErr(null);

    const e = email.trim().toLowerCase();

    if (!e || !password) {
      setLoading(false);
      setErr("Enter your email and password.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: e,
      password,
    });

    if (error) {
      setLoading(false);
      setErr(error.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      setErr("Signed in, but no session was returned.");
      return;
    }

    try {
      await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      });
    } catch {
      // Continue anyway. Supabase browser session may still be available.
    }

    window.location.href = "/admin-console";
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold">
        Email address
        <input
          className="hi5-input mt-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          inputMode="email"
          placeholder="you@hi5tech.co.uk"
          disabled={loading}
        />
      </label>

      <label className="block text-sm font-semibold">
        Password
        <input
          className="hi5-input mt-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={loading}
        />
      </label>

      <button
        type="button"
        className="hi5-btn-primary w-full"
        onClick={signIn}
        disabled={loading || !email.trim() || !password}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      {err ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
          {err}
        </div>
      ) : null}
    </div>
  );
}
