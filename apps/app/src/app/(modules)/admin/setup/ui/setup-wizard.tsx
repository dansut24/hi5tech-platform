// apps/app/src/app/(modules)/admin/setup/ui/setup-wizard.tsx
"use client";

import { useMemo, useState } from "react";

type InitialSettings = {
  company_name?: string | null;
  support_email?: string | null;
  timezone?: string | null;
  logo_url?: string | null;
  accent_hex?: string | null;
  accent_2_hex?: string | null;
  accent_3_hex?: string | null;
  allowed_domains?: string[] | null;
  ms_enabled?: boolean | null;
  ms_tenant_id?: string | null;
  ms_connected_at?: string | null;
  onboarding_completed?: boolean | null;
};

export default function SetupWizard({
  tenant,
  me,
  initial,
}: {
  tenant: { id: string; name: string; subdomain: string; domain: string };
  me: { email: string };
  initial: InitialSettings | null;
}) {
  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Step 1: Company basics
  const [companyName, setCompanyName] = useState(initial?.company_name ?? tenant.name ?? "");
  const [supportEmail, setSupportEmail] = useState(initial?.support_email ?? me.email ?? "");
  const [timezone, setTimezone] = useState(initial?.timezone ?? "Europe/London");

  // Step 2: Branding
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? "");
  const [accent1, setAccent1] = useState(initial?.accent_hex ?? "#00c1ff");
  const [accent2, setAccent2] = useState(initial?.accent_2_hex ?? "#ff4fe1");
  const [accent3, setAccent3] = useState(initial?.accent_3_hex ?? "#ffc42d");

  // Step 3: Allowed domains
  const [domainsText, setDomainsText] = useState(
    (initial?.allowed_domains && initial.allowed_domains.length
      ? initial.allowed_domains
      : supportEmail?.includes("@")
        ? [supportEmail.split("@")[1]]
        : []
    ).join(", ")
  );

  // Step 4: Microsoft (placeholder for now)
  const [msEnabled, setMsEnabled] = useState(Boolean(initial?.ms_enabled ?? false));
  const [msTenantId, setMsTenantId] = useState(initial?.ms_tenant_id ?? "");

  const steps = useMemo(
    () => [
      { id: 1, title: "Company" },
      { id: 2, title: "Branding" },
      { id: 3, title: "Allowed domains" },
      { id: 4, title: "Microsoft" },
      { id: 5, title: "Finish" },
    ],
    []
  );

  function normalizeDomains(input: string) {
    const raw = String(input || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    // de-dupe + basic shape
    const set = new Set<string>();
    for (const d of raw) {
      const cleaned = d.replace(/^@/, "");
      if (!cleaned) continue;
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned)) continue;
      set.add(cleaned);
    }
    return Array.from(set);
  }

  async function saveDraft() {
    setSaving(true);
    setErr(null);

    const payload = {
      company_name: companyName.trim(),
      support_email: supportEmail.trim().toLowerCase(),
      timezone,
      logo_url: logoUrl.trim() || null,
      accent_hex: accent1.trim(),
      accent_2_hex: accent2.trim(),
      accent_3_hex: accent3.trim(),
      allowed_domains: normalizeDomains(domainsText),
      ms_enabled: msEnabled,
      ms_tenant_id: msTenantId.trim() || null,
    };

    const r = await fetch("/api/admin/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // NOTE: route can treat this as a partial upsert when onboarding_completed=false
      body: JSON.stringify({ ...payload, onboarding_completed: false }),
    });

    const j = await r.json().catch(() => ({}));
    setSaving(false);

    if (!r.ok) {
      setErr(j?.error || "Failed to save. Please try again.");
      return false;
    }
    return true;
  }

  async function completeOnboarding() {
    setSaving(true);
    setErr(null);

    // Final validate client-side
    const cn = companyName.trim();
    const se = supportEmail.trim().toLowerCase();
    if (!cn) {
      setSaving(false);
      setErr("Company name is required.");
      return;
    }
    if (!se || !se.includes("@")) {
      setSaving(false);
      setErr("Support email is required.");
      return;
    }

    // 1) save the latest draft (best effort)
    const ok = await saveDraft();
    if (!ok) return;

    // 2) mark onboarding completed + redirect to /apps
    await fetch("/api/admin/onboarding/complete", {
      method: "POST",
    });

    window.location.assign("/apps");
  }

  return (
    <div className="hi5-panel p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Admin setup</h1>
          <p className="text-sm opacity-80 mt-1">
            Configure <span className="font-medium">{tenant.subdomain}</span> •{" "}
            {tenant.subdomain}.{tenant.domain}
          </p>
        </div>

        <div className="text-xs opacity-70">
          Step {step} / {steps.length}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {steps.map((s) => {
          const active = s.id === step;
          const done = s.id < step;
          return (
            <div
              key={s.id}
              className={[
                "rounded-2xl border px-3 py-2 text-xs font-semibold transition",
                "hi5-border",
                active
                  ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.30)]"
                  : done
                    ? "opacity-90"
                    : "opacity-65",
              ].join(" ")}
            >
              {s.title}
            </div>
          );
        })}
      </div>

      <div className="mt-6 space-y-4">
        {step === 1 && (
          <>
            <div>
              <div className="text-sm font-semibold">Company details</div>
              <div className="text-xs opacity-70 mt-1">
                This shows in the portal and emails.
              </div>
            </div>

            <label className="block text-sm">
              Company name
              <input
                className="mt-1 hi5-input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={saving}
                placeholder="Hi5Tech Ltd"
              />
            </label>

            <label className="block text-sm">
              Support email
              <input
                className="mt-1 hi5-input"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                disabled={saving}
                inputMode="email"
                placeholder="support@company.com"
              />
            </label>

            <label className="block text-sm">
              Timezone
              <input
                className="mt-1 hi5-input"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={saving}
                placeholder="Europe/London"
              />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <div className="text-sm font-semibold">Branding</div>
              <div className="text-xs opacity-70 mt-1">
                Add a logo and pick your accent colours.
              </div>
            </div>

            <label className="block text-sm">
              Logo URL (optional)
              <input
                className="mt-1 hi5-input"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                disabled={saving}
                placeholder="https://..."
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                Accent 1
                <input
                  className="mt-1 hi5-input"
                  value={accent1}
                  onChange={(e) => setAccent1(e.target.value)}
                  disabled={saving}
                  placeholder="#00c1ff"
                />
              </label>
              <label className="block text-sm">
                Accent 2
                <input
                  className="mt-1 hi5-input"
                  value={accent2}
                  onChange={(e) => setAccent2(e.target.value)}
                  disabled={saving}
                  placeholder="#ff4fe1"
                />
              </label>
              <label className="block text-sm">
                Accent 3
                <input
                  className="mt-1 hi5-input"
                  value={accent3}
                  onChange={(e) => setAccent3(e.target.value)}
                  disabled={saving}
                  placeholder="#ffc42d"
                />
              </label>
            </div>

            <div className="hi5-card p-4">
              <div className="text-xs opacity-70">Preview</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <div
                  className="h-10 w-10 rounded-2xl border hi5-border"
                  style={{ background: accent1 }}
                  title="Accent 1"
                />
                <div
                  className="h-10 w-10 rounded-2xl border hi5-border"
                  style={{ background: accent2 }}
                  title="Accent 2"
                />
                <div
                  className="h-10 w-10 rounded-2xl border hi5-border"
                  style={{ background: accent3 }}
                  title="Accent 3"
                />
                <button type="button" className="hi5-btn-primary text-sm ml-auto">
                  Primary button
                </button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <div className="text-sm font-semibold">Allowed domains</div>
              <div className="text-xs opacity-70 mt-1">
                Used to restrict sign-in/invites to your company domains.
              </div>
            </div>

            <label className="block text-sm">
              Domains (comma-separated)
              <input
                className="mt-1 hi5-input"
                value={domainsText}
                onChange={(e) => setDomainsText(e.target.value)}
                disabled={saving}
                placeholder="company.com, company.co.uk"
              />
            </label>

            <div className="hi5-card p-4">
              <div className="text-xs opacity-70">Parsed</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {normalizeDomains(domainsText).length ? (
                  normalizeDomains(domainsText).map((d) => (
                    <div
                      key={d}
                      className="rounded-full border hi5-border px-2 py-1 text-xs"
                    >
                      {d}
                    </div>
                  ))
                ) : (
                  <div className="text-sm opacity-70">No valid domains yet.</div>
                )}
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div>
              <div className="text-sm font-semibold">Microsoft integration</div>
              <div className="text-xs opacity-70 mt-1">
                We’ll wire this to Entra ID / Graph shortly. For now this stores your settings.
              </div>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={msEnabled}
                onChange={(e) => setMsEnabled(e.target.checked)}
                disabled={saving}
              />
              <span className="text-sm">Enable Microsoft sign-in + import</span>
            </label>

            <label className="block text-sm">
              Microsoft Tenant ID (optional for now)
              <input
                className="mt-1 hi5-input"
                value={msTenantId}
                onChange={(e) => setMsTenantId(e.target.value)}
                disabled={saving || !msEnabled}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </label>

            <div className="hi5-card p-4">
              <div className="text-sm font-semibold">Planned</div>
              <ul className="mt-2 text-sm opacity-80 space-y-1">
                <li>• Owner connects Microsoft (OAuth admin consent)</li>
                <li>• Import users & devices with Graph</li>
                <li>• Enforce tenant domain/tenant-id membership</li>
              </ul>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div>
              <div className="text-sm font-semibold">Finish</div>
              <div className="text-xs opacity-70 mt-1">
                Review your settings and complete onboarding.
              </div>
            </div>

            <div className="hi5-card p-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-xs opacity-70">Company</div>
                  <div className="font-medium">{companyName || "—"}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Support email</div>
                  <div className="font-medium">{supportEmail || "—"}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Timezone</div>
                  <div className="font-medium">{timezone || "—"}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Domains</div>
                  <div className="font-medium">
                    {normalizeDomains(domainsText).join(", ") || "—"}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div
                  className="h-9 w-9 rounded-2xl border hi5-border"
                  style={{ background: accent1 }}
                  title="Accent 1"
                />
                <div
                  className="h-9 w-9 rounded-2xl border hi5-border"
                  style={{ background: accent2 }}
                  title="Accent 2"
                />
                <div
                  className="h-9 w-9 rounded-2xl border hi5-border"
                  style={{ background: accent3 }}
                  title="Accent 3"
                />
                <div className="ml-auto text-xs opacity-70">
                  Microsoft: {msEnabled ? "Enabled" : "Disabled"}
                </div>
              </div>
            </div>
          </>
        )}

        {err && <div className="text-sm text-red-600">{err}</div>}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:justify-between">
        <button
          type="button"
          className="hi5-btn-ghost text-sm"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={saving || step === 1}
        >
          Back
        </button>

        <div className="flex gap-2 sm:justify-end">
          <button
            type="button"
            className="hi5-btn-ghost text-sm"
            onClick={saveDraft}
            disabled={saving}
            title="Save without completing onboarding"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          {step < 5 ? (
            <button
              type="button"
              className="hi5-btn-primary text-sm"
              onClick={async () => {
                setErr(null);
                // optional: auto-save when advancing
                const ok = await saveDraft();
                if (ok) setStep((s) => Math.min(5, s + 1));
              }}
              disabled={saving}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="hi5-btn-primary text-sm"
              onClick={completeOnboarding}
              disabled={saving}
            >
              {saving ? "Finishing..." : "Complete setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
