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
      const cleanSubdomain = slugifySubdomain(subdomain || companyName);

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          subdomain: cleanSubdomain,
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }

      router.push(
        `/signup/success?company=${encodeURIComponent(companyName.trim())}&tenant=${encodeURIComponent(cleanSubdomain)}`
      );
    } catch (err: any) {
      setError(String(err?.message ?? err) || "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-bold">Company name</label>
        <input
          className="mt-2 w-full rounded-2xl border border-[rgba(var(--hi5-border),var(--hi5-border-alpha))] bg-[rgba(var(--hi5-card),0.55)] px-4 py-3 outline-none focus:ring-2 focus:ring-[rgba(var(--hi5-accent),0.25)]"
          placeholder="Acme Ltd"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-sm font-bold">Tenant subdomain</label>
        <input
          className="mt-2 w-full rounded-2xl border border-[rgba(var(--hi5-border),var(--hi5-border-alpha))] bg-[rgba(var(--hi5-card),0.55)] px-4 py-3 outline-none focus:ring-2 focus:ring-[rgba(var(--hi5-accent),0.25)]"
          placeholder="acme"
          value={subdomain}
          onChange={(e) => setSubdomain(e.target.value)}
        />
        <div className="mt-2 text-xs hi5-muted">
          Preview: <span className="font-bold">{preview}</span>
        </div>
      </div>

      <div>
        <label className="text-sm font-bold">Work email</label>
        <input
          type="email"
          className="mt-2 w-full rounded-2xl border border-[rgba(var(--hi5-border),var(--hi5-border-alpha))] bg-[rgba(var(--hi5-card),0.55)] px-4 py-3 outline-none focus:ring-2 focus:ring-[rgba(var(--hi5-accent),0.25)]"
          placeholder="you@acme.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      ) : null}

      <button type="submit" disabled={busy} className="hi5-btn hi5-btn-primary w-full">
        {busy ? "Creating tenant…" : "Start 14-day free trial"}
      </button>

      <p className="text-xs hi5-muted">
        No card required. We will create your tenant and send your owner invite by email.
      </p>
    </form>
  );
}
