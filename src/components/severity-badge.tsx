import type { Severity } from "@/lib/mock-data";

const CONFIG: Record<
  Severity,
  { label: string; badge: string; dot: string; text: string }
> = {
  critical: {
    label: "Critical",
    badge:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
  },
  major: {
    label: "Major",
    badge:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    dot: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
  },
  minor: {
    label: "Minor",
    badge:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    dot: "bg-yellow-400",
    text: "text-yellow-600 dark:text-yellow-400",
  },
  nit: {
    label: "Nit",
    badge:
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    dot: "bg-zinc-400",
    text: "text-zinc-500",
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { label, badge, dot } = CONFIG[severity];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export function SeverityCount({
  severity,
  count,
}: {
  severity: Severity;
  count: number;
}) {
  const { dot, text } = CONFIG[severity];
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${text}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {count}
    </span>
  );
}
