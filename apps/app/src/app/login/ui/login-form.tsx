"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Step = "enterEmail" | "enterCode";

function MicrosoftIcon() {
  // Simple 4-square mark (no external asset)
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="1" y="1" width="7" height="7" fill="#f25022" />
      <rect x="10" y="1" width="7" height="7" fill="#7fba00" />
      <rect x="1" y="10" width="7" height="7" fill="#00a4ef" />
      <rect x="10" y="10" width="7" height="7" fill="#ffb900" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.04 1.53 7.43 2.8l5.43-5.43C33.64 3.96 29.3 2 24 2 14.73 2 6.9 7.38 3.69 15.22l6.66 5.17C12.02 14.02 17.55 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.21-.43-4.73H24v9.02h12.64c-.55 2.96-2.22 5.47-4.73 7.16l7.24 5.61C43.86 36.79 46.5 30.91 46.5 24z"/>
      <path fill="#FBBC05" d="M10.35 28.61A14.5 14.5 0 0 1 9.5 24c0-1.6.27-3.15.85-4.61l-6.66-5.17A23.9 23.9 0 0 0 2 24c0 3.87.93 7.53 2.58 10.78l7.77-6.17z"/>
      <path fill="#34A853" d="M24 46c5.3 0 9.76-1.75 13.01-4.74l-7.24-5.61c-2 1.35-4.56 2.14-5.77 2.14-6.45 0-11.98-4.52-13.65-10.89l-7.77 6.17C6.9 40.62 14.73 46 24 46z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.73 0 8.33c0 3.68 2.29 6.8 5.47 7.9.4.08.55-.18.55-.39 0-.19-.01-.82-.01-1.49-2.01.45-2.53-.81-2.69-1.24-.09-.24-.48-.98-.82-1.18-.28-.16-.68-.56-.01-.57.63-.01 1.08.6 1.23.85.72 1.26 1.87.9 2.33.69.07-.54.28-.9.51-1.11-1.78-.21-3.64-.92-3.64-4.09 0-.9.31-1.63.82-2.2-.08-.21-.36-1.06.08-2.2 0 0 .67-.22 2.2.84a7.3 7.3 0 0 1 2-.28c.68 0 1.36.1 2 .28 1.53-1.06 2.2-.84 2.2-.84.44 1.14.16 1.99.08 2.2.51.57.82 1.3.82 2.2 0 3.18-1.87 3.88-3.65 4.09.29.26.54.77.54 1.56 0 1.13-.01 2.03-.01 2.31 0 .21.15.47.55.39C13.71 15.13 16 12.01 16 8.33 16 3.73 12.42 0 8 0Z"
      />
    </svg>
  );
}

export default function LoginForm() {
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [step, setStep] = useState<Step>("enterEmail");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function isAllowedForThisTenant(e: string) {
    const res = await fetch("/api/auth/allowed", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: e }),
      cache: "no-store",
    });

    if (!res.ok) return false;
    const data = (await res.json()) as { allowed?: boolean };
    return Boolean(data?.allowed);
  }

  async function sendCode() {
    setLoading(true);
    setErr(null);
    setInfo(null);

    const e = email.trim().toLowerCase();
    if (!e) {
      setLoading(false);
      setErr("Please enter your email.");
      return;
    }

    // ✅ Tenant gate BEFORE sending OTP
    const allowed = await isAllowedForThisTenant(e);
    if (!allowed) {
      setLoading(false);
      setErr("That email isn’t authorised for this tenant.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({ email: e });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setStep("enterCode");
    setInfo("Code sent. Check your email and enter the 6-digit code.");
  }

  async function verifyCode() {
    setLoading(true);
    setErr(null);
    setInfo(null);

    const e = email.trim().toLowerCase();
    const token = code.trim();

    if (!token) {
      setLoading(false);
      setErr("Please enter the code.");
      return;
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: e,
      token,
      type: "email",
    });

    if (error) {
      setLoading(false);
      setErr(error.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      setErr("Verified, but no session returned. Check Supabase Auth settings.");
      return;
    }

    // ✅ Tenant gate AFTER verify (safety net)
    const allowed = await isAllowedForThisTenant(e);
    if (!allowed) {
      await supabase.auth.signOut();
      setLoading(false);
      setErr("Signed in, but you don’t have access to this tenant.");
      return;
    }

    setLoading(false);
    window.location.assign("/"); // app will redirect to /login if still not authed
  }

  async function oauth(provider: "google" | "github" | "azure") {
    setErr(null);
    setInfo(null);

    const e = email.trim().toLowerCase();
    if (!e) {
      // Optional: you can remove this requirement later if you don’t want pre-check for OAuth
      setErr("Enter your email first so we can validate tenant access.");
      return;
    }

    setLoading(true);

    const allowed = await isAllowedForThisTenant(e);
    if (!allowed) {
      setLoading(false);
      setErr("That email isn’t authorised for this tenant.");
      return;
    }

    // NOTE:
    // - Provider keys must be configured in Supabase Auth.
    // - "azure" corresponds to Microsoft in Supabase.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider === "azure" ? "azure" : provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) setErr(error.message);
  }

  return (
    <div className="space-y-4">
      {/* OAuth buttons (for later; wiring is ready) */}
      <div className="space-y-2">
        <button
          type="button"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
          disabled={loading}
          onClick={() => oauth("azure")}
          title="Sign in with Microsoft"
        >
          <MicrosoftIcon />
          Continue with Microsoft
        </button>

        <button
          type="button"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
          disabled={loading}
          onClick={() => oauth("google")}
          title="Sign in with Google"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <button
          type="button"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
          disabled={loading}
          onClick={() => oauth("github")}
          title="Sign in with GitHub"
        >
          <GitHubIcon />
          Continue with GitHub
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t hi5-divider" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-xs opacity-70 bg-[rgba(var(--hi5-card),0.40)] rounded-full border hi5-border">
            or sign in with email
          </span>
        </div>
      </div>

      {/* OTP flow */}
      <div className="space-y-3">
        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full hi5-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            placeholder="you@company.com"
            disabled={step === "enterCode" || loading}
          />
        </label>

        {step === "enterEmail" ? (
          <button
            className="w-full rounded-xl border px-3 py-2 font-medium hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
            disabled={!email.trim() || loading}
            onClick={sendCode}
          >
            {loading ? "Sending..." : "Send code"}
          </button>
        ) : (
          <>
            <label className="block text-sm">
              6-digit code
              <input
                className="mt-1 w-full hi5-input tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                placeholder="123456"
                disabled={loading}
              />
            </label>

            <button
              className="w-full rounded-xl border px-3 py-2 font-medium hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
              disabled={!code.trim() || loading}
              onClick={verifyCode}
            >
              {loading ? "Verifying..." : "Verify & sign in"}
            </button>

            <button
              className="w-full rounded-xl border px-3 py-2 text-sm hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
              disabled={loading}
              onClick={() => {
                setStep("enterEmail");
                setCode("");
                setErr(null);
                setInfo(null);
              }}
            >
              Use a different email
            </button>

            <button
              className="w-full rounded-xl border px-3 py-2 text-sm hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
              disabled={loading}
              onClick={sendCode}
            >
              Resend code
            </button>
          </>
        )}

        {info && <p className="text-sm opacity-80">{info}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </div>
  );
}
