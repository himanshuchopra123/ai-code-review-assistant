export type Severity = "critical" | "major" | "minor" | "nit";
export type Category = "bug" | "security" | "style" | "performance" | "risky_change";
export type Outcome =
  | "pending"
  | "addressed"
  | "dismissed"
  | "reacted_positive"
  | "reacted_negative"
  | "no_action";
export type PRState = "open" | "closed" | "merged";

export interface Installation {
  id: number;          // GitHub App installation ID
  repoFullName: string;
  installedAt: string; // ISO datetime
}

export interface Finding {
  id: string;
  filePath: string;
  lineNumber: number;
  category: Category;
  severity: Severity;
  commentText: string;
  suggestedFix?: string;
  outcome: Outcome;
  createdAt: string;        // when the finding was generated
  postedAt?: string;        // when the GitHub comment was posted
  githubCommentId?: number; // GitHub comment ID, for updating/deleting later
}

export interface Review {
  id: string;
  commitSha: string;
  latencySeconds: number;
  status: "completed" | "pending" | "failed";
  createdAt: string; // when the review run started
  findings: Finding[];
}

export interface PullRequest {
  number: number;
  title: string;
  authorLogin: string;
  state: PRState;
  openedAt: string;
  review: Review | null;
}

export interface Repo {
  owner: string;
  name: string;
  fullName: string;
  isEnabled: boolean;
  prs: PullRequest[];
}

const WEB_APP: Repo = {
  owner: "acme",
  name: "web-app",
  fullName: "acme/web-app",
  isEnabled: true,
  prs: [
    {
      number: 142,
      title: "Fix payment rounding",
      authorLogin: "hj-dev",
      state: "merged",
      openedAt: "2026-06-17",
      review: {
        id: "r142",
        commitSha: "a1b2c3d",
        latencySeconds: 112,
        status: "completed",
        createdAt: "2026-06-17T10:02:00Z",
        findings: [
          {
            id: "f1",
            filePath: "src/payments/charge.py",
            lineNumber: 45,
            category: "bug",
            severity: "critical",
            commentText:
              "`total` doesn't account for currency rounding — may cause off-by-cent errors on charges.",
            suggestedFix: "Use `round(total, 2)` before returning.",
            outcome: "addressed",
            createdAt: "2026-06-17T10:03:52Z",
            postedAt: "2026-06-17T10:03:53Z",
            githubCommentId: 1901234501,
          },
          {
            id: "f2",
            filePath: "src/payments/charge.py",
            lineNumber: 62,
            category: "performance",
            severity: "major",
            commentText:
              "N+1 query inside loop — fetches exchange rate on every iteration.",
            suggestedFix: "Cache the exchange rate lookup before the loop.",
            outcome: "addressed",
            createdAt: "2026-06-17T10:03:52Z",
            postedAt: "2026-06-17T10:03:54Z",
            githubCommentId: 1901234502,
          },
          {
            id: "f3",
            filePath: "src/payments/utils.py",
            lineNumber: 11,
            category: "style",
            severity: "nit",
            commentText:
              "Inconsistent variable naming — `totalAmt` vs `total_amount` in the same module.",
            outcome: "dismissed",
            createdAt: "2026-06-17T10:03:52Z",
            postedAt: "2026-06-17T10:03:55Z",
            githubCommentId: 1901234503,
          },
        ],
      },
    },
    {
      number: 141,
      title: "Add dark mode",
      authorLogin: "sara-k",
      state: "open",
      openedAt: "2026-06-16",
      review: {
        id: "r141",
        commitSha: "b2c3d4e",
        latencySeconds: 98,
        status: "completed",
        createdAt: "2026-06-16T14:15:00Z",
        findings: [
          {
            id: "f4",
            filePath: "src/components/Theme.tsx",
            lineNumber: 23,
            category: "style",
            severity: "minor",
            commentText:
              "Hard-coded `#1a1a1a` — consider using a CSS variable for maintainability.",
            outcome: "no_action",
            createdAt: "2026-06-16T14:16:38Z",
            postedAt: "2026-06-16T14:16:39Z",
            githubCommentId: 1901234504,
          },
          {
            id: "f5",
            filePath: "src/components/Theme.tsx",
            lineNumber: 41,
            category: "style",
            severity: "nit",
            commentText: "Unused import `ColorPicker` — can be removed.",
            outcome: "addressed",
            createdAt: "2026-06-16T14:16:38Z",
            postedAt: "2026-06-16T14:16:40Z",
            githubCommentId: 1901234505,
          },
        ],
      },
    },
    {
      number: 140,
      title: "Refactor auth middleware",
      authorLogin: "hj-dev",
      state: "merged",
      openedAt: "2026-06-14",
      review: {
        id: "r140",
        commitSha: "c3d4e5f",
        latencySeconds: 87,
        status: "completed",
        createdAt: "2026-06-14T09:30:00Z",
        findings: [],
      },
    },
    {
      number: 139,
      title: "Update dependencies",
      authorLogin: "sara-k",
      state: "merged",
      openedAt: "2026-06-12",
      review: {
        id: "r139",
        commitSha: "d4e5f6g",
        latencySeconds: 76,
        status: "completed",
        createdAt: "2026-06-12T11:45:00Z",
        findings: [
          {
            id: "f6",
            filePath: "package.json",
            lineNumber: 14,
            category: "security",
            severity: "major",
            commentText:
              "lodash@4.17.20 has a known prototype pollution vulnerability (CVE-2021-23337) — bump to 4.17.21+.",
            outcome: "addressed",
            createdAt: "2026-06-12T11:46:16Z",
            postedAt: "2026-06-12T11:46:17Z",
            githubCommentId: 1901234506,
          },
        ],
      },
    },
  ],
};

