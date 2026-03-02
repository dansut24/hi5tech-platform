// apps/app/src/app/auth/stamp/page.tsx
// Client page: reads the Supabase session from the browser (localStorage),
// POSTs it to /api/auth/session so the server can stamp shared-domain cookies,
// then redirects the user onwards.
"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function StampPage() {
  useEffect(() => {
    async function stamp() {
      const next = new URLSearchParams(window.location.search).get("next") || "/apps";

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (session) {
        // POST the tokens to the server so it can write shared-domain cookies
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        });
      }

      window.location.href = next;
    }

    stamp();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="opacity-60 text-sm">Signing you in…</p>
    </div>
  );
}
