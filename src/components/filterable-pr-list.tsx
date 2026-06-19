"use client";

import { useState } from "react";
import type { PullRequest, Severity } from "@/lib/mock-data";
import { formatLatency } from "@/lib/mock-data";
import { SeverityBadge } from "@/components/severity-badge";
import { OutcomeButtons } from "@/components/outcome-buttons";

const SEVERITIES: Severity[] = ["critical", "major", "minor", "nit"];

export function FilterablePRList({ prs }: { prs: PullRequest[] }) {
  const [activeFilter, setActiveFilter] = useState<Severity | null>(null);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Pull Requests
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === null
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            All
          </button>
          {SEVERITIES.map((sev) => (
            <button
              key={sev}
              onClick={() => setActiveFilter(activeFilter === sev ? null : sev)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                activeFilter === sev
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {prs.map((pr) => {
          const allFindings = pr.review?.findings ?? [];
          const findings = activeFilter
            ? allFindings.filter((f) => f.severity === activeFilter)
            : allFindings;
          const latency = pr.review
            ? formatLatency(pr.review.latencySeconds)
            : null;

          if (activeFilter && findings.length === 0) return null;

          const bySeverity: Record<Severity, number> = {
            critical: allFindings.filter((f) => f.severity === "critical").length,
            major: allFindings.filter((f) => f.severity === "major").length,
            minor: allFindings.filter((f) => f.severity === "minor").length,
            nit: allFindings.filter((f) => f.severity === "nit").length,
          };

          return (
            <div
              key={pr.number}
              id={`pr-${pr.number}`}
              className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`shrink-0 font-mono text-xs font-bold ${
                      pr.state === "open"
                        ? "text-green-600 dark:text-green-400"
                        : pr.state === "merged"
                          ? "text-purple-600 dark:text-purple-400"
                          : "text-zinc-400"
                    }`}
                  >
                    #{pr.number}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{pr.title}</p>
                    <p className="text-xs text-zinc-400">
                      @{pr.authorLogin} &middot; {pr.openedAt}
                      {latency && (
                        <>
                          {" "}
                          &middot; reviewed in{" "}
                          <span className="tabular-nums">{latency}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="ml-4 flex shrink-0 items-center gap-1.5">
                  {allFindings.length === 0 ? (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      ✓ No issues
                    </span>
                  ) : (
                    SEVERITIES.map((sev) =>
                      bySeverity[sev] > 0 ? (
                        <SeverityBadge key={sev} severity={sev} />
                      ) : null
                    )
                  )}
                </div>
              </div>

              {findings.length > 0 && (
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                  {findings.map((finding, idx) => (
                    <div
                      key={finding.id}
                      className={`flex items-start justify-between gap-4 px-5 py-3 ${
                        idx < findings.length - 1
                          ? "border-b border-zinc-50 dark:border-zinc-800/60"
                          : ""
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5">
                          <SeverityBadge severity={finding.severity} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-zinc-400">
                            {finding.category.replace("_", " ")} &middot;{" "}
                            {finding.filePath}:{finding.lineNumber}
                          </p>
                          <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                            {finding.commentText}
                          </p>
                          {finding.suggestedFix && (
                            <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                              💡 {finding.suggestedFix}
                            </p>
                          )}
                        </div>
                      </div>
                      <OutcomeButtons
                        findingId={finding.id}
                        currentOutcome={finding.outcome}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
