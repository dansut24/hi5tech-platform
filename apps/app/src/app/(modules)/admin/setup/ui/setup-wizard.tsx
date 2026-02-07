"use client";

import { useEffect, useState } from "react";

type TenantInfo = {
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
};

type Props = {
  tenant: TenantInfo;
  me: {
    email: string;
  };
  initial: InitialSettings | null;
};

const STEPS = ["Company", "Branding", "Integrations", "Finish"] as const;

export default function SetupWizard({ tenant, me, initial }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    company_name: initial?.company_name ?? tenant.name,
    support_email: initial?.support_email ?? me.email,
    timezone: initial?.timezone ?? "Europe/London",
    logo_url: initial?.logo_url ?? "",
    accent_hex: initial?.accent_hex ?? "#7C5CFF",
    accent_2_hex: initial?.accent_2_hex ?? "#38BDF8",
    accent_3_hex: initial?.accent_3_hex ?? "#22C55E",
    allowed_domains: initial?.allowed_domains?.join(", ") ?? "",
    ms_enabled: initial?.ms_enabled ?? false,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function savePartial() {
    setSaving(true);
    await fetch("/api/admin/setup/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        allowed_domains: form.allowed_domains
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
      }),
    });
    setSaving(false);
  }

  async function completeOnboarding() {
    setSaving(true);

    // mark onboarding complete (authoritative)
    await fetch("/api/admin/onboarding/complete", {
      method: "POST",
    });

    // hard redirect to apps
    window.location.assign("/apps");
  }

  return (
    <div className="rounded-2xl border hi5-border hi5-card p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Admin setup</h1>
        <p className="text-sm opacity-70 mt-1">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </div>

      {/* Step content */}
      {step === 0 && (
        <div className="space-y-4">
          <Field label="Company name">
            <input
              className="hi5-input"
              value={form.company_name}
              onChange={(e) => update("company_name", e.target.value)}
            />
          </Field>

          <Field label="Support email">
            <input
              className="hi5-input"
              value={form.support_email}
              onChange={(e) => update("support_email", e.target.value)}
            />
          </Field>

          <Field label="Timezone">
            <input
              className="hi5-input"
              value={form.timezone}
              onChange={(e) => update("timezone", e.target.value)}
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Field label="Logo URL">
            <input
              className="hi5-input"
              value={form.logo_url}
              onChange={(e) => update("logo_url", e.target.value)}
            />
          </Field>

          <ColorField
            label="Primary colour"
            value={form.accent_hex}
            onChange={(v) => update("accent_hex", v)}
          />

          <ColorField
            label="Secondary colour"
            value={form.accent_2_hex}
            onChange={(v) => update("accent_2_hex", v)}
          />

          <ColorField
            label="Accent colour"
            value={form.accent_3_hex}
            onChange={(v) => update("accent_3_hex", v)}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field label="Allowed email domains (comma separated)">
            <input
              className="hi5-input"
              placeholder="example.com, client.co.uk"
              value={form.allowed_domains}
              onChange={(e) => update("allowed_domains", e.target.value)}
            />
          </Field>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.ms_enabled}
              onChange={(e) => update("ms_enabled", e.target.checked)}
            />
            Enable Microsoft integration
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold">You're ready to go 🎉</h2>
          <p className="text-sm opacity-70 mt-2">
            This will complete onboarding and unlock the platform.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between">
        <button
          className="text-sm opacity-70 hover:opacity-100"
          disabled={step === 0 || saving}
          onClick={() => setStep((s) => s - 1)}
        >
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            className="hi5-button"
            disabled={saving}
            onClick={async () => {
              await savePartial();
              setStep((s) => s + 1);
            }}
          >
            Continue
          </button>
        ) : (
          <button
            className="hi5-button"
            disabled={saving}
            onClick={completeOnboarding}
          >
            Finish setup
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm opacity-70">{label}</div>
      {children}
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
      <div className="mb-1 text-sm opacity-70">{label}</div>
      <div className="flex gap-3 items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="hi5-input flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}
