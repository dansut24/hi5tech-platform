// apps/app/src/app/(modules)/admin/setup/ui/setup-wizard.tsx
"use client";

import { useMemo, useState } from "react";

type TenantInfo = {
  id: string;
  name: string;
  subdomain: string;
  domain: string;
};

export type InitialSettings = {
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

function StepPill({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      className={[
        "px-3 py-1.5 rounded-2xl text-xs border hi5-border",
        active ? "bg-[rgba(var(--hi5-accent),0.10)] border-[rgba(var(--hi5-accent),0.28)]" : "opacity-70",
      ].join(" ")}
    >
      {label}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs opacity-70 mb-1">{label}</div>
      <input
        className="w-full rounded-2xl border hi5-border hi5-card px-4 py-3 text-sm outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="text-xs opacity-70 mb-1">{label}</div>
      <div className="flex items-center gap-3">
        <input
          className="h-11 w-14 rounded-2xl border hi5-border hi5-card px-2"
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
        <input
          className="flex-1 rounded-2xl border hi5-border hi5-card px-4 py-3 text-sm outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#00c1ff"
        />
      </div>
    </label>
  );
}

export default function SetupWizard({
  tenant,
  me,
  initial,
}: {
  tenant: TenantInfo;
  me: { email: string };
  initial: InitialSettings | null;
}) {
  const init = useMemo(() => {
    const allowed = initial?.allowed_domains?.join(", ") ?? "";
    return {
      companyName: initial?.company_name ?? tenant.name ?? "",
      supportEmail: initial?.support_email ?? me.email ?? "",
      timezone: initial?.timezone ?? "Europe/London",
      logoUrl: initial?.logo_url ?? "",
      accent: initial?.accent_hex ?? "#00c1ff",
      accent2: initial?.accent_2_hex ?? "#ff4fe1",
      accent3: initial?.accent_3_hex ?? "#ffc42d",
      allowedDomains: allowed,
      msEnabled: Boolean(initial?.ms_enabled),
      msTenantId: initial?.ms_tenant_id ?? "",
    };
  }, [initial, tenant.name, me.email]);

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState(init.companyName);
  const [supportEmail, setSupportEmail] = useState(init.supportEmail);
  const [timezone, setTimezone] = useState(init.timezone);

  const [logoUrl, setLogoUrl] = useState(init.logoUrl);
  const [accent, setAccent] = useState(init.accent);
  const [accent2, setAccent2] = useState(init.accent2);
  const [accent3, setAccent3] = useState(init.accent3);

  const [allowedDomains, setAllowedDomains] = useState(init.allowedDomains);

  const [msEnabled, setMsEnabled] = useState(init.msEnabled);
  const [msTenantId, setMsTenantId] = useState(init.msTenantId);

  async function save(partial?: Partial<InitialSettings>) {
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const payload: InitialSettings = {
        company_name: companyName.trim() || null,
        support_email: supportEmail.trim() || null,
        timezone: timezone.trim() || null,
        logo_url: logoUrl.trim() || null,
        accent_hex: accent.trim() || null,
        accent_2_hex: accent2.trim() || null,
        accent_3_hex: accent3.trim() || null,
        allowed_domains: allowedDomains
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
        ms_enabled: msEnabled,
        ms_tenant_id: msTenantId.trim() || null,
        ...partial,
      };

      const res = await fetch("/api/admin/setup/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Save failed (${res.status})`);
      }

      setOk("Saved");
    } catch (e: any) {
      setErr(e?.message || "Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setOk(null), 1200);
    }
  }

  async function finish() {
    setSaving(true);
    setErr(null);
    try {
      // ✅ COMPLETE onboarding (hard gate uses this)
      await fetch("/api/admin/onboarding/complete", { method: "POST" });

      // ✅ send them to modules
      window.location.assign("/apps");
    } catch (e: any) {
      setErr(e?.message || "Failed to complete onboarding");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="hi5-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs opacity-70">Admin setup</div>
            <h1 className="text-2xl font-extrabold mt-1">{tenant.name}</h1>
            <p className="text-sm opacity-75 mt-2">
              Complete setup to unlock the platform. You can edit these settings later in Admin → Settings.
            </p>
          </div>

          <div className="hidden sm:flex flex-wrap gap-2 justify-end">
            <StepPill active={step === 0} label="Company" />
            <StepPill active={step === 1} label="Branding" />
            <StepPill active={step === 2} label="Microsoft" />
            <StepPill active={step === 3} label="Finish" />
          </div>
        </div>

        {err ? <div className="mt-4 text-sm text-red-500">{err}</div> : null}
        {ok ? <div className="mt-4 text-sm text-emerald-500">{ok}</div> : null}
      </div>

      {/* Step content */}
      <div className="hi5-panel p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div className="text-lg font-semibold">Company details</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Company name"
                value={companyName}
                onChange={setCompanyName}
                placeholder="Hi5Tech"
              />
              <Field
                label="Support email"
                value={supportEmail}
                onChange={setSupportEmail}
                placeholder="support@company.com"
                type="email"
              />
              <Field label="Timezone" value={timezone} onChange={setTimezone} placeholder="Europe/London" />
              <Field
                label="Allowed domains (comma separated)"
                value={allowedDomains}
                onChange={setAllowedDomains}
                placeholder="hi5tech.co.uk, yourclient.com"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="text-lg font-semibold">Branding</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Logo URL (optional)"
                value={logoUrl}
                onChange={setLogoUrl}
                placeholder="https://..."
              />
              <div className="hi5-card rounded-2xl border hi5-border p-4">
                <div className="text-xs opacity-70">Preview</div>
                <div className="mt-3 flex items-center gap-3">
                  <div
                    className="h-12 w-12 rounded-2xl border hi5-border"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, rgba(var(--hi5-accent-2),.55), rgba(var(--hi5-accent),.55) 60%, rgba(var(--hi5-accent-3),.55))",
                    }}
                  />
                  <div>
                    <div className="text-sm font-semibold">{companyName || tenant.name}</div>
                    <div className="text-xs opacity-70">{tenant.subdomain}.{tenant.domain}</div>
                  </div>
                </div>
              </div>

              <ColorField label="Accent" value={accent} onChange={setAccent} />
              <ColorField label="Accent 2" value={accent2} onChange={setAccent2} />
              <ColorField label="Accent 3" value={accent3} onChange={setAccent3} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-lg font-semibold">Microsoft integration</div>

            <div className="hi5-card rounded-2xl border hi5-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">Enable Microsoft SSO + imports</div>
                  <div className="text-sm opacity-75 mt-1">
                    You’ll add the app registration details here (tenant id now; client/secret later when we wire Graph).
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={msEnabled}
                    onChange={(e) => setMsEnabled(e.target.checked)}
                  />
                  Enabled
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Microsoft tenant ID (optional for now)"
                  value={msTenantId}
                  onChange={setMsTenantId}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
                <div className="rounded-2xl border hi5-border hi5-card p-4">
                  <div className="text-xs opacity-70">Imports</div>
                  <div className="text-sm mt-2 opacity-80">
                    Next step: connect Graph + allow the Owner to import users/devices.
                  </div>
                  <div className="text-xs opacity-70 mt-2">
                    (This is UI-ready; we’ll wire real auth later.)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="text-lg font-semibold">Finish</div>
            <p className="text-sm opacity-80">
              When you finish, onboarding is marked complete and you’ll be redirected to Modules.
            </p>

            <div className="hi5-card rounded-2xl border hi5-border p-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <div className="rounded-2xl border hi5-border px-3 py-2">
                  <span className="opacity-70">Company:</span> {companyName || "—"}
                </div>
                <div className="rounded-2xl border hi5-border px-3 py-2">
                  <span className="opacity-70">Support:</span> {supportEmail || "—"}
                </div>
                <div className="rounded-2xl border hi5-border px-3 py-2">
                  <span className="opacity-70">MS:</span> {msEnabled ? "Enabled" : "Disabled"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="hi5-btn-ghost text-sm"
          disabled={saving || step === 0}
          onClick={() => setStep((s) => (s > 0 ? ((s - 1) as any) : s))}
        >
          Back
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="hi5-btn-ghost text-sm"
            disabled={saving}
            onClick={() => save()}
            title="Save progress"
          >
            {saving ? "Saving…" : "Save"}
          </button>

          {step < 3 ? (
            <button
              type="button"
              className="hi5-btn-primary text-sm"
              disabled={saving}
              onClick={async () => {
                await save();
                setStep((s) => ((s + 1) as any));
              }}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="hi5-btn-primary text-sm"
              disabled={saving}
              onClick={finish}
            >
              {saving ? "Finishing…" : "Finish setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
