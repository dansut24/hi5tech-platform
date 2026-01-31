"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

function slugifySubdomain(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export default function SignupPage() {
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<null | {
    tenantId: string;
    subdomain: string;
    tenantUrl: string;
    inviteSent: boolean;
  }>(null);

  const suggestedSubdomain = useMemo(() => {
    const base = companyName ? slugifySubdomain(companyName) : "";
    return base || "";
  }, [companyName]);

  const finalSubdomain = useMemo(() => {
    const s = subdomain ? slugifySubdomain(subdomain) : suggestedSubdomain;
    return s;
  }, [subdomain, suggestedSubdomain]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!companyName.trim()) {
      setError("Please enter your company name.");
      return;
    }
    if (!finalSubdomain) {
      setError("Please choose a subdomain.");
      return;
    }
    if (!adminEmail.trim()) {
      setError("Please enter an admin email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyName,
          subdomain: finalSubdomain,
          adminEmail,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || "Signup failed.");
        return;
      }

      setSuccess({
        tenantId: json?.tenantId,
        subdomain: json?.subdomain,
        tenantUrl: json?.tenantUrl,
        inviteSent: !!json?.inviteSent,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-10">
        <Link href="/" className="text-sm opacity-70 hover:opacity-100">
          ← Back
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">Start your 14‑day trial</h1>
        <p className="mt-2 opacity-80">
          Create a tenant for your company and get immediate access to ITSM + RMM.
          No payment details required.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3">
          <form onSubmit={onSubmit} className="hi5-card p-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Company name</label>
                <input
                  className="hi5-input mt-2 w-full"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Ltd"
                  autoComplete="organization"
                />
                {!subdomain && companyName ? (
                  <div className="mt-2 text-xs opacity-70">
                    Suggested subdomain: <span className="font-mono">{suggestedSubdomain || "—"}</span>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="text-sm font-medium">Subdomain</label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    className="hi5-input w-full"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    placeholder={suggestedSubdomain || "your-company"}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  <span className="text-sm opacity-70 whitespace-nowrap">.yourdomain</span>
                </div>
                <div className="mt-2 text-xs opacity-70">
                  This becomes your login URL.
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Admin email</label>
                <input
                  className="hi5-input mt-2 w-full"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@acme.com"
                  autoComplete="email"
                  inputMode="email"
                />
                <div className="mt-2 text-xs opacity-70">
                  We’ll send you an invite link to set your password.
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border hi5-border bg-red-500/10 p-3 text-sm">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-xl border hi5-border bg-emerald-500/10 p-3 text-sm">
                  <div className="font-medium">Tenant created 🎉</div>
                  <div className="mt-1 opacity-80">
                    {success.inviteSent
                      ? "Invite sent. Check your inbox."
                      : "Invite could not be sent automatically — we’ll still create the tenant."}
                  </div>
                  <div className="mt-3">
                    <a
                      href={success.tenantUrl}
                      className="inline-flex items-center rounded-xl border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
                    >
                      Open tenant
                    </a>
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                className="hi5-accent-btn w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Creating…" : "Start free trial"}
              </button>
            </div>
          </form>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="hi5-card p-6">
            <div className="text-sm font-semibold">What you get</div>
            <ul className="mt-3 space-y-2 text-sm opacity-80 list-disc pl-5">
              <li>14 days full access</li>
              <li>Multi‑tenant setup</li>
              <li>ITSM tickets + knowledge base</li>
              <li>RMM device inventory + remote tools</li>
            </ul>
          </div>
          <div className="hi5-card p-6">
            <div className="text-sm font-semibold">Next steps</div>
            <ol className="mt-3 space-y-2 text-sm opacity-80 list-decimal pl-5">
              <li>Create your tenant</li>
              <li>Confirm invite email</li>
              <li>Invite your team</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
