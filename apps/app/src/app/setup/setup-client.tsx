"use client";

import { useMemo, useState } from "react";

type ProductChoice = "itsm" | "control" | "both";
type AppearanceChoice = "light" | "dark" | "system";
type InviteRole = "admin" | "technician" | "viewer";

type Props = {
  intent: {
    id: string;
    companyName: string;
    subdomain: string;
    rootDomain: string;
    adminEmail: string;
    adminName: string;
  };
};

const products: Array<{
  key: ProductChoice;
  title: string;
  description: string;
  features: string[];
}> = [
  {
    key: "itsm",
    title: "ITSM only",
    description: "Start with a clean service desk for incidents, requests and assets.",
    features: ["Incidents", "Service requests", "Assets", "Self-service", "Admin"],
  },
  {
    key: "control",
    title: "RMM Control only",
    description: "Start with device groups, inventory, remote support and technician tools.",
    features: ["Device groups", "Inventory", "Remote control", "Terminal", "Files"],
  },
  {
    key: "both",
    title: "ITSM + RMM Control",
    description: "Use the full platform with tickets, assets, devices and remote support.",
    features: ["ITSM", "Control", "Device context", "Assets", "Admin"],
  },
];

const accentOptions = [
  { key: "violet", label: "Violet", className: "from-violet-600 to-sky-400" },
  { key: "blue", label: "Blue", className: "from-blue-600 to-cyan-400" },
  { key: "emerald", label: "Emerald", className: "from-emerald-600 to-teal-400" },
  { key: "rose", label: "Rose", className: "from-rose-600 to-pink-400" },
  { key: "orange", label: "Orange", className: "from-orange-500 to-amber-400" },
];

const appearanceOptions: Array<{
  key: AppearanceChoice;
  label: string;
  description: string;
}> = [
  {
    key: "system",
    label: "System",
    description: "Follow the user’s device preference.",
  },
  {
    key: "light",
    label: "Light",
    description: "Default to a bright workspace.",
  },
  {
    key: "dark",
    label: "Dark",
    description: "Default to a dark workspace.",
  },
];

function cleanEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  const email = cleanEmail(value);
  return email.includes("@") && email.includes(".");
}

function StepPill({
  active,
  complete,
  label,
  number,
}: {
  active: boolean;
  complete: boolean;
  label: string;
  number: number;
}) {
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold",
        active
          ? "border-[rgba(var(--hi5-accent),0.45)] bg-[rgba(var(--hi5-accent),0.12)]"
          : complete
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
            : "hi5-border bg-black/5 dark:bg-white/5 opacity-75",
      ].join(" ")}
    >
      <span
        className={[
          "grid h-5 w-5 place-items-center rounded-full text-[11px]",
          active
            ? "bg-[rgb(var(--hi5-accent))] text-white"
            : complete
              ? "bg-emerald-500 text-white"
              : "bg-black/10 dark:bg-white/10",
        ].join(" ")}
      >
        {complete ? "✓" : number}
      </span>
      <span>{label}</span>
    </div>
  );
}

function SetupPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hi5-panel p-5 sm:p-7">
      <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 opacity-75">{description}</p> : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border hi5-border bg-black/5 p-3 text-sm dark:bg-white/5">
      <div className="text-xs opacity-65">{label}</div>
      <div className="mt-1 font-semibold break-words">{value}</div>
    </div>
  );
}

