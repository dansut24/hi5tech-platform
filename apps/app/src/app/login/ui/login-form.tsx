"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Mode = "password" | "otp";
type Step = "enterEmail" | "enterCode";

function MicrosoftLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
      <path fill="#F25022" d="M2 2h9v9H2z" />
      <path fill="#7FBA00" d="M13 2h9v9h-9z" />
      <path fill="#00A4EF" d="M2 13h9v9H2z" />
      <path fill="#FFB900" d="M13 13h9v9h-9z" />
    </svg>
  );
}

function GoogleLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" {...props}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.02 1.53 7.4 2.8l5.4-5.4C33.54 3.7 29.2 1.5 24 1.5 14.8 1.5 6.9 6.8 3.1 14.4l6.5 5.1C11.4 13.2 17.2 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24c0-1.6-.15-2.8-.47-4.05H24v7.7h12.7c-.26 2.0-1.67 5.0-4.8 7.05l6.2 4.8C43.8 35.7 46.5 30.4 46.5 24z"/>
      <path fill="#FBBC05" d="M9.6 28.5c-.45-1.35-.7-2.8-.7-4.5s.25-3.15.68-4.5l-6.5-5.1C1.7 17.2 1 20.5 1 24s.7 6.8 2.1 9.6l6.5-5.1z"/>
      <path fill="#34A853" d="M24 46.5c6.5 0 12-2.15 16-5.85l-6.2-4.8c-1.65 1.15-3.85 1.95-9.8 1.95-6.8 0-12.55-3.7-15.2-9.0l-6.5 5.1C6.9 41.2 14.8 46.5 24 46.5z"/>
    </svg>
  );
}

function GitHubLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 .5C5.73.5.75 5.66.75 12.02c0 5.1 3.29 9.43 7.86 10.96.58.11.79-.25.79-.56v-2.04c-3.2.71-3.88-1.37-3.88-1.37-.53-1.36-1.29-1.72-1.29-1.72-1.05-.73.08-.72.08-.72 1.16.08 1.77 1.2 1.77 1.2 1.03 1.79 2.7 1.27 3.36.97.1-.76.4-1.27.72-1.56-2.56-.3-5.26-1.31-5.26-5.83 0-1.29.45-2.34 1.2-3.17-.12-.3-.52-1.51.11-3.14 0 0 .98-.32 3.2 1.2.93-.26 1.93-.39 2.93-.39s2 .13 2.93.39c2.22-1.52 3.2-1.2 3.2-1.2.63 1.63.23 2.84.11 3.14.75.83 1.2 1.88 1.2 3.17 0 4.53-2.7 5.53-5.28 5.82.41.36.78 1.08.78 2.18v3.23c0 .31.21.68.8.56 4.56-1.53 7.85-5.86 7.85-10.96C23.25 5.66 18.27.5 12 .5z"
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

  const [mode, setMode] = useState<Mode>("password");
  const [step, setStep] = useState<Step>("enterEmail");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function checkAllowed(e: string) {
    const r = await fetch("/api/auth/allowed", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: e }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || "Auth check failed");
    return Boolean(j?.allowed);
  }

  async function handlePasswordLogin() {
    setLoading(true);
    setErr(null);
    setInfo(null);

    const e = email.trim().toLowerCase();
    if (!e) {
      setLoading(false);
      setErr("Please enter your email.");
      return;
    }
    if (!password) {
      setLoading(false);
      setErr("Please enter your password.");
      return;
    }

    try {
      const allowed = await checkAllowed(e);
      if (!allowed) {
        setLoading(false);
        setErr("That email isn’t authorised for this tenant.");
        return;
      }
    } catch (ex: any) {
      setLoading(false);
      setErr(ex?.message || "Auth check failed.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password,
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    window.location.assign("/");
  }

  async function sendOtpCode() {
    setLoading(true);
    setErr(null);
    setInfo(null);

    const e = email.trim().toLowerCase();
    if (!e) {
      setLoading(false);
      setErr("Please enter your email.");
      return;
    }

    try {
      const allowed = await checkAllowed(e);
      if (!allowed) {
        setLoading(false);
        setErr("That email isn’t authorised for this tenant.");
        return;
      }
    } catch (ex: any) {
      setLoading(false);
      setErr(ex?.message || "Auth check failed.");
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

  async function verifyOtpCode() {
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

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }
    if (!data.session) {
      setErr("Verified, but no session returned. Check Supabase Auth settings.");
      return;
    }

    window.location.assign("/");
  }

  async function sendPasswordReset() {
    setLoading(true);
    setErr(null);
    setInfo(null);

    const e = email.trim().toLowerCase();
    if (!e) {
      setLoading(false);
      setErr("Enter your email first.");
      return;
    }

    // Optional: require tenant membership to request reset
    try {
      const allowed = await checkAllowed(e);
      if (!allowed) {
        setLoading(false);
        setErr("That email isn’t authorised for this tenant.");
        return;
      }
    } catch (ex: any) {
      setLoading(false);
      setErr(ex?.message || "Auth check failed.");
      return;
    }

    const redirectTo = `${window.location.origin}/auth/reset`;

    const { error } = await supabase.auth.resetPasswordForEmail(e, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setInfo("Password reset email sent. Check your inbox.");
  }

  // UI-only for now (wire later when you’re ready)
  async function oauth(provider: "google" | "github" | "azure") {
    setErr(null);
    setInfo("SSO buttons are ready — we’ll wire these once providers are configured.");
  }

  return (
    <div className="space-y-4">
      {/* Mode switch */}
      <div className="flex gap-2">
        <button
          type="button"
          className={[
            "flex-1 rounded-xl border px-3 py-2 text-sm transition",
            "hi5-border hover:bg-black/5 dark:hover:bg-white/5",
            mode === "password"
              ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.30)]"
              : "opacity-80",
          ].join(" ")}
          onClick={() => {
            setMode("password");
            setStep("enterEmail");
            setCode("");
            setErr(null);
            setInfo(null);
          }}
          disabled={loading}
        >
          Password
        </button>
        <button
          type="button"
          className={[
            "flex-1 rounded-xl border px-3 py-2 text-sm transition",
            "hi5-border hover:bg-black/5 dark:hover:bg-white/5",
            mode === "otp"
              ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.30)]"
              : "opacity-80",
          ].join(" ")}
          onClick={() => {
            setMode("otp");
            setStep("enterEmail");
            setPassword("");
            setErr(null);
            setInfo(null);
          }}
          disabled={loading}
        >
          Email code
        </button>
      </div>

      {/* Email */}
      <label className="block text-sm">
        Email
        <input
          className="mt-1 w-full hi5-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          inputMode="email"
          placeholder="you@company.com"
          disabled={loading || (mode === "otp" && step === "enterCode")}
        />
      </label>

      {/* Password mode */}
      {mode === "password" && (
        <>
          <label className="block text-sm">
            Password
            <input
              className="mt-1 w-full hi5-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              disabled={loading}
            />
          </label>

          <button
            type="button"
            className="w-full rounded-xl border px-3 py-2 font-medium hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
            disabled={!email.trim() || !password || loading}
            onClick={handlePasswordLogin}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <button
            type="button"
            className="w-full rounded-xl border px-3 py-2 text-sm hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
            disabled={loading}
            onClick={sendPasswordReset}
          >
            Forgot password?
          </button>
        </>
      )}

      {/* OTP mode */}
      {mode === "otp" && (
        <>
          {step === "enterEmail" ? (
            <button
              type="button"
              className="w-full rounded-xl border px-3 py-2 font-medium hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
              disabled={!email.trim() || loading}
              onClick={sendOtpCode}
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
                type="button"
                className="w-full rounded-xl border px-3 py-2 font-medium hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
                disabled={!code.trim() || loading}
                onClick={verifyOtpCode}
              >
                {loading ? "Verifying..." : "Verify & sign in"}
              </button>

              <button
                type="button"
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
                type="button"
                className="w-full rounded-xl border px-3 py-2 text-sm hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
                disabled={loading}
                onClick={sendOtpCode}
              >
                Resend code
              </button>
            </>
          )}
        </>
      )}

      {/* SSO (UI now, wire later) */}
      <div className="pt-2">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          <span className="text-xs opacity-70">or continue with</span>
          <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => oauth("google")}
            className="w-full rounded-xl border px-3 py-2 text-sm hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center justify-center gap-2"
            disabled={loading}
          >
            <GoogleLogo />
            Google
          </button>

          <button
            type="button"
            onClick={() => oauth("azure")}
            className="w-full rounded-xl border px-3 py-2 text-sm hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center justify-center gap-2"
            disabled={loading}
          >
            <MicrosoftLogo />
            Microsoft
          </button>

          <button
            type="button"
            onClick={() => oauth("github")}
            className="w-full rounded-xl border px-3 py-2 text-sm hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center justify-center gap-2"
            disabled={loading}
          >
            <GitHubLogo />
            GitHub
          </button>
        </div>
      </div>

      {info && <p className="text-sm opacity-80">{info}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
