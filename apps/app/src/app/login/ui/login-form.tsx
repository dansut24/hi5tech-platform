"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Mode = "password" | "otp";
type Step = "enterEmail" | "enterCode";

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

  function doneErr(message: string) {
    setLoading(false);
    setErr(message);
  }

  /**
   * After a successful sign-in we have a live session in memory.
   * We stamp it into shared-domain cookies HERE — while the access_token
   * is available — before redirecting anywhere.
   * This avoids the race condition where /auth/stamp loads a fresh Supabase
   * browser client that hasn't hydrated from localStorage yet and gets null.
   */
  async function stampAndRedirect(accessToken: string, refreshToken: string, next = "/apps") {
    try {
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
      });
    } catch {
      // Even if stamping fails, proceed — the Bearer token flow is a fallback
    }
    window.location.href = next;
  }

  // ------------------------
  // PASSWORD LOGIN
  // ------------------------
  async function handlePasswordLogin() {
    setLoading(true);
    setErr(null);
    setInfo(null);

    const e = email.trim().toLowerCase();
    if (!e) return doneErr("Please enter your email.");
    if (!password) return doneErr("Please enter your password.");

    try {
      const allowed = await checkAllowed(e);
      if (!allowed) return doneErr("That email isn't authorised for this tenant.");
    } catch (ex: any) {
      return doneErr(ex?.message || "Auth check failed.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: e, password });
    if (error) return doneErr(error.message);
    if (!data.session) return doneErr("Sign in succeeded but no session was returned.");

    setLoading(false);
    await stampAndRedirect(data.session.access_token, data.session.refresh_token, "/apps");
  }

  // ------------------------
  // EMAIL OTP
  // ------------------------
  async function sendOtpCode() {
    setLoading(true);
    setErr(null);
    setInfo(null);

    const e = email.trim().toLowerCase();
    if (!e) return doneErr("Please enter your email.");

    try {
      const allowed = await checkAllowed(e);
      if (!allowed) return doneErr("That email isn't authorised for this tenant.");
    } catch (ex: any) {
      return doneErr(ex?.message || "Auth check failed.");
    }

    const { error } = await supabase.auth.signInWithOtp({ email: e });
    if (error) return doneErr(error.message);

    setLoading(false);
    setStep("enterCode");
    setInfo("Code sent. Check your email and enter the 6-digit code.");
  }

  async function verifyOtpCode() {
    setLoading(true);
    setErr(null);
    setInfo(null);

    const e = email.trim().toLowerCase();
    const token = code.trim();
    if (!token) return doneErr("Please enter the code.");

    const { data, error } = await supabase.auth.verifyOtp({
      email: e,
      token,
      type: "email",
    });

    if (error) return doneErr(error.message);
    if (!data.session) return doneErr("Verified, but no session returned.");

    setLoading(false);
    await stampAndRedirect(data.session.access_token, data.session.refresh_token, "/apps");
  }

  // ------------------------
  // RESET PASSWORD
  // ------------------------
  async function sendPasswordReset() {
    setLoading(true);
    setErr(null);
    setInfo(null);

    const e = email.trim().toLowerCase();
    if (!e) return doneErr("Enter your email first.");

    try {
      const allowed = await checkAllowed(e);
      if (!allowed) return doneErr("That email isn't authorised for this tenant.");
    } catch (ex: any) {
      return doneErr(ex?.message || "Auth check failed.");
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo });
    if (error) return doneErr(error.message);

    setLoading(false);
    setInfo("Password reset email sent. Check your inbox.");
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          className={`flex-1 ${mode === "password" ? "hi5-btn-primary" : "hi5-btn-ghost"}`}
          onClick={() => {
            setMode("password");
            setStep("enterEmail");
            setErr(null);
            setInfo(null);
            setCode("");
            setPassword("");
          }}
          disabled={loading}
        >
          Password
        </button>

        <button
          type="button"
          className={`flex-1 ${mode === "otp" ? "hi5-btn-primary" : "hi5-btn-ghost"}`}
          onClick={() => {
            setMode("otp");
            setStep("enterEmail");
            setErr(null);
            setInfo(null);
            setCode("");
            setPassword("");
          }}
          disabled={loading}
        >
          Email code
        </button>
      </div>

      <label className="block text-sm font-medium">
        Email address
        <input
          className="mt-2 hi5-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          inputMode="email"
          placeholder="you@company.com"
          disabled={loading || (mode === "otp" && step === "enterCode")}
        />
      </label>

      {mode === "password" && (
        <>
          <label className="block text-sm font-medium">
            Password
            <input
              type="password"
              className="mt-2 hi5-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
            />
          </label>

          <button
            type="button"
            className="w-full hi5-btn-primary"
            onClick={handlePasswordLogin}
            disabled={!email.trim() || !password || loading}
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          <button
            type="button"
            className="w-full hi5-btn-ghost"
            onClick={sendPasswordReset}
            disabled={loading}
          >
            Forgot password?
          </button>
        </>
      )}

      {mode === "otp" && (
        <>
          {step === "enterEmail" ? (
            <button
              type="button"
              className="w-full hi5-btn-primary"
              onClick={sendOtpCode}
              disabled={!email.trim() || loading}
            >
              {loading ? "Sending..." : "Send code"}
            </button>
          ) : (
            <>
              <label className="block text-sm font-medium">
                6-digit code
                <input
                  className="mt-2 hi5-input tracking-widest"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  placeholder="123456"
                  disabled={loading}
                />
              </label>

              <button
                type="button"
                className="w-full hi5-btn-primary"
                onClick={verifyOtpCode}
                disabled={!code.trim() || loading}
              >
                {loading ? "Verifying..." : "Continue"}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="w-full hi5-btn-ghost"
                  disabled={loading}
                  onClick={() => {
                    setStep("enterEmail");
                    setCode("");
                    setErr(null);
                    setInfo(null);
                  }}
                >
                  Change email
                </button>

                <button
                  type="button"
                  className="w-full hi5-btn-ghost"
                  disabled={loading}
                  onClick={sendOtpCode}
                >
                  Resend
                </button>
              </div>
            </>
          )}
        </>
      )}

      {info && <p className="text-sm opacity-80">{info}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
