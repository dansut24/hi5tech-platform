"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function getNextPath(url: URL) {
  const next = url.searchParams.get("next");
  // only allow internal redirects
  if (!next || !next.startsWith("/")) return "/login";
  return next;
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
        const nextPath = getNextPath(url);

        // 1) If we have tokens in the hash (invite/magic link), set session from them
        if (window.location.hash && window.location.hash.includes("access_token=")) {
          const hash = window.location.hash.replace(/^#/, "");
          const params = new URLSearchParams(hash);

          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (!access_token || !refresh_token) {
            setMsg("Email link is invalid or has expired.");
            return;
          }

          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            setMsg("Email link is invalid or has expired.");
            return;
          }

          // clean up URL (remove hash tokens)
          window.history.replaceState({}, "", url.pathname + url.search);
          window.location.assign(nextPath);
          return;
        }

        // 2) If you're using PKCE flows elsewhere, support ?code= too (safe to keep)
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMsg("Email link is invalid or has expired.");
            return;
          }
          window.location.assign(nextPath);
          return;
        }

        // Nothing to consume
        setMsg("Email link is invalid or has expired.");
      } catch {
        setMsg("Email link is invalid or has expired.");
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
