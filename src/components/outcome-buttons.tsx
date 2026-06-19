"use client";

import { useState } from "react";
import type { Outcome } from "@/lib/mock-data";

const ACTIONS: { outcome: Outcome; label: string; activeClass: string }[] = [
  {
    outcome: "addressed",
    label: "Addressed",
    activeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    outcome: "dismissed",
    label: "Dismissed",
    activeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  {
    outcome: "reacted_positive",
    label: "👍",
    activeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    outcome: "reacted_negative",
    label: "👎",
    activeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
];

export function OutcomeButtons({
  findingId,
  currentOutcome,
}: {
  findingId: string;
  currentOutcome: Outcome;
}) {
  const [outcome, setOutcome] = useState<Outcome>(currentOutcome);
  const [loading, setLoading] = useState(false);

  async function handleClick(newOutcome: Outcome) {
    if (newOutcome === outcome || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome: newOutcome }),
      });
      if (res.ok) setOutcome(newOutcome);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {ACTIONS.map((a) => (
        <button
          key={a.outcome}
          onClick={() => handleClick(a.outcome)}
          disabled={loading}
          className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
            outcome === a.outcome
              ? a.activeClass
              : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
