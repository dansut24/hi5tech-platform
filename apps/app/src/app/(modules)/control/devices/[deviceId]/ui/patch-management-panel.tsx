"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  deviceId: string;
};

type PolicyDecision = "allow" | "manual" | "block" | "unlisted";

const filters = [
  { key: "all", label: "All" },
  { key: "security", label: "Security risk" },
  { key: "routine", label: "Routine updates" },
  { key: "approved", label: "Approved" },
  { key: "blocked", label: "Blocked" },
  { key: "none", label: "No action" }
];

const priorityRank: Record<string, number> = {
  urgent: 1,
  critical: 2,
  high: 3,
  "unsupported-risk": 4,
  routine: 5,
  none: 6
};

export default function PatchManagementPanel({ deviceId }: Props) {
  const [plan, setPlan] = useState<any>(null);
  const [tasks, setTasks] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingDecision, setUpdatingDecision] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  async function load() {
    setLoading(true);

    try {
      const [planRes, tasksRes] = await Promise.all([
        fetch(`/api/admin/devices/${deviceId}/patch-plan`, { cache: "no-store" }),
        fetch(`/api/admin/devices/${deviceId}/patch-tasks`, { cache: "no-store" })
      ]);

      setPlan(await planRes.json());
      setTasks(await tasksRes.json());
    } finally {
      setLoading(false);
    }
  }

  async function createTasks() {
    setCreating(true);

    try {
      await fetch(`/api/admin/devices/${deviceId}/patch-tasks/create`, {
        method: "POST"
      });

      await load();
    } finally {
      setCreating(false);
    }
  }

  async function updatePolicyDecision(wingetId: string, decision: PolicyDecision) {
    if (!plan?.policyId || !wingetId) return;

    setUpdatingDecision(`${wingetId}-${decision}`);

    try {
      await fetch("/api/admin/patch-policies/apps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          policyId: plan.policyId,
          wingetId,
          decision
        })
      });

      await load();
    } finally {
      setUpdatingDecision("");
    }
  }

  useEffect(() => {
    load();
  }, [deviceId]);

  const sortedItems = useMemo(() => {
    const items = Array.isArray(plan?.items) ? [...plan.items] : [];

    return items.sort((a: any, b: any) => {
      const ar = priorityRank[String(a.riskPriority || "none")] || 99;
      const br = priorityRank[String(b.riskPriority || "none")] || 99;

      if (ar !== br) return ar - br;

      if (Number(b.cvssScore || 0) !== Number(a.cvssScore || 0)) {
        return Number(b.cvssScore || 0) - Number(a.cvssScore || 0);
      }

      if (Number(b.updateAvailable || 0) !== Number(a.updateAvailable || 0)) {
        return Number(b.updateAvailable || 0) - Number(a.updateAvailable || 0);
      }

      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [plan]);

  const filteredItems = useMemo(() => {
    return sortedItems.filter((item: any) => {
      const riskPriority = String(item.riskPriority || "none");
      const policyDecision = String(item.policyDecision || "").toLowerCase();

      if (activeFilter === "security") {
        return ["urgent", "critical", "high", "unsupported-risk"].includes(riskPriority);
      }

      if (activeFilter === "routine") {
        return riskPriority === "routine";
      }

      if (activeFilter === "approved") {
        return policyDecision.includes("approved") || item.approved;
      }

      if (activeFilter === "blocked") {
        return policyDecision.includes("block");
      }

      if (activeFilter === "none") {
        return riskPriority === "none" && !item.updateAvailable;
      }

      return true;
    });
  }, [sortedItems, activeFilter]);

  if (loading) {
    return (
      <section className="hi5-card hi5-border rounded-3xl border p-6">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Loading patch management...
        </p>
      </section>
    );
  }

  return (
    <section className="hi5-card hi5-border rounded-3xl border p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Patch Management</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Policy: {plan?.policyName || "No policy assigned"}
          </p>
        </div>

        <button
          onClick={createTasks}
          disabled={creating || !plan?.approvedCount}
          className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {creating ? "Creating tasks..." : "Create patch tasks"}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Updates" value={plan?.updateCount || 0} />
        <StatCard label="Approved" value={plan?.approvedCount || 0} />
        <StatCard label="Needs approval" value={plan?.requiresApprovalCount || 0} />
        <StatCard label="Critical" value={plan?.criticalCount || 0} />
        <StatCard
          label="Security risk"
          value={(plan?.items || []).filter((item: any) =>
            ["urgent", "critical", "high", "unsupported-risk"].includes(item.riskPriority)
          ).length}
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              activeFilter === filter.key
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/10 bg-black/[0.03] text-neutral-600 hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
        Showing {filteredItems.length} of {sortedItems.length} software items. Sorted by security priority.
      </div>

      <div className="space-y-3">
        {filteredItems.map((item: any) => (
          <div
            key={`${item.name}-${item.matchedWingetId}-${item.installedVersion}`}
            className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{item.name}</h3>
                  <DecisionBadge value={item.policyDecision || "unknown"} />
                  <RiskBadge priority={item.riskPriority} label={item.riskLabel} />
                  {item.knownExploited && <KevBadge />}
                </div>

                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {item.vendor || "Unknown vendor"}
                </p>

                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                  {item.installedVersion || "unknown"} → {item.latestVersion || "No update available"}
                </p>

                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {item.matchedWingetId || "No package match"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <InfoPill label="CVEs" value={item.cveCount || 0} />
                  <InfoPill label="CVSS" value={item.cvssScore || 0} />
                  <InfoPill label="Risk" value={item.riskSeverity || "None"} />
                  <InfoPill label="Priority" value={item.riskPriority || "none"} />
                </div>

                <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                  {item.riskReason || item.reason}
                </p>

                {(item.affectedCves || []).length > 0 && (
                  <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                      Affected CVEs
                    </p>

                    <div className="space-y-2">
                      {item.affectedCves.slice(0, 5).map((cve: any) => (
                        <div
                          key={cve.cveId}
                          className="flex flex-wrap items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300"
                        >
                          <span className="font-semibold">{cve.cveId}</span>
                          <span>{cve.severity || "Unknown"}</span>
                          <span>CVSS {cve.cvssScore || 0}</span>
                          {cve.knownExploited && (
                            <span className="rounded-full bg-rose-600 px-2 py-0.5 font-semibold text-white">
                              KEV
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {item.matchedWingetId && item.updateAvailable && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <PolicyButton
                      label="Allow"
                      colour="emerald"
                      disabled={Boolean(updatingDecision)}
                      loading={updatingDecision === `${item.matchedWingetId}-allow`}
                      onClick={() => updatePolicyDecision(item.matchedWingetId, "allow")}
                    />

                    <PolicyButton
                      label="Manual"
                      colour="amber"
                      disabled={Boolean(updatingDecision)}
                      loading={updatingDecision === `${item.matchedWingetId}-manual`}
                      onClick={() => updatePolicyDecision(item.matchedWingetId, "manual")}
                    />

                    <PolicyButton
                      label="Block"
                      colour="rose"
                      disabled={Boolean(updatingDecision)}
                      loading={updatingDecision === `${item.matchedWingetId}-block`}
                      onClick={() => updatePolicyDecision(item.matchedWingetId, "block")}
                    />

                    <PolicyButton
                      label="Unlisted"
                      colour="neutral"
                      disabled={Boolean(updatingDecision)}
                      loading={updatingDecision === `${item.matchedWingetId}-unlisted`}
                      onClick={() => updatePolicyDecision(item.matchedWingetId, "unlisted")}
                    />
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs dark:border-white/10 dark:bg-black/20">
                <p className="font-semibold">
                  Source: {item.source?.sourceName || "Unknown"}
                </p>

                <p className="mt-1 text-neutral-500 dark:text-neutral-400">
                  {item.source?.sourceType || "unknown"}
                </p>

                {item.source?.execution?.executionType && (
                  <p className="mt-1 text-neutral-500 dark:text-neutral-400">
                    Execution: {item.source.execution.executionType}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Patch Tasks
        </h3>

        {(tasks?.tasks || []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 p-5 text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
            No patch tasks found.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.tasks.map((task: any) => (
              <div
                key={task.id}
                className="flex flex-col gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="font-semibold">{task.software_name}</p>

                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {task.installed_version} → {task.target_version}
                  </p>
                </div>

                <DecisionBadge value={task.status || "unknown"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-neutral-600 dark:border-white/10 dark:bg-black/20 dark:text-neutral-300">
      {label}: <strong>{value}</strong>
    </span>
  );
}

function KevBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
      Known exploited
    </span>
  );
}

function RiskBadge({
  priority,
  label
}: {
  priority?: string;
  label?: string;
}) {
  const normalised = String(priority || "none").toLowerCase();

  let classes =
    "border-neutral-500/20 bg-neutral-500/10 text-neutral-700 dark:text-neutral-300";

  if (normalised === "routine") {
    classes =
      "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }

  if (normalised === "high") {
    classes =
      "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300";
  }

  if (normalised === "critical" || normalised === "urgent") {
    classes =
      "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }

  if (normalised === "unsupported-risk") {
    classes =
      "border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-300";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      {label || "No action required"}
    </span>
  );
}

function PolicyButton({
  label,
  colour,
  disabled,
  loading,
  onClick
}: {
  label: string;
  colour: "emerald" | "amber" | "rose" | "neutral";
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const classes = {
    emerald: "bg-emerald-600 text-white",
    amber: "bg-amber-500 text-white",
    rose: "bg-rose-600 text-white",
    neutral: "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-white"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${classes[colour]}`}
    >
      {loading ? "Saving..." : label}
    </button>
  );
}

function DecisionBadge({ value }: { value: string }) {
  const normalised = (value || "unknown").toLowerCase();

  let classes =
    "border-black/10 bg-black/5 text-black dark:border-white/10 dark:bg-white/10 dark:text-white";

  if (normalised.includes("approved") || normalised.includes("completed")) {
    classes =
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (normalised.includes("blocked") || normalised.includes("failed")) {
    classes =
      "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }

  if (
    normalised.includes("approval") ||
    normalised.includes("pending") ||
    normalised.includes("queued")
  ) {
    classes =
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      {value}
    </span>
  );
}
