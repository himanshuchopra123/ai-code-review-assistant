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

export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  ref: string
): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${ref}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ai-code-reviewer",
      },
    }
  );

  if (!res.ok) return null;

  const data = (await res.json()) as { content?: string; encoding?: string };
  if (!data.content || data.encoding !== "base64") return null;

  const content = Buffer.from(data.content, "base64").toString("utf8");
  const lines = content.split("\n");
  if (lines.length > 300) return lines.slice(0, 300).join("\n") + "\n// ... truncated";
  return content;
}

const MAX_REFERENCED_FILES = 10;

export async function fetchReferencedFiles(
  token: string,
  owner: string,
  repo: string,
  ref: string,
  files: PRFile[]
): Promise<Map<string, string>> {
  const { parseImports } = await import("./import-parser");
  const referencedFiles = new Map<string, string>();
  const changedPaths = new Set(files.map((f) => f.filename));
  const candidatePaths = new Set<string>();

  for (const file of files) {
    if (!file.patch) continue;
    const content = await getFileContent(token, owner, repo, file.filename, ref);
    if (!content) continue;

    const imports = parseImports(content, file.filename);
    for (const imp of imports) {
      if (!changedPaths.has(imp) && !candidatePaths.has(imp)) {
        candidatePaths.add(imp);
      }
    }
  }

  const candidates = Array.from(candidatePaths).slice(0, MAX_REFERENCED_FILES * 2);

  const fetches = candidates.map(async (filePath) => {
    if (referencedFiles.size >= MAX_REFERENCED_FILES) return;
    const content = await getFileContent(token, owner, repo, filePath, ref);
    if (content && referencedFiles.size < MAX_REFERENCED_FILES) {
      referencedFiles.set(filePath, content);
    }
  });

  await Promise.all(fetches);
  return referencedFiles;
}

// Formats files into a single diff string for the LLM prompt (step 3)
export function formatDiffForReview(files: PRFile[]): string {
  return files
    .filter((f) => f.patch)
    .map((f) => `### ${f.filename}\n\`\`\`diff\n${f.patch}\n\`\`\``)
    .join("\n\n");
}

export function formatDiffWithContext(
  files: PRFile[],
  referencedFiles: Map<string, string>
): string {
  const diffSection = files
    .filter((f) => f.patch)
    .map((f) => `### ${f.filename}\n\`\`\`diff\n${f.patch}\n\`\`\``)
    .join("\n\n");

  if (referencedFiles.size === 0) return diffSection;

  const refSection = Array.from(referencedFiles.entries())
    .map(([filePath, content]) => {
      const ext = filePath.split(".").pop() ?? "";
      return `### ${filePath}\n\`\`\`${ext}\n${content}\n\`\`\``;
    })
    .join("\n\n");

  return `## Changed Files (review these)\n\n${diffSection}\n\n## Referenced Files (for context only — do NOT flag issues here)\n\n${refSection}`;
}

// Step 5: post a bundled PR review with line comments
import type { LLMFinding } from "./llm-review";

const SEVERITY_ICON: Record<string, string> = {
  critical: "\u{1F534}",
  major: "\u{1F7E0}",
  minor: "\u{1F7E1}",
  nit: "\u{1F535}",
};

function formatCommentBody(f: LLMFinding, feedbackUrl?: string): string {
  const icon = SEVERITY_ICON[f.severity] ?? "";
  const label = `${f.severity.charAt(0).toUpperCase() + f.severity.slice(1)} — ${f.category}`;
  let body = `**${icon} ${label}**\n\n${f.commentText}`;
  if (f.fixedCode) {
    body += `\n\n\`\`\`suggestion\n${f.fixedCode}\n\`\`\``;
  } else if (f.suggestedFix) {
    body += `\n\n**Suggested fix:** ${f.suggestedFix}`;
  }
  if (feedbackUrl) {
    body += `\n\n[![Acknowledge](https://img.shields.io/badge/✓_Acknowledge-22863a?style=flat-square)](${feedbackUrl}&outcome=addressed) [![Dismiss](https://img.shields.io/badge/✗_Dismiss-cb2431?style=flat-square)](${feedbackUrl}&outcome=dismissed)`;
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
  summary?: string,
  findingIds?: number[]
): Promise<PostedReview> {
  const isClean = findings.length === 0;
  const summaryBlock = summary ? `\n\n**Summary:** ${summary}` : "";

  const body = isClean
    ? `**✅ AI Review — Looks good!**${summaryBlock}\n\nNo issues found in this change.`
    : `**AI Review — ${findings.length} issue${findings.length > 1 ? "s" : ""} found**${summaryBlock}`;

  const appUrl = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  const comments = findings.map((f, i) => {
    const feedbackUrl = findingIds?.[i]
      ? `${appUrl}/api/feedback?id=${findingIds[i]}`
      : undefined;
    return {
      path: f.filePath,
      line: f.lineNumber,
      body: formatCommentBody(f, feedbackUrl),
    };
  });

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
