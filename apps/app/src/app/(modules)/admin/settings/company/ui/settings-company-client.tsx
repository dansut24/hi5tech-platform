// apps/app/src/app/(modules)/admin/settings/company/ui/settings-company-client.tsx
"use client";

import { useMemo, useState } from "react";

type Initial = {
  company_name: string;
  support_email: string;
  timezone: string;
  allowed_domains: string[];
};

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

export default function SettingsCompanyClient({ initial }: { initial: Initial }) {
  const init = useMemo(() => {
    return {
      companyName: initial.company_name ?? "",
      supportEmail: initial.support_email ?? "",
      timezone: initial.timezone ?? "Europe/London",
      allowedDomains: (initial.allowed_domains ?? []).join(", "),
    };
  }, [initial]);

  const [companyName, setCompanyName] = useState(init.companyName);
  const [supportEmail, setSupportEmail] = useState(init.supportEmail);
  const [timezone, setTimezone] = useState(init.timezone);
  const [allowedDomains, setAllowedDomains] = useState(init.allowedDomains);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    setOk(null);

    try {
      const payload = {
        company_name: companyName.trim() || null,
        support_email: supportEmail.trim() || null,
        timezone: timezone.trim() || null,
        allowed_domains: allowedDomains
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
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

  return (
    <div className="hi5-panel p-6 space-y-4">
      {err ? <div className="text-sm text-red-500">{err}</div> : null}
      {ok ? <div className="text-sm text-emerald-500">{ok}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" value={companyName} onChange={setCompanyName} placeholder="Hi5Tech" />
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

      <div className="flex items-center justify-end gap-2">
        <button className="hi5-btn-primary text-sm w-auto" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
