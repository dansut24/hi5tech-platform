"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!pw1 || pw1.length < 8) return setMsg("Password must be at least 8 characters.");
    if (pw1 !== pw2) return setMsg("Passwords do not match.");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setLoading(false);

    if (error) return setMsg(error.message);

    router.replace("/apps");
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="hi5-panel border hi5-border rounded-3xl p-6 w-full max-w-md">
        <h1 className="text-lg font-semibold">Set a new password</h1>
        <p className="text-sm opacity-70 mt-1">Choose a new password for your account.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block text-sm font-medium">
            New password
            <input
              className="mt-2 hi5-input"
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              placeholder="At least 8 characters"
            />
          </label>

          <label className="block text-sm font-medium">
            Confirm password
            <input
              className="mt-2 hi5-input"
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Repeat password"
            />
          </label>

          {msg ? <p className="text-sm opacity-80">{msg}</p> : null}

          <button className="w-full hi5-btn-primary" disabled={loading} type="submit">
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
