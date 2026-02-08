"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type EmailOtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change";

function safeNext(url: URL) {
  const next = url.searchParams.get("next");
  if (!next || !next.startsWith("/")) return "/apps";
  return next;
}

function parseEmailOtpType(raw: string | null): EmailOtpType | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  const allowed: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change"];
  return (allowed as string[]).includes(v) ? (v as EmailOtpType) : null;
}

export default function AuthCallbackPage() {
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const nextPath = safeNext(url);

        // 1) Invite / magiclink using token_hash + type (Supabase email OTP)
        const token_hash = url.searchParams.get("token_hash");
        const type = parseEmailOtpType(url.searchParams.get("type"));

        if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type,
          });

          if (error) {
            setMsg("Your setup link is invalid or has expired. Please request a new invite.");
            return;
          }

          window.location.assign(nextPath);
          return;
        }

        // 2) PKCE/code flow support (?code=)
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMsg("Your setup link is invalid or has expired. Please request a new invite.");
            return;
          }
          window.location.assign(nextPath);
          return;
        }

        // 3) Legacy hash tokens (access_token/refresh_token)
        if (window.location.hash && window.location.hash.includes("access_token=")) {
          const hash = window.location.hash.replace(/^#/, "");
          const params = new URLSearchParams(hash);

          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (!access_token || !refresh_token) {
            setMsg("Your setup link is invalid or has expired. Please request a new invite.");
            return;
          }

          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            setMsg("Your setup link is invalid or has expired. Please request a new invite.");
            return;
          }

          // remove hash
          window.history.replaceState({}, "", url.pathname + url.search);
          window.location.assign(nextPath);
          return;
        }

        setMsg("Your setup link is invalid or has expired. Please request a new invite.");
      } catch {
        setMsg("Your setup link is invalid or has expired. Please request a new invite.");
      }
    })();
  }, [supabase]);

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md hi5-panel p-6">
        <h1 className="text-xl font-semibold">Finishing sign-in…</h1>
        <p className="text-sm opacity-80 mt-2">{msg}</p>
      </div>
    </div>
  );
}
