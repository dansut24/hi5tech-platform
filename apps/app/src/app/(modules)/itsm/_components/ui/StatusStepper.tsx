"use client";

export default function StatusStepper({
  value,
  steps = ["open", "in_progress", "resolved", "closed"],
}: {
  value?: string | null;
  steps?: string[];
}) {
  const current = String(value ?? "open");
  const idx = Math.max(0, steps.indexOf(current));

  return (
    <div className="hi5-card p-4">
      <div className="text-sm font-semibold">Status</div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => {
          const done = i <= idx;
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={[
                  "h-2.5 w-2.5 rounded-full border",
                  "hi5-border",
                  done ? "bg-[rgba(var(--hi5-accent),0.9)] border-transparent" : "opacity-50",
                ].join(" ")}
              />
              <div className="text-xs opacity-80 whitespace-nowrap">
                {s.replaceAll("_", " ")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
