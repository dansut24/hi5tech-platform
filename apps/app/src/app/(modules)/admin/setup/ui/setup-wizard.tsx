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
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const steps = useMemo(
    () => [
      { title: "Company details", desc: "Confirm your company info & support contact." },
      { title: "Branding", desc: "Logo and colours (you can change later)." },
      { title: "Users", desc: "Invite users now (or later)." },
      { title: "Microsoft", desc: "Connect Microsoft to enable SSO and imports (next step)." },
      { title: "Finish", desc: "Lock in setup and open the Admin dashboard." },
    ],
    []
  );

  async function finishSetup() {
    setSaving(true);
    setErr(null);
    setInfo(null);

    try {
      const r = await fetch("/api/admin/onboarding/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}), // kept for future payload needs
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Failed to complete onboarding.");

      setInfo("Setup complete. Redirecting…");
      window.location.assign("/admin");
    } catch (e: any) {
      setErr(e?.message || "Failed to complete onboarding.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hi5-panel p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs opacity-70">Admin setup</div>
          <h1 className="text-2xl font-extrabold mt-1">Welcome, {me.email || "Owner"}</h1>
          <p className="text-sm opacity-75 mt-2">
            Let’s set up <span className="font-semibold">{tenant.name}</span> (
            <span className="font-medium">{tenant.subdomain}</span>.
            <span className="font-medium">{tenant.domain}</span>)
          </p>
        </div>

        <div className="rounded-2xl border hi5-border px-3 py-2 text-xs font-semibold opacity-80">
          Step {step + 1} / {steps.length}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-5">
        {steps.map((s, idx) => {
          const active = idx === step;
          const done = idx < step;
          return (
            <div
              key={s.title}
              className={[
                "rounded-2xl border hi5-border px-3 py-3 text-xs transition",
                active ? "bg-[rgba(var(--hi5-accent),0.10)] border-[rgba(var(--hi5-accent),0.28)]" : "",
                done ? "opacity-90" : "opacity-70",
              ].join(" ")}
            >
              <div className="font-semibold">{s.title}</div>
              <div className="mt-1 opacity-80">{s.desc}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 hi5-card p-5">
        {step === 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Company details</div>
            <p className="text-sm opacity-80">
              Current: <span className="font-medium">{initial?.company_name ?? tenant.name}</span>
            </p>
            <p className="text-xs opacity-70">
              (We’ll wire saving these fields next — this step is UI-first so the flow is in place.)
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Branding</div>
            <p className="text-sm opacity-80">
              You’ll be able to upload a logo and set accents. (Wiring next.)
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Users</div>
            <p className="text-sm opacity-80">
              Invite your team now, or skip and do it later from Admin → Users.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Microsoft</div>
            <p className="text-sm opacity-80">
              Next we’ll add the “Connect Microsoft” screen here (tenant admin only) and enable SSO + imports.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="text-sm font-semibold">Finish</div>
            <p className="text-sm opacity-80">
              This will lock onboarding and open the Admin module. You can still edit settings later.
            </p>

            <button
              type="button"
              className="hi5-btn-primary w-full"
              onClick={finishSetup}
              disabled={saving}
            >
              {saving ? "Completing…" : "Complete setup"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          className="hi5-btn-ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={saving || step === 0}
        >
          Back
        </button>

        {step < steps.length - 1 ? (
          <button
            type="button"
            className="hi5-btn-primary"
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            disabled={saving}
          >
            Next
          </button>
        ) : (
          <div />
        )}
      </div>

      {info ? <p className="mt-4 text-sm opacity-80">{info}</p> : null}
      {err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}
    </div>
  );
}
