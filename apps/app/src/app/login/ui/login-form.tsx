"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Step = "enterEmail" | "enterCode";

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

  async function sendCode() {
    setLoading(true);
    setErr(null);
    setInfo(null);

    const e = email.trim();
    if (!e) {
      setLoading(false);
      setErr("Please enter your email.");
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

    const e = email.trim();
    const token = code.trim();

    if (!token) {
      setLoading(false);
      setErr("Please enter the code.");
      return;
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: e,
      token,
      type: "email"
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    // Important: ensure cookies/session are definitely set before navigating
    if (!data.session) {
      setErr("Verified, but no session returned. Check Supabase Auth settings.");
      return;
    }

    window.location.assign("/");
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        Email
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2 bg-transparent"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          inputMode="email"
          placeholder="you@company.com"
          disabled={step === "enterCode" || loading}
        />
      </label>

      {step === "enterEmail" ? (
        <button
          className="w-full rounded-xl border px-3 py-2 font-medium disabled:opacity-60"
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
              className="mt-1 w-full rounded-xl border px-3 py-2 bg-transparent tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              placeholder="123456"
              disabled={loading}
            />
          </label>

          <button
            className="w-full rounded-xl border px-3 py-2 font-medium disabled:opacity-60"
            disabled={!code.trim() || loading}
            onClick={verifyCode}
          >
            {loading ? "Verifying..." : "Verify & sign in"}
          </button>

          <button
            className="w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-60"
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
            className="w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-60"
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
  );
}
