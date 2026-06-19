"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/card";
import { StepIndicator } from "@/components/step-indicator";

// Mock repos returned after the GitHub App install step.
const MOCK_REPOS = [
  { id: "acme/web-app", enabled: true },
  { id: "acme/mobile-app", enabled: false },
  { id: "acme/api-service", enabled: true },
  { id: "acme/internal-tools", enabled: false },
];

export default function ReposPage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(MOCK_REPOS.map((repo) => [repo.id, repo.enabled]))
  );

  function toggle(id: string) {
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleContinue() {
    const selected = Object.entries(enabled)
      .filter(([, isEnabled]) => isEnabled)
      .map(([id]) => id);
    router.push(`/setup-complete?repos=${encodeURIComponent(selected.join(","))}`);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <Card>
        <h1 className="text-lg font-semibold">Select repositories</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          We&apos;ll automatically review new pull requests on enabled repos.
          You can change this anytime.
        </p>
        <ul className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
          {MOCK_REPOS.map((repo) => (
            <li
              key={repo.id}
              className="flex items-center justify-between py-3"
            >
              <span className="text-sm font-medium">{repo.id}</span>
              <button
                type="button"
                onClick={() => toggle(repo.id)}
                aria-pressed={enabled[repo.id]}
                aria-label={`Toggle reviews for ${repo.id}`}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  enabled[repo.id]
                    ? "bg-indigo-600"
                    : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    enabled[repo.id] ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={handleContinue}
          className="mt-6 w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Continue →
        </button>
      </Card>
      <StepIndicator current={2} />
    </div>
  );
}
