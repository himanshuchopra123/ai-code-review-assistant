import type { Outcome } from "@/lib/mock-data";

const CONFIG: Record<Outcome, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "text-zinc-400 dark:text-zinc-500",
  },
  addressed: {
    label: "Addressed ✓",
    className: "text-green-600 dark:text-green-400",
  },
  dismissed: {
    label: "Dismissed",
    className: "text-red-500 dark:text-red-400",
  },
  reacted_positive: {
    label: "👍 Helpful",
    className: "text-green-600 dark:text-green-400",
  },
  reacted_negative: {
    label: "👎 Not helpful",
    className: "text-red-500 dark:text-red-400",
  },
  no_action: {
    label: "No action",
    className: "text-zinc-400 dark:text-zinc-500",
  },
};

export function OutcomeLabel({ outcome }: { outcome: Outcome }) {
  const { label, className } = CONFIG[outcome];
  return (
    <span className={`shrink-0 text-xs font-medium ${className}`}>{label}</span>
  );
}