export default function SetupClient({ intent }: Props) {
  const [step, setStep] = useState(1);

  const [companyName, setCompanyName] = useState(intent.companyName);
  const [supportEmail, setSupportEmail] = useState(intent.adminEmail);
  const [timezone, setTimezone] = useState("Europe/London");
  const [region, setRegion] = useState("United Kingdom");

  const [product, setProduct] = useState<ProductChoice>("both");
  const [accentColor, setAccentColor] = useState("violet");
  const [appearance, setAppearance] = useState<AppearanceChoice>("system");

  const [useItsmDefaults, setUseItsmDefaults] = useState(true);
  const [useControlDefaults, setUseControlDefaults] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("technician");
  const [invites, setInvites] = useState<Array<{ email: string; role: InviteRole }>>([]);

  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successRedirect, setSuccessRedirect] = useState<string | null>(null);

  const totalSteps = 6;
  const includesItsm = product === "itsm" || product === "both";
  const includesControl = product === "control" || product === "both";

  const selectedProduct = useMemo(
    () => products.find((item) => item.key === product) ?? products[2],
    [product]
  );

  function nextStep() {
    setError(null);

    if (step === 1) {
      if (companyName.trim().length < 2) {
        setError("Company display name is required.");
        return;
      }

      if (!isValidEmail(supportEmail)) {
        setError("Please enter a valid support email.");
        return;
      }
    }

    setStep((current) => Math.min(totalSteps, current + 1));
  }

  function previousStep() {
    setError(null);
    setStep((current) => Math.max(1, current - 1));
  }

  function addInvite() {
    const email = cleanEmail(inviteEmail);

    if (!isValidEmail(email)) {
      setError("Please enter a valid invite email.");
      return;
    }

    if (email === cleanEmail(intent.adminEmail)) {
      setError("The workspace owner is already included.");
      return;
    }

    if (invites.some((item) => item.email === email)) {
      setError("That invite is already in the list.");
      return;
    }

    setInvites((current) => [...current, { email, role: inviteRole }]);
    setInviteEmail("");
    setInviteRole("technician");
    setError(null);
  }

  async function completeSetup() {
    setWorking(true);
    setError(null);

    try {
      const res = await fetch("/api/setup/complete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          supportEmail,
          timezone,
          region,
          product,
          accentColor,
          appearance,
          useItsmDefaults,
          useControlDefaults,
          invites,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to complete setup (${res.status})`);
      }

      setSuccessRedirect(json.redirectTo || "/apps");
      setStep(totalSteps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete setup");
    } finally {
      setWorking(false);
    }
  }

  if (successRedirect) {
    return (
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="hi5-panel p-5 sm:p-7">
          <div className="text-xs uppercase tracking-[0.22em] opacity-65">Workspace ready</div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Your Hi5Tech workspace is ready.
          </h1>
          <p className="mt-3 text-sm leading-6 opacity-75">
            We have created your tenant, owner account, environments, defaults and selected product features.
          </p>

          <div className="mt-5 grid gap-3">
            <SummaryRow label="Workspace" value={`${intent.subdomain}.${intent.rootDomain}`} />
            <SummaryRow label="Product" value={selectedProduct.title} />
            <SummaryRow label="Owner" value={intent.adminEmail} />
          </div>
        </div>

        <div className="hi5-panel p-5 sm:p-7">
          <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-5">
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-200">
              Setup complete
            </div>
            <p className="mt-2 text-sm leading-6 opacity-75">
              You can now open your workspace and continue with your first tasks.
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {includesItsm ? (
              <div className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5">
                <div className="font-bold">ITSM</div>
                <div className="mt-1 text-sm opacity-70">Create your first ticket or import assets.</div>
              </div>
            ) : null}

            {includesControl ? (
              <div className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5">
                <div className="font-bold">Control</div>
                <div className="mt-1 text-sm opacity-70">Add your first device and download the Windows agent.</div>
              </div>
            ) : null}

            <button
              type="button"
              className="hi5-btn-primary w-full"
              onClick={() => {
                window.location.href = successRedirect;
              }}
            >
              Open workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="hi5-panel p-5 sm:p-7">
        <div className="text-xs uppercase tracking-[0.22em] opacity-65">Workspace setup</div>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Finish setting up Hi5Tech.
        </h1>

        <p className="mt-3 text-sm leading-6 opacity-75">
          Your account is confirmed. Now configure the workspace and choose what your team should start with.
        </p>

        <div className="mt-5 grid gap-3">
          <SummaryRow label="Workspace" value={`${intent.subdomain}.${intent.rootDomain}`} />
          <SummaryRow label="Company" value={intent.companyName} />
          <SummaryRow label="Owner" value={intent.adminEmail} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {["Details", "Product", "Theme", "Defaults", "Invites", "Review"].map((label, index) => (
            <StepPill
              key={label}
              number={index + 1}
              label={label}
              active={step === index + 1}
              complete={step > index + 1}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {step === 1 ? (
          <SetupPanel
            title="Company details"
            description="These settings are used across the workspace, tickets, notifications and customer-facing pages."
          >
            <div className="space-y-4">
              <label className="block text-sm font-semibold">
                Company display name
                <input
                  className="hi5-input mt-2"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={working}
                />
              </label>

              <label className="block text-sm font-semibold">
                Support email
                <input
                  className="hi5-input mt-2"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  inputMode="email"
                  disabled={working}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">
                  Timezone
                  <select
                    className="hi5-input mt-2"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    disabled={working}
                  >
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Dublin">Europe/Dublin</option>
                    <option value="UTC">UTC</option>
                  </select>
                </label>

                <label className="block text-sm font-semibold">
                  Region
                  <select
                    className="hi5-input mt-2"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    disabled={working}
                  >
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Ireland">Ireland</option>
                    <option value="Europe">Europe</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>
            </div>
          </SetupPanel>
        ) : null}

        {step === 2 ? (
          <SetupPanel
            title="Choose your starting product"
            description="This decides which modules, defaults and first actions are prepared for your workspace."
          >
            <div className="grid gap-3">
              {products.map((item) => {
                const active = product === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setProduct(item.key)}
                    disabled={working}
                    className={[
                      "rounded-2xl border p-4 text-left transition",
                      active
                        ? "border-[rgba(var(--hi5-accent),0.45)] bg-[rgba(var(--hi5-accent),0.10)]"
                        : "hi5-border bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold">{item.title}</div>
                        <div className="mt-1 text-sm opacity-75">{item.description}</div>
                      </div>

                      <span
                        className={[
                          "mt-1 h-5 w-5 rounded-full border",
                          active
                            ? "border-[rgba(var(--hi5-accent),0.8)] bg-[rgb(var(--hi5-accent))]"
                            : "hi5-border",
                        ].join(" ")}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.features.map((feature) => (
                        <span
                          key={feature}
                          className="rounded-full border hi5-border bg-white/40 px-2 py-1 text-xs dark:bg-black/25"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </SetupPanel>
        ) : null}

        {step === 3 ? (
          <SetupPanel
            title="Branding and theme"
            description="Start with simple branding now. Logo upload and advanced branding can be added later from Admin."
          >
            <div className="space-y-5">
              <div>
                <div className="text-sm font-semibold">Accent colour</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-5">
                  {accentOptions.map((item) => {
                    const active = accentColor === item.key;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setAccentColor(item.key)}
                        className={[
                          "rounded-2xl border p-3 text-center transition",
                          active
                            ? "border-[rgba(var(--hi5-accent),0.5)] bg-[rgba(var(--hi5-accent),0.10)]"
                            : "hi5-border bg-black/5 dark:bg-white/5",
                        ].join(" ")}
                      >
                        <span className={`mx-auto block h-9 w-9 rounded-2xl bg-gradient-to-br ${item.className}`} />
                        <span className="mt-2 block text-xs font-bold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold">Default appearance</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {appearanceOptions.map((item) => {
                    const active = appearance === item.key;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setAppearance(item.key)}
                        className={[
                          "rounded-2xl border p-4 text-left transition",
                          active
                            ? "border-[rgba(var(--hi5-accent),0.5)] bg-[rgba(var(--hi5-accent),0.10)]"
                            : "hi5-border bg-black/5 dark:bg-white/5",
                        ].join(" ")}
                      >
                        <div className="font-bold">{item.label}</div>
                        <div className="mt-1 text-xs leading-5 opacity-70">{item.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </SetupPanel>
        ) : null}

        {step === 4 ? (
          <SetupPanel
            title="Recommended defaults"
            description="We can create sensible defaults now. You can edit them later from Admin."
          >
            <div className="grid gap-4">
              {includesItsm ? (
                <div className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={useItsmDefaults}
                      onChange={(e) => setUseItsmDefaults(e.target.checked)}
                      className="mt-1 h-4 w-4"
                    />
                    <span>
                      <span className="block font-bold">Create recommended ITSM defaults</span>
                      <span className="mt-1 block text-sm opacity-70">
                        Priorities: Low, Medium, High, Critical. Statuses: Open, In Progress, Resolved, Closed.
                        Categories: Hardware, Software, Access, Network, Other.
                      </span>
                    </span>
                  </label>
                </div>
              ) : null}

              {includesControl ? (
                <div className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={useControlDefaults}
                      onChange={(e) => setUseControlDefaults(e.target.checked)}
                      className="mt-1 h-4 w-4"
                    />
                    <span>
                      <span className="block font-bold">Create recommended Control device groups</span>
                      <span className="mt-1 block text-sm opacity-70">
                        Windows Laptops, Windows Desktops and Windows Servers will be created automatically.
                      </span>
                    </span>
                  </label>
                </div>
              ) : null}

              {!includesItsm && !includesControl ? (
                <div className="rounded-2xl border hi5-border bg-black/5 p-4 text-sm opacity-70 dark:bg-white/5">
                  No defaults are needed for this product selection.
                </div>
              ) : null}
            </div>
          </SetupPanel>
        ) : null}

        {step === 5 ? (
          <SetupPanel
            title="Invite your team"
            description="Invite admins, technicians or viewers now, or skip and do this later from Admin."
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_170px_auto]">
                <input
                  className="hi5-input"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  inputMode="email"
                  disabled={working}
                />

                <select
                  className="hi5-input"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as InviteRole)}
                  disabled={working}
                >
                  <option value="admin">Admin</option>
                  <option value="technician">Technician</option>
                  <option value="viewer">Viewer</option>
                </select>

                <button type="button" className="hi5-btn-ghost" onClick={addInvite} disabled={working}>
                  Add
                </button>
              </div>

              {invites.length ? (
                <div className="grid gap-2">
                  {invites.map((invite) => (
                    <div
                      key={invite.email}
                      className="flex items-center justify-between gap-3 rounded-2xl border hi5-border bg-black/5 p-3 text-sm dark:bg-white/5"
                    >
                      <div>
                        <div className="font-semibold">{invite.email}</div>
                        <div className="text-xs capitalize opacity-65">{invite.role}</div>
                      </div>

                      <button
                        type="button"
                        className="hi5-btn-ghost text-xs"
                        onClick={() => setInvites((current) => current.filter((item) => item.email !== invite.email))}
                        disabled={working}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border hi5-border bg-black/5 p-4 text-sm opacity-70 dark:bg-white/5">
                  No invites added. You can skip this step.
                </div>
              )}
            </div>
          </SetupPanel>
        ) : null}

        {step === 6 ? (
          <SetupPanel
            title="Review setup"
            description="Check the details below, then create your workspace."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryRow label="Company" value={companyName} />
              <SummaryRow label="Support email" value={supportEmail} />
              <SummaryRow label="Timezone" value={timezone} />
              <SummaryRow label="Region" value={region} />
              <SummaryRow label="Product" value={selectedProduct.title} />
              <SummaryRow label="Appearance" value={appearance} />
              <SummaryRow label="Accent colour" value={accentColor} />
              <SummaryRow label="Invites" value={`${invites.length}`} />
            </div>
          </SetupPanel>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            className="hi5-btn-ghost"
            onClick={previousStep}
            disabled={working || step === 1}
          >
            Back
          </button>

          {step < totalSteps ? (
            <button type="button" className="hi5-btn-primary" onClick={nextStep} disabled={working}>
              Continue
            </button>
          ) : (
            <button type="button" className="hi5-btn-primary" onClick={completeSetup} disabled={working}>
              {working ? "Creating workspace…" : "Create workspace"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
