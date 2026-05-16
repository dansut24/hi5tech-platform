"use client";

import { useMemo, useState } from "react";

type ProductChoice = "itsm" | "control" | "both";

type Props = {
  email: string;
  defaultCompanyName?: string;
  defaultSubdomain?: string;
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
    description: "Start with service desk workflows, incidents, requests and assets.",
    features: ["Incidents", "Service requests", "Assets", "Self-service", "Admin"],
  },
  {
    key: "control",
    title: "RMM Control only",
    description: "Start with devices, inventory, remote tools and managed installers.",
    features: ["Device groups", "Inventory", "Remote control", "Terminal", "Files"],
  },
  {
    key: "both",
    title: "ITSM + RMM Control",
    description: "Use the full Hi5Tech platform with tickets linked to devices.",
    features: ["ITSM", "Control", "Device context", "Assets", "Admin"],
  },
];

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40);
}

export default function OnboardingClient({
  email,
  defaultCompanyName = "",
  defaultSubdomain = "",
}: Props) {
  const [companyName, setCompanyName] = useState(defaultCompanyName);
  const [subdomain, setSubdomain] = useState(defaultSubdomain);
  const [product, setProduct] = useState<ProductChoice>("both");
  const [timezone, setTimezone] = useState("Europe/London");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewSubdomain = useMemo(() => {
    return slugify(subdomain || companyName);
  }, [subdomain, companyName]);

  async function createWorkspace() {
    setWorking(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/create-tenant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          subdomain: previewSubdomain,
          product,
          timezone,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to create workspace (${res.status})`);
      }

      window.location.href = json.redirectTo || "/apps";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
      setWorking(false);
    }
  }

  const canSubmit =
    companyName.trim().length >= 2 &&
    previewSubdomain.length >= 3 &&
    !working;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="hi5-panel p-5 sm:p-7">
        <div className="text-xs uppercase tracking-[0.22em] opacity-65">
          Hi5Tech onboarding
        </div>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Let’s create your workspace.
        </h1>

        <p className="mt-3 text-sm leading-6 opacity-75">
          Set up your company, choose what you want to start with, and Hi5Tech will create the right tenant, modules and defaults.
        </p>

        <div className="mt-5 rounded-2xl border hi5-border bg-black/5 p-4 text-sm dark:bg-white/5">
          <div className="font-semibold">Signed in as</div>
          <div className="mt-1 break-words opacity-75">{email}</div>
        </div>

        <div className="mt-5 grid gap-3 text-sm">
          <div className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5">
            <div className="font-semibold">Test</div>
            <div className="mt-1 opacity-70">
              All features available. Resettable later.
            </div>
          </div>

          <div className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5">
            <div className="font-semibold">Staging</div>
            <div className="mt-1 opacity-70">
              Select and review changes before production.
            </div>
          </div>

          <div className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5">
            <div className="font-semibold">Production</div>
            <div className="mt-1 opacity-70">
              Your live customer environment.
            </div>
          </div>
        </div>
      </div>

      <div className="hi5-panel p-5 sm:p-7">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold">
              Company name
              <input
                className="hi5-input mt-2"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (!subdomain.trim()) {
                    setSubdomain(slugify(e.target.value));
                  }
                }}
                placeholder="Example Ltd"
                disabled={working}
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold">
              Workspace URL
              <div className="mt-2 flex overflow-hidden rounded-2xl border hi5-border bg-black/5 dark:bg-white/5">
                <input
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none"
                  value={subdomain}
                  onChange={(e) => setSubdomain(slugify(e.target.value))}
                  placeholder="example"
                  disabled={working}
                />
                <div className="shrink-0 border-l hi5-border px-3 py-3 text-sm opacity-70">
                  .hi5tech.co.uk
                </div>
              </div>
            </label>

            <div className="mt-2 text-xs opacity-70">
              Preview:{" "}
              <span className="font-semibold">
                {previewSubdomain || "workspace"}.hi5tech.co.uk
              </span>
            </div>
          </div>

          <div>
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
          </div>

          <div>
            <div className="text-sm font-semibold">What do you want to start with?</div>

            <div className="mt-3 grid gap-3">
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
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            className="hi5-btn-primary w-full"
            disabled={!canSubmit}
            onClick={createWorkspace}
          >
            {working ? "Creating workspace…" : "Create workspace"}
          </button>

          <p className="text-xs leading-5 opacity-65">
            You will be the workspace owner. You can invite technicians and configure branding after setup.
          </p>
        </div>
      </div>
    </div>
  );
}
