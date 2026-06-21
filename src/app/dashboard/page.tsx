import Link from "next/link";
import { REPOS, computeMetrics, formatLatency } from "@/lib/mock-data";
import { fetchAllRepos } from "@/lib/db";
import { SeverityCount } from "@/components/severity-badge";

export default async function DashboardPage() {
  const dbRepos = await fetchAllRepos().catch(() => []);
  const repos = dbRepos.length > 0 ? dbRepos : REPOS;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Repositories</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          AI review activity across your enabled repositories.
        </p>
      </div>

      <div className="space-y-4">
        {repos.map((repo) => {
          const metrics = computeMetrics(repo);
          const recentPRs = repo.prs.slice(0, 4);

          return (
            <div
              key={repo.fullName}
              className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            >
              {/* Repo header */}
              <div className="flex items-start justify-between px-6 pt-5 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{repo.fullName}</h2>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Active
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {metrics.totalReviews} reviews &middot;{" "}
                    {metrics.totalFindings} findings &middot; avg{" "}
                    {formatLatency(metrics.avgLatencySeconds)} latency &middot;{" "}
                    {metrics.acknowledgementRate}% acknowledged
                  </p>
                </div>
                <Link
                  href={`/dashboard/${repo.owner}/${repo.name}`}
                  className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  View metrics →
                </Link>
              </div>

              {/* PR list */}
              <div className="border-t border-zinc-100 dark:border-zinc-800">
                {recentPRs.map((pr, idx) => {
                  const findings = pr.review?.findings ?? [];
                  const bySeverity = {
                    critical: findings.filter((f) => f.severity === "critical").length,
                    major: findings.filter((f) => f.severity === "major").length,
                    minor: findings.filter(
                      (f) => f.severity === "minor" || f.severity === "nit"
                    ).length,
                  };

                  return (
                    <Link
                      key={pr.number}
                      href={`/dashboard/${repo.owner}/${repo.name}#pr-${pr.number}`}
                      className={`flex items-center justify-between px-6 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                        idx < recentPRs.length - 1
                          ? "border-b border-zinc-100 dark:border-zinc-800"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`shrink-0 font-mono text-xs font-semibold ${
                            pr.state === "open"
                              ? "text-green-600 dark:text-green-400"
                              : pr.state === "merged"
                                ? "text-purple-600 dark:text-purple-400"
                                : "text-zinc-400"
                          }`}
                        >
                          #{pr.number}
                        </span>
                        <span className="truncate text-zinc-700 dark:text-zinc-300">
                          {pr.title}
                        </span>
                        <span className="shrink-0 text-xs text-zinc-400">
                          @{pr.authorLogin}
                        </span>
                      </div>

                      <div className="ml-4 flex shrink-0 items-center gap-2">
                        {findings.length === 0 ? (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            ✓ Clean
                          </span>
                        ) : (
                          <>
                            {bySeverity.critical > 0 && (
                              <SeverityCount severity="critical" count={bySeverity.critical} />
                            )}
                            {bySeverity.major > 0 && (
                              <SeverityCount severity="major" count={bySeverity.major} />
                            )}
                            {bySeverity.minor > 0 && (
                              <SeverityCount severity="minor" count={bySeverity.minor} />
                            )}
                          </>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
