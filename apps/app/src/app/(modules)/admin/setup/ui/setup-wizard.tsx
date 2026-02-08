// apps/app/src/app/(modules)/admin/setup/ui/setup-wizard.tsx
"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

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

  bg_hex?: string | null;
  card_hex?: string | null;
  topbar_hex?: string | null;
  glow_1?: number | null;
  glow_2?: number | null;
  glow_3?: number | null;

  allowed_domains?: string[] | null;

  ms_enabled?: boolean | null;
  ms_tenant_id?: string | null;
  ms_connected_at?: string | null;

  onboarding_completed?: boolean | null;
};

type Preset = {
  key: string;
  label: string;
  accent: string;
  accent2: string;
  accent3: string;
  bg: string;
  card: string;
  topbar?: string; // optional -> "use card"
  glow1: number;
  glow2: number;
  glow3: number;
};

const PRESETS: Preset[] = [
  {
    key: "hi5-default",
    label: "Hi5Tech (Default)",
    accent: "#00c1ff",
    accent2: "#ff4fe1",
    accent3: "#ffc42d",
    bg: "#f8fafc",
    card: "#ffffff",
    topbar: "", // empty = use card
    glow1: 0.18,
    glow2: 0.14,
    glow3: 0.10,
  },
  {
    key: "midnight-neon",
    label: "Midnight Neon",
    accent: "#7C5CFF",
    accent2: "#38BDF8",
    accent3: "#FDE047",
    bg: "#0B1020",
    card: "#0F172A",
    topbar: "#0B1224",
    glow1: 0.22,
    glow2: 0.18,
    glow3: 0.14,
  },
  {
    key: "emerald-glow",
    label: "Emerald Glow",
    accent: "#34D399",
    accent2: "#22D3EE",
    accent3: "#FBBF24",
    bg: "#F8FAFC",
    card: "#FFFFFF",
    topbar: "",
    glow1: 0.16,
    glow2: 0.12,
    glow3: 0.10,
  },
  {
    key: "rose-graphite",
    label: "Rose + Graphite",
    accent: "#FB7185",
    accent2: "#A78BFA",
    accent3: "#FBBF24",
    bg: "#0B0D12",
    card: "#111827",
    topbar: "#0B0D12",
    glow1: 0.22,
    glow2: 0.18,
    glow3: 0.14,
  },
  {
    key: "ocean-glass",
    label: "Ocean Glass",
    accent: "#0EA5E9",
    accent2: "#22C55E",
    accent3: "#F97316",
    bg: "#F1F5F9",
    card: "#FFFFFF",
    topbar: "",
    glow1: 0.17,
    glow2: 0.13,
    glow3: 0.10,
  },
  {
  key: "neutral-light",
  label: "Neutral (Light) — White / Grey / Blue",
  accent: "#2563EB",     // blue
  accent2: "#2563EB",    // same so gradients become “solid-ish”
  accent3: "#2563EB",
  bg: "#FFFFFF",
  card: "#F3F4F6",       // light grey
  topbar: "#FFFFFF",
  glow1: 0,              // no blobs intensity
  glow2: 0,
  glow3: 0,
},
{
  key: "neutral-dark",
  label: "Neutral (Dark) — Charcoal / Slate / Blue",
  accent: "#3B82F6",
  accent2: "#3B82F6",
  accent3: "#3B82F6",
  bg: "#0B0D12",
  card: "#111827",
  topbar: "#0B0D12",
  glow1: 0,
  glow2: 0,
  glow3: 0,
},
{
  key: "minimal-grey",
  label: "Minimal Grey — Soft UI",
  accent: "#1D4ED8",
  accent2: "#1D4ED8",
  accent3: "#1D4ED8",
  bg: "#F8FAFC",
  card: "#E5E7EB",
  topbar: "#F8FAFC",
  glow1: 0,
  glow2: 0,
  glow3: 0,
},
];

