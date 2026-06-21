import Anthropic from "@anthropic-ai/sdk";

export interface LLMFinding {
  filePath: string;
  lineNumber: number;
  severity: "critical" | "major" | "minor" | "nit";
  category: "bug" | "security" | "style" | "performance" | "risky_change";
  commentText: string;
  suggestedFix?: string;
  originalCode?: string;
  fixedCode?: string;
}

const SYSTEM_PROMPT = `You are a precise, experienced code reviewer. Find real problems — bugs that cause incorrect behavior, security vulnerabilities, and changes that are risky to ship.

## What to review
- Only flag issues in the **Changed Files** section (lines prefixed with +)
- Never comment on context lines (no prefix) or deleted lines (-)
- Line numbers: use new-file line numbers from the diff header @@ -old +NEW @@

## Using referenced files
- Referenced files are provided so you can understand types, function signatures, and how the changed code fits into the codebase
- Use them to catch issues like: wrong argument types, missing null checks based on return types, breaking a caller's contract, misusing an API
- Do NOT flag issues in referenced files — they are context only

## Severity
- critical — will cause data loss, security breach, auth bypass, or crash in normal operation
- major — likely causes incorrect behavior or runtime error in common scenarios
- minor — edge-case bug, poor practice that could bite later, or genuinely unclear logic
- nit — style or naming issue; only include if it is worth the author's time

## Category
- bug — wrong logic, bad condition, off-by-one, null dereference
- security — injection, hardcoded secret, improper auth, unsafe deserialization
- performance — N+1 query, unnecessary allocation in a hot path
- risky_change — silently changes behavior, removes a guard, touches a critical path
- style — naming or formatting (nit-level only)

## Comment quality
- Name the exact variable, function, or condition that is the problem
- Explain WHY it is a problem, not just what it is
- Keep commentText under 120 characters
- Only include suggestedFix when you have a concrete, correct fix — omit if unsure

## Auto-fix suggestions
- When you have a concrete fix, provide originalCode and fixedCode
- originalCode: the exact line(s) from the diff that need to change (without the + prefix)
- fixedCode: the corrected replacement code
- These will be rendered as GitHub suggestion blocks that developers can apply with one click
- Only provide these when you are confident the fix is correct

## When to stay silent
- Do not flag things that are purely your preference
- Do not comment on code outside the diff
- Do not invent findings to appear thorough — an empty findings array is a valid result
- If you are not confident a finding is real, leave it out`;

const TOOL_NAME = "submit_review";

export async function reviewWithLLM({
  repo,
  pr,
  diff,
}: {
  repo: string;
  pr: number;
  diff: string;
}): Promise<LLMFinding[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: TOOL_NAME,
        description:
          "Submit the complete list of code review findings. Call with an empty findings array if the diff looks clean.",
        input_schema: {
          type: "object" as const,
          properties: {
            findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  filePath: {
                    type: "string",
                    description: "Path of the file being reviewed",
                  },
                  lineNumber: {
                    type: "integer",
                    description: "Line number in the new version of the file",
                  },
                  severity: {
                    type: "string",
                    enum: ["critical", "major", "minor", "nit"],
                  },
                  category: {
                    type: "string",
                    enum: ["bug", "security", "style", "performance", "risky_change"],
                  },
                  commentText: {
                    type: "string",
                    description: "Explanation of the issue",
                  },
                  suggestedFix: {
                    type: "string",
                    description: "Optional human-readable fix description",
                  },
                  originalCode: {
                    type: "string",
                    description: "The exact original code line(s) to replace (without + prefix)",
                  },
                  fixedCode: {
                    type: "string",
                    description: "The corrected replacement code",
                  },
                },
                required: ["filePath", "lineNumber", "severity", "category", "commentText"],
              },
            },
          },
          required: ["findings"],
        },
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [
      {
        role: "user",
        content: `Review the following diff for ${repo} PR #${pr}:\n\n${diff}`,
      },
    ],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") return [];

  const input = toolBlock.input as { findings: LLMFinding[] };
  return input.findings ?? [];
}

export async function summarizePR({
  repo,
  pr,
  diff,
}: {
  repo: string;
  pr: number;
  diff: string;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    system: "You summarize code diffs in 2-3 sentences. Describe WHAT changed and WHY it likely changed. Be specific — name functions, files, and behaviors. No filler phrases.",
    messages: [
      {
        role: "user",
        content: `Summarize this diff for ${repo} PR #${pr}:\n\n${diff}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return "";
  return textBlock.text;
}
