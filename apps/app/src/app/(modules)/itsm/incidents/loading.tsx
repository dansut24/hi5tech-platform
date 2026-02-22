// Skeleton loading state for incidents list

function CardSkeleton() {
  return (
    <div className="hi5-card p-0 overflow-hidden animate-pulse">
      <div className="h-1 w-full rounded-t-[20px] bg-slate-200 dark:bg-slate-700" />
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-lg w-16" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-4/5" />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="h-5 w-14 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-lg w-32" />
        <div className="pt-3 border-t hi5-divider">
          <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function IncidentsLoading() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-36 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
        <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded-xl self-start" />
      </div>

      {/* Toolbar skeleton */}
      <div className="hi5-panel p-3 flex gap-2 animate-pulse">
        {["Triage", "My tickets", "Team", "All"].map((l) => (
          <div key={l} className="h-9 w-24 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        ))}
      </div>

      {/* Card skeletons */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