function StepPill({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      className={[
        "px-3 py-1.5 rounded-2xl text-xs border hi5-border",
        active
          ? "bg-[rgba(var(--hi5-accent),0.10)] border-[rgba(var(--hi5-accent),0.28)]"
          : "opacity-70",
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="text-xs opacity-70">{label}</div>
        {hint ? <div className="text-[11px] opacity-60">{hint}</div> : null}
      </div>
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

function RangeField({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="text-xs opacity-70">{label}</div>
        <div className="text-[11px] opacity-60">
          {hint ? `${hint} • ` : ""}
          {value.toFixed(2)}
        </div>
      </div>
      <input
        className="w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function safeFileExt(name: string) {
  const base = (name || "").toLowerCase();
  const dot = base.lastIndexOf(".");
  const ext = dot >= 0 ? base.slice(dot + 1) : "";
  if (["png", "jpg", "jpeg", "webp", "svg"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
  return "png";
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

      bg: initial?.bg_hex ?? "#f8fafc",
      card: initial?.card_hex ?? "#ffffff",
      topbar: initial?.topbar_hex ?? "",
      glow1: typeof initial?.glow_1 === "number" ? initial!.glow_1! : 0.18,
      glow2: typeof initial?.glow_2 === "number" ? initial!.glow_2! : 0.14,
      glow3: typeof initial?.glow_3 === "number" ? initial!.glow_3! : 0.10,

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
  const [logoUploading, setLogoUploading] = useState(false);

  const [accent, setAccent] = useState(init.accent);
  const [accent2, setAccent2] = useState(init.accent2);
  const [accent3, setAccent3] = useState(init.accent3);

  const [bg, setBg] = useState(init.bg);
  const [card, setCard] = useState(init.card);
  const [topbar, setTopbar] = useState(init.topbar);

  const [glow1, setGlow1] = useState(init.glow1);
  const [glow2, setGlow2] = useState(init.glow2);
  const [glow3, setGlow3] = useState(init.glow3);

  const [allowedDomains, setAllowedDomains] = useState(init.allowedDomains);

  const [msEnabled, setMsEnabled] = useState(init.msEnabled);
  const [msTenantId, setMsTenantId] = useState(init.msTenantId);

  const [presetKey, setPresetKey] = useState<string>("");

  function applyPreset(p: Preset) {
    setAccent(p.accent);
    setAccent2(p.accent2);
    setAccent3(p.accent3);
    setBg(p.bg);
    setCard(p.card);
    setTopbar(p.topbar ?? "");
    setGlow1(p.glow1);
    setGlow2(p.glow2);
    setGlow3(p.glow3);
  }

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

        bg_hex: bg.trim() || null,
        card_hex: card.trim() || null,

        // IMPORTANT: if you keep topbar NOT NULL in DB, setTopbar should never be empty.
        // Recommended DB fix: drop NOT NULL. If you can't, we still send a value:
        topbar_hex: (topbar && topbar.trim()) ? topbar.trim() : (card.trim() || "#ffffff"),

        glow_1: Number.isFinite(glow1) ? glow1 : null,
        glow_2: Number.isFinite(glow2) ? glow2 : null,
        glow_3: Number.isFinite(glow3) ? glow3 : null,

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

  async function uploadLogo(file: File) {
    setLogoUploading(true);
    setErr(null);
    setOk(null);

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");

      const supabase = createBrowserClient(url, anon);

      const ext = safeFileExt(file.name);
      const path = `tenants/${tenant.id}/logo.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("tenant-assets")
        .upload(path, file, {
          upsert: true,
          contentType: file.type || undefined,
          cacheControl: "3600",
        });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Could not get public URL for uploaded logo");

      setLogoUrl(publicUrl);
      await save({ logo_url: publicUrl });
      setOk("Logo uploaded");
    } catch (e: any) {
      setErr(e?.message || "Logo upload failed");
    } finally {
      setLogoUploading(false);
      setTimeout(() => setOk(null), 1200);
    }
  }

  async function finish() {
    setSaving(true);
    setErr(null);

    try {
      await save();
      await fetch("/api/admin/onboarding/complete", { method: "POST" });
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
              Vital setup only. Everything can be edited later in Admin → Settings.
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

      <div className="hi5-panel p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div className="text-lg font-semibold">Company details</div>
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
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="text-lg font-semibold">Branding</div>

            {/* Presets */}
            <div className="hi5-card rounded-2xl border hi5-border p-4">
              <div className="text-xs opacity-70">Preset themes</div>
              <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center">
                <select
                  className="rounded-2xl border hi5-border hi5-card px-4 py-3 text-sm outline-none"
                  value={presetKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setPresetKey(key);
                    const p = PRESETS.find((x) => x.key === key);
                    if (p) applyPreset(p);
                  }}
                >
                  <option value="">Choose a preset…</option>
                  {PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="hi5-btn-ghost text-sm w-auto"
                  onClick={() => {
                    setPresetKey("");
                    applyPreset(PRESETS[0]);
                  }}
                >
                  Reset to default
                </button>

                <button
                  type="button"
                  className="hi5-btn-primary text-sm w-auto"
                  disabled={saving || logoUploading}
                  onClick={() => save()}
                >
                  Save theme
                </button>
              </div>
              <div className="mt-2 text-[11px] opacity-60">
                Presets just fill the fields — you can tweak anything after selecting.
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="hi5-card rounded-2xl border hi5-border p-4">
                  <div className="text-xs opacity-70">Logo</div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl border hi5-border overflow-hidden bg-white/50 dark:bg-black/30 flex items-center justify-center">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        <div
                          className="h-full w-full"
                          style={{
                            background:
                              "radial-gradient(circle at 30% 30%, rgba(var(--hi5-accent-2),.55), rgba(var(--hi5-accent),.55) 60%, rgba(var(--hi5-accent-3),.55))",
                          }}
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{companyName || tenant.name}</div>
                      <div className="text-xs opacity-70 truncate">
                        {tenant.subdomain}.{tenant.domain}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <label className="hi5-btn-ghost text-sm w-auto cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadLogo(f);
                          e.currentTarget.value = "";
                        }}
                        disabled={logoUploading || saving}
                      />
                      {logoUploading ? "Uploading…" : "Upload logo"}
                    </label>

                    {logoUrl ? (
                      <button
                        type="button"
                        className="hi5-btn-ghost text-sm w-auto"
                        disabled={logoUploading || saving}
                        onClick={() => {
                          setLogoUrl("");
                          save({ logo_url: null });
                        }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-3 text-[11px] opacity-60">
                    Bucket: <span className="font-mono">tenant-assets</span> (public)
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorField label="Accent" value={accent} onChange={setAccent} hint="Buttons + highlights" />
                  <ColorField label="Accent 2" value={accent2} onChange={setAccent2} hint="Gradients" />
                  <ColorField label="Accent 3" value={accent3} onChange={setAccent3} hint="Highlights" />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <ColorField label="Background" value={bg} onChange={setBg} hint="Base bg token" />
                  <ColorField label="Card" value={card} onChange={setCard} hint="Surfaces" />
                  <ColorField label="Topbar" value={topbar || card} onChange={setTopbar} hint="Empty = card" />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <RangeField label="Glow 1" value={glow1} onChange={setGlow1} hint="Sphere strength" />
                  <RangeField label="Glow 2" value={glow2} onChange={setGlow2} hint="Sphere strength" />
                  <RangeField label="Glow 3" value={glow3} onChange={setGlow3} hint="Sphere strength" />
                </div>
              </div>

              <div className="hi5-card rounded-2xl border hi5-border p-5">
                <div className="text-xs opacity-70">Preview</div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border hi5-border p-4 hi5-card">
                    <div className="text-sm font-semibold">Card example</div>
                    <div className="text-sm opacity-80 mt-1">Save then refresh any page to see full effect.</div>
                    <button type="button" className="hi5-btn-primary text-sm mt-3">
                      Primary Button
                    </button>
                  </div>

                  <div className="rounded-2xl border hi5-border p-4 hi5-panel">
                    <div className="text-sm font-semibold">Panel example</div>
                    <div className="text-sm opacity-80 mt-1">Panels remain readable on top of blobs.</div>
                    <button type="button" className="hi5-btn-ghost text-sm mt-3 w-auto">
                      Ghost button
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-lg font-semibold">Microsoft integration</div>

            <div className="hi5-card rounded-2xl border hi5-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">Enable Microsoft</div>
                  <div className="text-sm opacity-75 mt-1">
                    Optional in onboarding. Configure fully later in Admin → Integrations.
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={msEnabled} onChange={(e) => setMsEnabled(e.target.checked)} />
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
                  <div className="text-xs opacity-70">Next</div>
                  <div className="text-sm mt-2 opacity-80">
                    After onboarding we’ll add OAuth connection + imports.
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
              Finishing marks onboarding complete and unlocks the platform. You’ll be redirected to Modules.
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
                  <span className="opacity-70">Logo:</span> {logoUrl ? "Set" : "None"}
                </div>
                <div className="rounded-2xl border hi5-border px-3 py-2">
                  <span className="opacity-70">MS:</span> {msEnabled ? "Enabled" : "Disabled"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="hi5-btn-ghost text-sm w-auto"
          disabled={saving || step === 0 || logoUploading}
          onClick={() => setStep((s) => (s > 0 ? ((s - 1) as any) : s))}
        >
          Back
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="hi5-btn-ghost text-sm w-auto"
            disabled={saving || logoUploading}
            onClick={() => save()}
            title="Save progress"
          >
            {saving ? "Saving…" : "Save"}
          </button>

          {step < 3 ? (
            <button
              type="button"
              className="hi5-btn-primary text-sm w-auto"
              disabled={saving || logoUploading}
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
              className="hi5-btn-primary text-sm w-auto"
              disabled={saving || logoUploading}
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
