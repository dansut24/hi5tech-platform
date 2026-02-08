"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function buildCallbackUrl(searchParams: URLSearchParams) {
  // Forward ALL params to /auth/callback so it can consume token_hash/code/etc.
  const qs = searchParams.toString();
  return qs ? `/auth/callback?${qs}` : "/auth/callback";
}

export default function InviteClient() {
  const sp = useSearchParams();
  const [loading, setLoading] = useState(false);

  const callbackUrl = useMemo(() => {
    // next/navigation useSearchParams returns ReadonlyURLSearchParams
    // but it supports .toString()
    return buildCallbackUrl(new URLSearchParams(sp.toString()));
  }, [sp]);

  return (
    <div className="pt-2">
      <button
        type="button"
        className="hi5-btn-primary w-full"
        disabled={loading}
        onClick={() => {
          setLoading(true);
          window.location.assign(callbackUrl);
        }}
      >
        {loading ? "Continuing…" : "Continue"}
      </button>

      <div className="mt-3 text-xs opacity-70 text-center">
        If you weren’t expecting this email, you can close this page.
      </div>
    </div>
  );
}
