"use client";
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

                <div className="flex items-center gap-2">
                  <DecisionBadge value={task.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-2xl font-bold">{value}</p>

      <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
    </div>
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
