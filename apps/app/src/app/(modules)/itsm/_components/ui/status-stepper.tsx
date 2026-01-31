"use client";

export default function StatusStepper({
  stages,
  activeIndex,
}: {
  stages: { label: string; meta?: string }[];
  activeIndex: number; // 0..n-1
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border hi5-border bg-[rgba(var(--hi5-card),0.25)] backdrop-blur-xl">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map((s, i) => {
          const active = i === activeIndex;
          const done = i < activeIndex;

          return (
            <div
              key={s.label}
              className={[
                "relative px-4 py-3",
                done ? "bg-[rgba(var(--hi5-accent),0.18)]" : active ? "bg-[rgba(var(--hi5-accent),0.28)]" : "bg-transparent",
              ].join(" ")}
            >
              <div className="text-xs opacity-70">{s.label}</div>
              {s.meta ? <div className="text-[11px] opacity-70 mt-0.5">{s.meta}</div> : null}

              {/* Chevron separator */}
              {i < stages.length - 1 ? (
                <div className="absolute right-0 top-0 h-full w-6">
                  <div
                    className="h-full w-full"
                    style={{
                      clipPath: "polygon(0 0, 100% 50%, 0 100%, 0 0)",
                      background: "rgba(255,255,255,0.65)",
                      opacity: 0.55,
                    }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}