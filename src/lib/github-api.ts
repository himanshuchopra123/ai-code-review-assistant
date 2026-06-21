export interface PRFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  patch?: string; // absent for binary files or very large diffs
}

export async function getPRFiles(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PRFile[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ai-code-reviewer",
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch PR files ${res.status}: ${body}`);
  }

  return res.json() as Promise<PRFile[]>;
}

// Formats files into a single diff string for the LLM prompt (step 3)
export function formatDiffForReview(files: PRFile[]): string {
  return files
    .filter((f) => f.patch)
    .map((f) => `### ${f.filename}\n\`\`\`diff\n${f.patch}\n\`\`\``)
    .join("\n\n");
}

// Step 5: post a bundled PR review with line comments
import type { LLMFinding } from "./llm-review";

const SEVERITY_ICON: Record<string, string> = {
  critical: "\u{1F534}",
  major: "\u{1F7E0}",
  minor: "\u{1F7E1}",
  nit: "\u{1F535}",
};

function formatCommentBody(f: LLMFinding): string {
  const icon = SEVERITY_ICON[f.severity] ?? "";
  const label = `${f.severity.charAt(0).toUpperCase() + f.severity.slice(1)} — ${f.category}`;
  let body = `**${icon} ${label}**\n\n${f.commentText}`;
  if (f.suggestedFix) {
    body += `\n\n**Suggested fix:** ${f.suggestedFix}`;
  }
  return body;
}

export interface PostedReview {
  reviewId: number;
  commentCount: number;
}

export async function postPRReview(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
  commitSha: string,
  findings: LLMFinding[],
  summary?: string
): Promise<PostedReview> {
  const isClean = findings.length === 0;
  const summaryBlock = summary ? `\n\n**Summary:** ${summary}` : "";

  const body = isClean
    ? `**✅ AI Review — Looks good!**${summaryBlock}\n\nNo issues found in this change.`
    : `**AI Review — ${findings.length} issue${findings.length > 1 ? "s" : ""} found**${summaryBlock}`;

  const comments = findings.map((f) => ({
    path: f.filePath,
    line: f.lineNumber,
    body: formatCommentBody(f),
  }));

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ai-code-reviewer",
      },
      body: JSON.stringify({
        commit_id: commitSha,
        body,
        event: "COMMENT",
        comments,
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Failed to post PR review ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as { id: number };
  return { reviewId: data.id, commentCount: findings.length };
}
