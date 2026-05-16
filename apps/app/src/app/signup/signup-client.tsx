"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function SignupClient() {
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function signup() {
    setLoading(true);
    setErr(null);
    setInfo(null);

    const e = email.trim().toLowerCase();

    if (!fullName.trim()) {
      setLoading(false);
      setErr("Please enter your name.");
      return;
    }

    if (!e) {
      setLoading(false);
      setErr("Please enter your email.");
      return;
    }

    if (password.length < 8) {
      setLoading(false);
      setErr("Password must be at least 8 characters.");
      return;
    }

    const origin = window.location.origin;
    const emailRedirectTo = `${origin}/auth/callback?next=/onboarding`;

    const { data, error } = await supabase.auth.signUp({
      email: e,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      setLoading(false);
      setErr(error.message);
      return;
    }

    if (data.session) {
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      });

      window.location.href = "/onboarding";
      return;
    }

    setLoading(false);
    setInfo("Check your email to confirm your account, then onboarding will continue.");
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">
        Name
        <input
          className="hi5-input mt-2"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
          disabled={loading}
        />
      </label>

      <label className="block text-sm font-medium">
        Work email
        <input
          className="hi5-input mt-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          inputMode="email"
          disabled={loading}
        />
      </label>

      <label className="block text-sm font-medium">
        Password
        <input
          className="hi5-input mt-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="At least 8 characters"
          disabled={loading}
        />
      </label>

      {err ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
          {err}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-200">
          {info}
        </div>
      ) : null}

      <button
        type="button"
        className="hi5-btn-primary w-full"
        onClick={signup}
        disabled={loading}
      >
        {loading ? "Creating account…" : "Create account"}
      </button>

      <p className="text-xs leading-5 opacity-65">
        Already have an account? Sign in from your tenant workspace.
      </p>
    </div>
  );
}
