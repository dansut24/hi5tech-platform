"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function getNextPath(url: URL) {
  const next = url.searchParams.get("next");
  // only allow internal redirects
  if (!next || !next.startsWith("/")) return "/login";
  return next;
}

// Keep this aligned with Supabase EmailOtpType (avoid phone-only types)
type EmailOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change";

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
        const nextPath = getNextPath(url);

        // ------------------------------------------------------------
        // A) NEW Supabase email links:
        //    /auth/invite?token_hash=...&type=invite&next=...
        //    Consume with verifyOtp({ token_hash, type })
        // ------------------------------------------------------------
        const token_hash = url.searchParams.get("token_hash");
        const typeParam = url.searchParams.get("type");

        // Only accept known email OTP types (prevents TS + runtime weirdness)
        const allowedTypes: EmailOtpType[] = [
          "signup",
          "invite",
          "magiclink",
          "recovery",
          "email_change",
        ];

        const type = allowedTypes.includes(typeParam as EmailOtpType)
          ? (typeParam as EmailOtpType)
          : null;

        if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type,
          });

          if (error) {
            setMsg(
              "Your setup link is invalid or has expired. Please request a new invite."
            );
            return;
          }

          // Clean URL (remove auth params but keep ?next= if present)
          url.searchParams.delete("token_hash");
          url.searchParams.delete("type");
          url.searchParams.delete("redirect_to");
          window.history.replaceState(
            {},
            "",
            url.pathname + (url.search ? url.search : "")
          );

          window.location.assign(nextPath);
          return;
        }

        // ------------------------------------------------------------
        // B) Old implicit flow links (hash tokens):
        //    #access_token=...&refresh_token=...
        // ------------------------------------------------------------
        if (window.location.hash && window.location.hash.includes("access_token=")) {
          const hash = window.location.hash.replace(/^#/, "");
          const params = new URLSearchParams(hash);

          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (!access_token || !refresh_token) {
            setMsg(
              "Your setup link is invalid or has expired. Please request a new invite."
            );
            return;
          }

          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            setMsg(
              "Your setup link is invalid or has expired. Please request a new invite."
            );
            return;
          }

          // clean up URL (remove hash tokens)
          window.history.replaceState({}, "", url.pathname + url.search);
          window.location.assign(nextPath);
          return;
        }

        // ------------------------------------------------------------
        // C) PKCE flow:
        //    ?code=...
        // ------------------------------------------------------------
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMsg(
              "Your setup link is invalid or has expired. Please request a new invite."
            );
            return;
          }

          // Clean URL (remove code but keep ?next=)
          url.searchParams.delete("code");
          window.history.replaceState(
            {},
            "",
            url.pathname + (url.search ? url.search : "")
          );

          window.location.assign(nextPath);
          return;
        }

        setMsg(
          "Your setup link is invalid or has expired. Please request a new invite."
        );
      } catch {
        setMsg(
          "Your setup link is invalid or has expired. Please request a new invite."
        );
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
