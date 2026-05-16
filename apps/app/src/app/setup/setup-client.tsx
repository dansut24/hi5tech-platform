"use client";

import { useState } from "react";

type ProductChoice = "itsm" | "control" | "both";

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

export default function SetupClient({ intent }: Props) {
  const [product, setProduct] = useState<ProductChoice>("both");
  const [timezone, setTimezone] = useState("Europe/London");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          product,
          timezone,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to complete setup (${res.status})`);
      }

      window.location.href = json.redirectTo || "/apps";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete setup");
      setWorking(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="hi5-panel p-5 sm:p-7">
        <div className="text-xs uppercase tracking-[0.22em] opacity-65">
          Workspace setup
        </div>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Finish setting up Hi5Tech.
        </h1>

        <p className="mt-3 text-sm leading-6 opacity-75">
          Your account is confirmed. Now choose what your workspace should start with.
        </p>

        <div className="mt-5 rounded-2xl border hi5-border bg-black/5 p-4 text-sm dark:bg-white/5">
          <div className="font-semibold">Workspace</div>
          <div className="mt-1 break-words opacity-75">
            {intent.subdomain}.{intent.rootDomain}
          </div>
        </div>

        <div className="mt-3 rounded-2xl border hi5-border bg-black/5 p-4 text-sm dark:bg-white/5">
          <div className="font-semibold">Company</div>
          <div className="mt-1 break-words opacity-75">{intent.companyName}</div>
        </div>

        <div className="mt-3 rounded-2xl border hi5-border bg-black/5 p-4 text-sm dark:bg-white/5">
          <div className="font-semibold">Owner</div>
          <div className="mt-1 break-words opacity-75">{intent.adminEmail}</div>
        </div>
      </div>

      <div className="hi5-panel p-5 sm:p-7">
        <div className="space-y-5">
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
            disabled={working}
            onClick={completeSetup}
          >
            {working ? "Creating workspace…" : "Create workspace"}
          </button>

          <p className="text-xs leading-5 opacity-65">
            You can invite technicians, configure branding and add devices after setup.
          </p>
        </div>
      </div>
    </div>
  );
}
