import { supabase } from "./supabase";
import type { LLMFinding } from "./llm-review";
import type {
  Repo,
  PullRequest,
  Review,
  Finding,
  Severity,
  Category,
  Outcome,
  PRState,
} from "./mock-data";

export async function upsertRepo(owner: string, name: string) {
  const fullName = `${owner}/${name}`;
  const { data, error } = await supabase
    .from("repos")
    .upsert({ owner, name, full_name: fullName }, { onConflict: "full_name" })
    .select("id")
    .single();
  if (error) throw new Error(`upsertRepo: ${error.message}`);
  return data.id as number;
}

export async function upsertPullRequest(
  repoId: number,
  number: number,
  title: string,
  authorLogin: string,
  state: string,
  openedAt: string
) {
  const { data, error } = await supabase
    .from("pull_requests")
    .upsert(
      {
        repo_id: repoId,
        number,
        title,
        author_login: authorLogin,
        state,
        opened_at: openedAt,
      },
      { onConflict: "repo_id,number" }
    )
    .select("id")
    .single();
  if (error) throw new Error(`upsertPullRequest: ${error.message}`);
  return data.id as number;
}

export async function insertReview(
  pullRequestId: number,
  commitSha: string,
  latencySeconds: number,
  status: string,
  githubReviewId?: number
) {
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      pull_request_id: pullRequestId,
      commit_sha: commitSha,
      latency_seconds: latencySeconds,
      status,
      github_review_id: githubReviewId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`insertReview: ${error.message}`);
  return data.id as number;
}

export async function insertFindings(
  reviewId: number,
  findings: LLMFinding[],
  githubCommentIds?: number[]
): Promise<number[]> {
  if (findings.length === 0) return [];

  const rows = findings.map((f, i) => ({
    review_id: reviewId,
    file_path: f.filePath,
    line_number: f.lineNumber,
    severity: f.severity,
    category: f.category,
    comment_text: f.commentText,
    suggested_fix: f.suggestedFix ?? null,
    github_comment_id: githubCommentIds?.[i] ?? null,
    posted_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase.from("findings").insert(rows).select("id");
  if (error) throw new Error(`insertFindings: ${error.message}`);
  return (data ?? []).map((r) => r.id as number);
}

export async function updateFindingOutcome(
  findingId: number,
  outcome: string
) {
  const { error } = await supabase
    .from("findings")
    .update({ outcome })
    .eq("id", findingId);
  if (error) throw new Error(`updateFindingOutcome: ${error.message}`);
}

export async function updatePRState(
  repoFullName: string,
  prNumber: number,
  state: string
) {
  const { data: repo } = await supabase
    .from("repos")
    .select("id")
    .eq("full_name", repoFullName)
    .single();
  if (!repo) return;

  const { error } = await supabase
    .from("pull_requests")
    .update({ state })
    .eq("repo_id", repo.id)
    .eq("number", prNumber);
  if (error) throw new Error(`updatePRState: ${error.message}`);
}

// --- Dashboard query functions ---

interface DBFinding {
  id: number;
  file_path: string;
  line_number: number;
  severity: string;
  category: string;
  comment_text: string;
  suggested_fix: string | null;
  outcome: string;
  created_at: string;
  posted_at: string | null;
  github_comment_id: number | null;
}

interface DBReview {
  id: number;
  commit_sha: string;
  latency_seconds: number;
  status: string;
  created_at: string;
  findings: DBFinding[];
}

interface DBPR {
  id: number;
  number: number;
  title: string;
  author_login: string;
  state: string;
  opened_at: string;
  reviews: DBReview[];
}

interface DBRepo {
  id: number;
  owner: string;
  name: string;
  full_name: string;
  is_enabled: boolean;
  pull_requests: DBPR[];
}

function mapFinding(f: DBFinding): Finding {
  return {
    id: String(f.id),
    filePath: f.file_path,
    lineNumber: f.line_number,
    severity: f.severity as Severity,
    category: f.category as Category,
    commentText: f.comment_text,
    suggestedFix: f.suggested_fix ?? undefined,
    outcome: f.outcome as Outcome,
    createdAt: f.created_at,
    postedAt: f.posted_at ?? undefined,
    githubCommentId: f.github_comment_id ?? undefined,
  };
}

function mapReview(r: DBReview): Review {
  return {
    id: String(r.id),
    commitSha: r.commit_sha,
    latencySeconds: r.latency_seconds,
    status: r.status as Review["status"],
    createdAt: r.created_at,
    findings: r.findings.map(mapFinding),
  };
}

function mapPR(pr: DBPR): PullRequest {
  const latestReview = pr.reviews.length > 0 ? pr.reviews[0] : null;
  return {
    number: pr.number,
    title: pr.title,
    authorLogin: pr.author_login,
    state: pr.state as PRState,
    openedAt: pr.opened_at.split("T")[0],
    review: latestReview ? mapReview(latestReview) : null,
  };
}

function mapRepo(r: DBRepo): Repo {
  return {
    owner: r.owner,
    name: r.name,
    fullName: r.full_name,
    isEnabled: r.is_enabled,
    prs: r.pull_requests.map(mapPR),
  };
}

const NESTED_SELECT = `
  id, owner, name, full_name, is_enabled,
  pull_requests (
    id, number, title, author_login, state, opened_at,
    reviews (
      id, commit_sha, latency_seconds, status, created_at,
      findings (
        id, file_path, line_number, severity, category,
        comment_text, suggested_fix, outcome, created_at,
        posted_at, github_comment_id
      )
    )
  )
`;

export async function fetchAllRepos(): Promise<Repo[]> {
  const { data, error } = await supabase
    .from("repos")
    .select(NESTED_SELECT)
    .eq("is_enabled", true);
  if (error) throw new Error(`fetchAllRepos: ${error.message}`);
  return (data as unknown as DBRepo[]).map(mapRepo);
}

export async function fetchRepoByName(
  owner: string,
  name: string
): Promise<Repo | null> {
  const { data, error } = await supabase
    .from("repos")
    .select(NESTED_SELECT)
    .eq("owner", owner)
    .eq("name", name)
    .single();
  if (error) return null;
  return mapRepo(data as unknown as DBRepo);
}