const API_SERVICE: Repo = {
  owner: "acme",
  name: "api-service",
  fullName: "acme/api-service",
  isEnabled: true,
  prs: [
    {
      number: 87,
      title: "Add rate limiting middleware",
      authorLogin: "hj-dev",
      state: "open",
      openedAt: "2026-06-17",
      review: {
        id: "r87",
        commitSha: "e5f6g7h",
        latencySeconds: 134,
        status: "completed",
        createdAt: "2026-06-17T16:20:00Z",
        findings: [
          {
            id: "f7",
            filePath: "middleware/rate_limit.go",
            lineNumber: 78,
            category: "bug",
            severity: "critical",
            commentText:
              "Race condition — `requestCount` is incremented without a mutex; unsafe under concurrent requests.",
            suggestedFix: "Use `sync.Mutex` or `atomic.AddInt64` to guard the counter.",
            outcome: "no_action",
            createdAt: "2026-06-17T16:22:14Z",
            postedAt: "2026-06-17T16:22:15Z",
            githubCommentId: 1901234507,
          },
          {
            id: "f8",
            filePath: "middleware/rate_limit.go",
            lineNumber: 92,
            category: "risky_change",
            severity: "major",
            commentText:
              "Default limit set to 10 req/s — likely too low for production; this will trip in any load test.",
            outcome: "no_action",
            createdAt: "2026-06-17T16:22:14Z",
            postedAt: "2026-06-17T16:22:16Z",
            githubCommentId: 1901234508,
          },
        ],
      },
    },
    {
      number: 86,
      title: "Fix memory leak in connection pool",
      authorLogin: "alex-w",
      state: "merged",
      openedAt: "2026-06-15",
      review: {
        id: "r86",
        commitSha: "f6g7h8i",
        latencySeconds: 105,
        status: "completed",
        createdAt: "2026-06-15T13:05:00Z",
        findings: [
          {
            id: "f9",
            filePath: "db/pool.go",
            lineNumber: 55,
            category: "bug",
            severity: "critical",
            commentText:
              "Connection not returned to pool when `QueryContext` returns an error — leaks under repeated failures.",
            suggestedFix: "Wrap in `defer conn.Close()` after acquiring the connection.",
            outcome: "addressed",
            createdAt: "2026-06-15T13:06:45Z",
            postedAt: "2026-06-15T13:06:46Z",
            githubCommentId: 1901234509,
          },
        ],
      },
    },
    {
      number: 85,
      title: "Add cursor-based pagination",
      authorLogin: "alex-w",
      state: "merged",
      openedAt: "2026-06-13",
      review: {
        id: "r85",
        commitSha: "g7h8i9j",
        latencySeconds: 89,
        status: "completed",
        createdAt: "2026-06-13T08:50:00Z",
        findings: [
          {
            id: "f10",
            filePath: "api/handlers/list.go",
            lineNumber: 34,
            category: "performance",
            severity: "major",
            commentText:
              "`OFFSET` used in fallback path — will degrade significantly on large tables; cursor should always be set.",
            outcome: "dismissed",
            createdAt: "2026-06-13T08:51:29Z",
            postedAt: "2026-06-13T08:51:30Z",
            githubCommentId: 1901234510,
          },
          {
            id: "f11",
            filePath: "api/handlers/list.go",
            lineNumber: 67,
            category: "style",
            severity: "minor",
            commentText:
              "Magic number `50` for default page size — extract to a named constant.",
            outcome: "addressed",
            createdAt: "2026-06-13T08:51:29Z",
            postedAt: "2026-06-13T08:51:31Z",
            githubCommentId: 1901234511,
          },
          {
            id: "f12",
            filePath: "api/handlers/list.go",
            lineNumber: 89,
            category: "style",
            severity: "nit",
            commentText:
              "Redundant nil check — `cursor` is always non-nil at this point in the flow.",
            outcome: "reacted_negative",
            createdAt: "2026-06-13T08:51:29Z",
            postedAt: "2026-06-13T08:51:32Z",
            githubCommentId: 1901234512,
          },
        ],
      },
    },
  ],
};

