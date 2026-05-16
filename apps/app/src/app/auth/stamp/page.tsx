"use client";

import { useEffect, useMemo, useState } from "react";

function getHashParams() {
  if (typeof window === "undefined") return new URLSearchParams();

  const raw = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  return new URLSearchParams(raw);
}

export default function AuthStampPage() {
  const [message, setMessage] = useState("Signing you in…");
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return "/setup";

    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/setup";

    if (!next.startsWith("/")) return "/setup";

    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const hash = getHashParams();

        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        const type = hash.get("type");

        if (!accessToken || !refreshToken) {
          setError(
            "The confirmation link did not include a complete sign-in session. Please request a new signup email and try again."
          );
          setMessage("Unable to sign in.");
          return;
        }

        setMessage("Securing your session…");

        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            type,
          }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || `Session failed (${res.status})`);
        }

        if (cancelled) return;

        setMessage("Redirecting to setup…");

        window.history.replaceState(null, "", `/auth/stamp?next=${encodeURIComponent(nextPath)}`);
        window.location.replace(nextPath);
      } catch (err) {
        if (cancelled) return;

        setError(err instanceof Error ? err.message : "Unable to complete sign in.");
        setMessage("Unable to sign in.");
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [nextPath]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-10">
      <div className="hi5-panel w-full max-w-md p-6 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-[rgba(var(--hi5-accent),0.12)] flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[rgba(var(--hi5-accent),0.25)] border-t-[rgb(var(--hi5-accent))]" />
        </div>

        <h1 className="mt-5 text-xl font-extrabold">{message}</h1>

        <p className="mt-2 text-sm opacity-70">
          Please keep this page open while we finish setting up your secure session.
        </p>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-left text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
