"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function slugifySubdomain(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export default function SignupForm() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const s = slugifySubdomain(subdomain || companyName);
    return s ? `${s}.hi5tech.co.uk` : "your-company.hi5tech.co.uk";
  }, [subdomain, companyName]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/trial-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          subdomain: slugifySubdomain(subdomain || companyName),
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }

      router.push(`/signup/success?company=${encodeURIComponent(companyName.trim())}`);
    } catch (err: any) {
      setError(String(err?.message ?? err) || "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Company name</label>
        <input
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
          placeholder="Acme Ltd"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Desired subdomain</label>
        <input
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
          placeholder="acme"
          value={subdomain}
          onChange={(e) => setSubdomain(e.target.value)}
        />
        <div className="mt-1 text-xs opacity-75">
          Preview: <span className="font-medium">{preview}</span>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Work email</label>
        <input
          type="email"
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
          placeholder="you@acme.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-white text-black px-4 py-2 font-semibold hover:bg-white/90 disabled:opacity-60"
      >
        {busy ? "Creating trial…" : "Start 14‑day free trial"}
      </button>

      <p className="text-xs opacity-75">
        By continuing you agree to our Terms. No card required for the trial.
      </p>
    </form>
  );
}
