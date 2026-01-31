"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Step = "enterEmail" | "enterCode";
type OAuthProvider = "google" | "github" | "azure";

/** Root domain used for tenant subdomains (matches middleware logic) */
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

/** Extract tenant key from hostname.
 * - dan-sutton.hi5tech.co.uk -> { domain: hi5tech.co.uk, subdomain: dan-sutton }
 * - custom domain (acme.com) -> { domain: acme.com, subdomain: null }
 * - root/app/www -> null
 */
function tenantKeyFromHostname(hostname: string): { domain: string; subdomain: string | null } | null {
  const host = (hostname || "").split(":")[0].toLowerCase();

  if (!host) return null;
  if (host === "localhost" || host.endsWith(".vercel.app")) return null;

  if (host.endsWith(ROOT_DOMAIN)) {
    if (host === ROOT_DOMAIN) return null;

    const sub = host.slice(0, -ROOT_DOMAIN.length - 1);
    if (!sub) return null;
    if (sub === "www" || sub === "app") return null;

    return { domain: ROOT_DOMAIN, subdomain: sub };
  }

  return { domain: host, subdomain: null };
}

function Divider() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      <div className="text-xs opacity-70">or</div>
      <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
    </div>
  );
}

function ProviderIcon({ provider }: { provider: OAuthProvider }) {
  // Inline SVGs so you don’t need extra deps
  if (provider === "google") {
    return (
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.68 32.658 29.253 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.963 3.037l5.657-5.657C34.047 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.656 16.108 19.014 12 24 12c3.059 0 5.842 1.154 7.963 3.037l5.657-5.657C34.047 6.053 29.268 4 24 4 16.318 4 9.656 8.134 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.191-5.238C29.174 35.091 26.715 36 24 36c-5.232 0-9.646-3.318-11.279-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.225-2.233 4.113-4.085 5.565l.003-.002 6.191 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z" />
      </svg>
    );
  }

  if (provider === "github") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M12 .5C5.73.5.75 5.68.75 12.15c0 5.21 3.44 9.63 8.2 11.19.6.12.82-.27.82-.6 0-.3-.01-1.1-.02-2.16-3.34.75-4.04-1.66-4.04-1.66-.55-1.44-1.34-1.83-1.34-1.83-1.1-.78.08-.77.08-.77 1.21.09 1.85 1.28 1.85 1.28 1.08 1.9 2.83 1.35 3.52 1.03.11-.8.42-1.35.76-1.66-2.67-.31-5.48-1.38-5.48-6.13 0-1.35.46-2.45 1.23-3.31-.12-.31-.53-1.57.12-3.27 0 0 1-.33 3.3 1.26.96-.27 1.98-.4 3-.4s2.04.13 3 .4c2.3-1.59 3.3-1.26 3.3-1.26.65 1.7.24 2.96.12 3.27.77.86 1.23 1.96 1.23 3.31 0 4.77-2.81 5.81-5.5 6.12.43.39.82 1.16.82 2.34 0 1.69-.02 3.06-.02 3.48 0 .33.22.73.83.6 4.76-1.56 8.2-5.98 8.2-11.19C23.25 5.68 18.27.5 12 .5z" />
      </svg>
    );
  }

  // Microsoft (Azure AD)
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
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

  async function tenantPrecheck(e: string) {
    const key = tenantKeyFromHostname(window.location.hostname);

    // If we’re not on a tenant hostname, don’t block (marketing/root, localhost, etc.)
    if (!key) return { ok: true as const };

    const res = await fetch("/api/auth/tenant-precheck", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        email: e,
        domain: key.domain,
        subdomain: key.subdomain,
      }),
    });

    if (!res.ok) {
      return {
        ok: false as const,
        message: "We couldn’t validate your access for this tenant. Please try again.",
      };
    }

    const data = (await res.json()) as { allowed?: boolean; message?: string };
    if (!data?.allowed) {
      return {
        ok: false as const,
        message:
          data?.message ||
          "That email isn’t authorised for this tenant. Please ask your admin for an invite.",
      };
    }

    return { ok: true as const };
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

    // ✅ Tenant-aware precheck (prevents OTP being sent to random emails)
    const pre = await tenantPrecheck(e);
    if (!pre.ok) {
      setLoading(false);
      setErr(pre.message);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: {
        // optional: keep your email templates clean, and avoid unwanted redirects
        shouldCreateUser: false, // ✅ blocks auto-user creation (invite-only)
      },
    });

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

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    if (!data.session) {
      setErr("Verified, but no session returned. Check Supabase Auth settings.");
      return;
    }

    // After login, your server-side module layout will enforce tenant membership too.
    window.location.assign("/");
  }

  async function signInWithProvider(provider: OAuthProvider) {
    setLoading(true);
    setErr(null);
    setInfo(null);

    try {
      // NOTE: you’ll need these providers configured in Supabase Auth:
      // - Google
      // - GitHub
      // - Azure (Microsoft)
      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider === "azure" ? "azure" : provider,
        options: { redirectTo },
      });

      if (error) {
        setErr(error.message);
      }
    } catch {
      setErr("OAuth sign-in is not available yet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* OAuth buttons */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => signInWithProvider("azure")}
          disabled={loading}
          className="w-full rounded-xl border hi5-border px-3 py-2 font-medium disabled:opacity-60 hover:bg-black/5 dark:hover:bg-white/5 transition inline-flex items-center justify-center gap-2"
        >
          <ProviderIcon provider="azure" />
          Continue with Microsoft
        </button>

        <button
          type="button"
          onClick={() => signInWithProvider("google")}
          disabled={loading}
          className="w-full rounded-xl border hi5-border px-3 py-2 font-medium disabled:opacity-60 hover:bg-black/5 dark:hover:bg-white/5 transition inline-flex items-center justify-center gap-2"
        >
          <ProviderIcon provider="google" />
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => signInWithProvider("github")}
          disabled={loading}
          className="w-full rounded-xl border hi5-border px-3 py-2 font-medium disabled:opacity-60 hover:bg-black/5 dark:hover:bg-white/5 transition inline-flex items-center justify-center gap-2"
        >
          <ProviderIcon provider="github" />
          Continue with GitHub
        </button>
      </div>

      <Divider />

      {/* OTP flow */}
      <div className="space-y-3">
        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded-xl border hi5-border px-3 py-2 bg-transparent"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            inputMode="email"
            placeholder="you@company.com"
            disabled={step === "enterCode" || loading}
          />
        </label>

        {step === "enterEmail" ? (
          <button
            type="button"
            className="w-full rounded-xl border hi5-border px-3 py-2 font-medium disabled:opacity-60 hover:bg-black/5 dark:hover:bg-white/5 transition"
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
                className="mt-1 w-full rounded-xl border hi5-border px-3 py-2 bg-transparent tracking-widest"
                value={code}
                onChange={(ev) => setCode(ev.target.value)}
                inputMode="numeric"
                placeholder="123456"
                disabled={loading}
              />
            </label>

            <button
              type="button"
              className="w-full rounded-xl border hi5-border px-3 py-2 font-medium disabled:opacity-60 hover:bg-black/5 dark:hover:bg-white/5 transition"
              disabled={!code.trim() || loading}
              onClick={verifyCode}
            >
              {loading ? "Verifying..." : "Verify & sign in"}
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                className="w-full rounded-xl border hi5-border px-3 py-2 text-sm disabled:opacity-60 hover:bg-black/5 dark:hover:bg-white/5 transition"
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
                className="w-full rounded-xl border hi5-border px-3 py-2 text-sm disabled:opacity-60 hover:bg-black/5 dark:hover:bg-white/5 transition"
                disabled={loading}
                onClick={sendCode}
              >
                Resend code
              </button>
            </div>
          </>
        )}

        {info && <p className="text-sm opacity-80">{info}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </div>
  );
}