export const REPOS: Repo[] = [WEB_APP, API_SERVICE];

export const INSTALLATIONS: Installation[] = [
  { id: 51234001, repoFullName: "acme/web-app",     installedAt: "2026-06-10T09:00:00Z" },
  { id: 51234002, repoFullName: "acme/api-service",  installedAt: "2026-06-10T09:05:00Z" },
];

export function getRepo(owner: string, name: string): Repo | undefined {
  return REPOS.find((r) => r.owner === owner && r.name === name);
}

export interface RepoMetrics {
  totalReviews: number;
  avgLatencySeconds: number;
  precision: number;
  noiseRatioPerPR: number;
  findingsBySeverity: Record<Severity, number>;
  totalFindings: number;
}

export function computeMetrics(repo: Repo): RepoMetrics {
  const reviews = repo.prs.flatMap((pr) => (pr.review ? [pr.review] : []));
  const allFindings = reviews.flatMap((r) => r.findings);

  const totalReviews = reviews.length;
  const avgLatencySeconds =
    totalReviews > 0
      ? Math.round(
          reviews.reduce((s, r) => s + r.latencySeconds, 0) / totalReviews
        )
      : 0;

  const reviewedFindings = allFindings.filter((f) => f.outcome !== "pending");
  const signalCount = reviewedFindings.filter(
    (f) => f.outcome === "addressed" || f.outcome === "reacted_positive"
  ).length;
  const precision =
    reviewedFindings.length > 0
      ? Math.round((signalCount / reviewedFindings.length) * 100)
      : 0;

  const prsWithFindings = repo.prs.filter(
    (pr) => pr.review && pr.review.findings.length > 0
  );
  const noiseCount = reviewedFindings.filter(
    (f) => f.outcome === "dismissed" || f.outcome === "no_action" || f.outcome === "reacted_negative"
  ).length;
  const noiseRatioPerPR =
    prsWithFindings.length > 0
      ? Math.round((noiseCount / prsWithFindings.length) * 10) / 10
      : 0;

  const findingsBySeverity: Record<Severity, number> = {
    critical: 0,
    major: 0,
    minor: 0,
    nit: 0,
  };
  for (const f of allFindings) {
    findingsBySeverity[f.severity]++;
  }

  return {
    totalReviews,
    avgLatencySeconds,
    precision,
    noiseRatioPerPR,
    findingsBySeverity,
    totalFindings: allFindings.length,
  };
}

export function formatLatency(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
