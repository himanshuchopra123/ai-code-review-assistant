import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRepo,
  computeMetrics,
  formatLatency,
  type Severity,
} from "@/lib/mock-data";

import { fetchRepoByName } from "@/lib/db";
import { FilterablePRList } from "@/components/filterable-pr-list";

export default async function RepoMetricsPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo: repoName } = await params;
  const dbRepo = await fetchRepoByName(owner, repoName).catch(() => null);
  const repo = dbRepo ?? getRepo(owner, repoName);
  if (!repo) notFound();

  const metrics = computeMetrics(repo);

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/dashboard"
          className="hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Dashboard
        </Link>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {repo.fullName}
        </span>
      </nav>

      {/* Metrics summary */}
      <section className="mb-8">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold">{repo.fullName}</h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Metrics — last 30 days &middot; {metrics.totalReviews} reviews
            </p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard
            label="Acknowledgement rate"
            value={`${metrics.acknowledgementRate}%`}
            sub="developers acknowledged"
            trend={metrics.acknowledgementRate >= 70 ? "good" : "bad"}
            target="target ≥ 75%"
          />
          <MetricCard
            label="Dismissal rate"
            value={`${metrics.dismissalRate}%`}
            sub="developers dismissed"
            trend={metrics.dismissalRate <= 25 ? "good" : "bad"}
            target="target < 25%"
          />
          <MetricCard
            label="Avg latency"
            value={formatLatency(metrics.avgLatencySeconds)}
            sub="review time"
            trend={metrics.avgLatencySeconds <= 120 ? "good" : "bad"}
            target="target < 2 min"
          />
          <MetricCard
            label="Total findings"
            value={String(metrics.totalFindings)}
            sub={buildSeveritySub(metrics.findingsBySeverity)}
          />
          <MetricCard
            label="Feedback rate"
            value={`${metrics.feedbackRate}%`}
            sub="developer engagement"
            trend={metrics.feedbackRate >= 50 ? "good" : "bad"}
            target="target ≥ 50%"
          />
          <MetricCard
            label="Findings / PR"
            value={String(metrics.findingsPerPR)}
            sub="avg per pull request"
          />
        </div>
      </section>

      {/* PR list with findings — filterable by severity */}
      <FilterablePRList prs={repo.prs} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  trend,
  target,
}: {
  label: string;
  value: string;
  sub: string;
  trend?: "good" | "bad";
  target?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend === "good"
                ? "text-green-600 dark:text-green-400"
                : "text-red-500 dark:text-red-400"
            }`}
          >
            {trend === "good" ? "▲" : "▼"}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>
      {target && (
        <p className="mt-1 text-xs text-zinc-300 dark:text-zinc-600">
          {target}
        </p>
      )}
    </div>
  );
}

function buildSeveritySub(bySeverity: Record<Severity, number>): string {
  const parts: string[] = [];
  if (bySeverity.critical > 0) parts.push(`${bySeverity.critical} critical`);
  if (bySeverity.major > 0) parts.push(`${bySeverity.major} major`);
  if (bySeverity.minor > 0) parts.push(`${bySeverity.minor} minor`);
  if (bySeverity.nit > 0) parts.push(`${bySeverity.nit} nit`);
  return parts.length > 0 ? parts.join(" · ") : "none found";
}
