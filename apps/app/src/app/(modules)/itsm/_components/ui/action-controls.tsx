"use client";

import { LucideIcon } from "lucide-react";

export function ActionPill({
  icon: Icon,
  label,
  tone = "neutral",
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  tone?: "neutral" | "primary" | "danger";
  onClick?: () => void;
}) {
  const toneCls =
    tone === "primary"
      ? "bg-[rgba(var(--hi5-accent),0.16)] hi5-accent border-[rgba(var(--hi5-accent),0.35)]"
      : tone === "danger"
        ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25"
        : "bg-[rgba(var(--hi5-card),0.35)] border-[rgba(var(--hi5-border),0.7)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-sm",
        "backdrop-blur-xl hover:bg-black/5 dark:hover:bg-white/5 transition",
        "inline-flex items-center gap-2",
        toneCls,
      ].join(" ")}
    >
      {Icon ? <Icon className="h-4 w-4 opacity-80" /> : null}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

export function IconChip({
  icon: Icon,
  title,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border hi5-border w-9 h-9 grid place-items-center bg-[rgba(var(--hi5-card),0.35)] backdrop-blur-xl hover:bg-black/5 dark:hover:bg-white/5 transition"
      title={title}
      aria-label={title}
    >
      <Icon className="h-4 w-4 opacity-80" />
    </button>
  );
}