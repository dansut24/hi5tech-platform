"use client";

import { useMemo, useState } from "react";

type Tenant = {
  id: string;
  name: string;
  subdomain: string;
  domain: string;
};

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

type StepId = "company" | "branding" | "access" | "microsoft" | "invite" | "done";

function StepPill({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      className={[
        "px-3 py-1 rounded-full border text-xs font-semibold",
        active
          ? "bg-[rgba(var(--hi5-accent),0.14)] border-[rgba(var(--hi5-accent),0.32)]"
          : "hi5-border opacity-70",
      ].join(" ")}
    >
      {label}
    </div>
  );
}

async function updateTenantSettings(payload: any) {
  const r = await fetch("/api/admin/tenant-settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || "Failed to save settings");
  return j;
}

export default function SetupWizard({
  tenant,
  me,
  initial,
}: {
  tenant: Tenant;
  me: { email: string };
  initial: InitialSettings | null;
}) {
  const steps: { id: StepId; label: string }[] = useMemo(
    () => [
      { id: "company", label: "Company" },
      { id: "branding", label: "Branding" },
      { id: "access", label: "Access" },
      { id: "microsoft", label: "Microsoft" },
      { id: "invite", label: "Invite" },
      { id: "done", label: "Finish" },
    ],
    []
  );

  const [step, setStep] = useState<StepId>("company");

  const [companyName, setCompanyName] = useState(initial?.company_name ?? tenant.name ?? "");
  const [supportEmail, setSupportEmail] = useState(initial?.support_email ?? me.email ?? "");
  const [timezone, setTimezone] = useState(initial?.timezone ?? "Europe/London");

  const [accent1, setAccent1] = useState(initial?.accent_hex ?? "#00c1ff");
  const [accent2, setAccent2] = useState(initial?.accent_2_hex ?? "#ff4fe1");
  const [accent3, setAccent3] = useState(initial?.accent_3_hex ?? "#ffc42d");

  const [allowedDomains, setAllowedDomains] = useState<string>(
    (initial?.allowed_domains ?? []).join(", ")
  );

  const [msEnabled, setMsEnabled] = useState(Boolean(initial?.ms_enabled));
  const [msStatus, setMsStatus] = useState<string>(
    initial?.ms_connected_at ? "Connected" : "Not connected"
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const idx = steps.findIndex((s) => s.id === step);

  function next() {
    setErr(null);
    setOk(null);
    const n = Math.min(steps.length - 1, idx + 1);
    setStep(steps[n].id);
  }

  function back() {
    setErr(null);
    setOk(null);
    const n = Math.max(0, idx - 1);
    setStep(steps[n].id);
  }

  async function savePartial(partial: any) {
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      await updateTenantSettings(partial);
      setOk("Saved");
    } catch (e: any) {
      setErr(e?.message || "Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setOk(null), 1500);
    }
  }

  async function handleFinish() {
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      await updateTenantSettings({
        company_name: companyName,
        support_email: supportEmail,
        timezone,
        accent_hex: accent1,
        accent_2_hex: accent2,
        accent_3_hex: accent3,
        allowed_domains: allowedDomains
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
        ms_enabled: msEnabled,
        onboarding_completed: true,
      });

      window.location.assign("/apps");
    } catch (e: any) {
      setErr(e?.message || "Failed to finish setup");
    } finally {
      setSaving(false);
    }
  }

  async function connectMicrosoftStub() {
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const r = await fetch("/api/admin/integrations/microsoft/start", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Microsoft connect not available yet");
      // Later: redirect to j.url
      setMsStatus("Ready (stub)");
      setOk("Microsoft connect stub is wired. Next step is OAuth + Graph consent.");
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="hi5-panel p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-xs opacity-70">Tenant setup</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
              Welcome to {tenant.subdomain}.{tenant.domain}
            </h1>
            <p className="text-sm opacity-75 mt-2">
              Complete setup to unlock Admin + module access for your tenant.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {steps.map((s) => (
              <StepPill key={s.id} active={s.id === step} label={s.label} />
            ))}
          </div>
        </div>
      </div>

      <div className="hi5-panel p-6">
        {/* COMPANY */}
        {step === "company" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Company profile</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Company name
                <input
                  className="mt-1 hi5-input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Hi5Tech Ltd"
                />
              </label>

              <label className="block text-sm">
                Support email
                <input
                  className="mt-1 hi5-input"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@yourcompany.com"
                />
              </label>

              <label className="block text-sm sm:col-span-2">
                Timezone
                <input
                  className="mt-1 hi5-input"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Europe/London"
                />
                <div className="text-xs opacity-70 mt-1">
                  Keep as Europe/London for now — we can make this a dropdown later.
                </div>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                className="hi5-btn-ghost text-sm"
                type="button"
                disabled={saving}
                onClick={() =>
                  savePartial({
                    company_name: companyName,
                    support_email: supportEmail,
                    timezone,
                  })
                }
              >
                {saving ? "Saving…" : "Save"}
              </button>

              <button className="hi5-btn-primary text-sm" type="button" onClick={next}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* BRANDING */}
        {step === "branding" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Branding</h2>
            <p className="text-sm opacity-75">
              These colours drive your Hi5Tech gradients, highlights and buttons.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                Accent 1
                <input className="mt-1 hi5-input" value={accent1} onChange={(e) => setAccent1(e.target.value)} />
              </label>
              <label className="block text-sm">
                Accent 2
                <input className="mt-1 hi5-input" value={accent2} onChange={(e) => setAccent2(e.target.value)} />
              </label>
              <label className="block text-sm">
                Accent 3
                <input className="mt-1 hi5-input" value={accent3} onChange={(e) => setAccent3(e.target.value)} />
              </label>
            </div>

            <div className="hi5-card p-4">
              <div className="text-sm font-semibold">Preview</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="hi5-btn-primary text-sm">Primary</button>
                <button type="button" className="hi5-btn-ghost text-sm">Secondary</button>
                <div className="rounded-2xl border hi5-border px-3 py-2 text-sm">
                  Badge preview
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button className="hi5-btn-ghost text-sm" type="button" onClick={back}>
                Back
              </button>

              <button
                className="hi5-btn-ghost text-sm"
                type="button"
                disabled={saving}
                onClick={() =>
                  savePartial({
                    accent_hex: accent1,
                    accent_2_hex: accent2,
                    accent_3_hex: accent3,
                  })
                }
              >
                {saving ? "Saving…" : "Save"}
              </button>

              <button className="hi5-btn-primary text-sm" type="button" onClick={next}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ACCESS */}
        {step === "access" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Access control</h2>
            <p className="text-sm opacity-75">
              Lock sign-in to your tenant by email domain. This is what powers your “auto-create if part of tenant” rule.
            </p>

            <label className="block text-sm">
              Allowed email domains (comma-separated)
              <input
                className="mt-1 hi5-input"
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                placeholder="yourcompany.com, yourcompany.co.uk"
              />
              <div className="text-xs opacity-70 mt-1">
                Example: if <b>yourcompany.com</b> is listed, then users signing in with Microsoft/Email from that domain can be auto-provisioned.
              </div>
            </label>

            <div className="flex gap-2 pt-2">
              <button className="hi5-btn-ghost text-sm" type="button" onClick={back}>
                Back
              </button>

              <button
                className="hi5-btn-ghost text-sm"
                type="button"
                disabled={saving}
                onClick={() =>
                  savePartial({
                    allowed_domains: allowedDomains
                      .split(",")
                      .map((s) => s.trim().toLowerCase())
                      .filter(Boolean),
                  })
                }
              >
                {saving ? "Saving…" : "Save"}
              </button>

              <button className="hi5-btn-primary text-sm" type="button" onClick={next}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* MICROSOFT */}
        {step === "microsoft" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Microsoft Entra ID</h2>
            <p className="text-sm opacity-75">
              Connect Microsoft to enable Microsoft sign-in and (later) user/device imports via Graph.
            </p>

            <div className="hi5-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Status</div>
                  <div className="text-sm opacity-75 mt-1">{msStatus}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="hi5-btn-ghost text-sm"
                    onClick={() => setMsEnabled((v) => !v)}
                    disabled={saving}
                    title="Enable/disable Microsoft as an auth method"
                  >
                    {msEnabled ? "Enabled" : "Disabled"}
                  </button>

                  <button
                    type="button"
                    className="hi5-btn-primary text-sm"
                    onClick={connectMicrosoftStub}
                    disabled={saving}
                  >
                    Connect Microsoft
                  </button>
                </div>
              </div>

              <div className="mt-3 text-xs opacity-70">
                Next step (we’ll implement): OAuth + admin consent, store tenant ID, then enable import actions.
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button className="hi5-btn-ghost text-sm" type="button" onClick={back}>
                Back
              </button>

              <button
                className="hi5-btn-ghost text-sm"
                type="button"
                disabled={saving}
                onClick={() => savePartial({ ms_enabled: msEnabled })}
              >
                {saving ? "Saving…" : "Save"}
              </button>

              <button className="hi5-btn-primary text-sm" type="button" onClick={next}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* INVITE */}
        {step === "invite" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Invite users</h2>
            <p className="text-sm opacity-75">
              For now, keep using your existing invite flow at <b>/admin/users/invite</b>.
              Next we’ll add “Import from Microsoft” here once Graph is wired.
            </p>

            <div className="hi5-card p-4">
              <div className="text-sm font-semibold">Actions</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a className="hi5-btn-primary text-sm" href="/admin/users/invite">
                  Invite user
                </a>
                <a className="hi5-btn-ghost text-sm" href="/admin/users">
                  View users
                </a>
                <button className="hi5-btn-ghost text-sm" type="button" disabled title="Coming soon">
                  Import from Microsoft (soon)
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button className="hi5-btn-ghost text-sm" type="button" onClick={back}>
                Back
              </button>
              <button className="hi5-btn-primary text-sm" type="button" onClick={next}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* DONE */}
        {step === "done" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Finish setup</h2>
            <p className="text-sm opacity-75">
              This will mark onboarding as complete for this tenant.
            </p>

            <div className="hi5-card p-4 text-sm">
              <div className="font-semibold">Summary</div>
              <ul className="mt-2 space-y-2 opacity-80">
                <li>• Company: <b>{companyName || "—"}</b></li>
                <li>• Support email: <b>{supportEmail || "—"}</b></li>
                <li>• Allowed domains: <b>{allowedDomains || "—"}</b></li>
                <li>• Microsoft: <b>{msEnabled ? "Enabled" : "Disabled"}</b></li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <button className="hi5-btn-ghost text-sm" type="button" onClick={back} disabled={saving}>
                Back
              </button>
              <button className="hi5-btn-primary text-sm" type="button" onClick={handleFinish} disabled={saving}>
                {saving ? "Finishing…" : "Complete setup"}
              </button>
            </div>
          </div>
        )}

        {(ok || err) && (
          <div className="pt-4">
            {ok ? <div className="text-sm opacity-80">{ok}</div> : null}
            {err ? <div className="text-sm text-red-600">{err}</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
