import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

interface TestCase {
  id: string;
  category: string;
  expectedSeverity: string | null;
  description: string;
  shouldFind: boolean;
  expectedKeywords: string[];
  diff: string;
}

interface Finding {
  filePath: string;
  lineNumber: number;
  severity: string;
  category: string;
  commentText: string;
  suggestedFix?: string;
}

interface EvalResult {
  id: string;
  category: string;
  description: string;
  shouldFind: boolean;
  detected: boolean;
  pass: boolean;
  severityMatch: boolean | null;
  categoryMatch: boolean | null;
  keywordHits: number;
  keywordTotal: number;
  findings: Finding[];
  error?: string;
}

const SYSTEM_PROMPT = `You are a precise, experienced code reviewer. Find real problems — bugs that cause incorrect behavior, security vulnerabilities, and changes that are risky to ship.

## What to review
- Only analyze lines prefixed with + (newly added lines)
- Never comment on context lines (no prefix) or deleted lines (-)
- Line numbers: use new-file line numbers from the diff header @@ -old +NEW @@

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

## When to stay silent
- Do not flag things that are purely your preference
- Do not comment on code outside the diff
- Do not invent findings to appear thorough — an empty findings array is a valid result
- If you are not confident a finding is real, leave it out`;

const TOOL_NAME = "submit_review";

async function reviewDiff(client: Anthropic, diff: string): Promise<Finding[]> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: TOOL_NAME,
        description: "Submit the complete list of code review findings. Call with an empty findings array if the diff looks clean.",
        input_schema: {
          type: "object" as const,
          properties: {
            findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  filePath: { type: "string" },
                  lineNumber: { type: "integer" },
                  severity: { type: "string", enum: ["critical", "major", "minor", "nit"] },
                  category: { type: "string", enum: ["bug", "security", "style", "performance", "risky_change"] },
                  commentText: { type: "string" },
                  suggestedFix: { type: "string" },
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
      { role: "user", content: `Review the following diff:\n\n${diff}` },
    ],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") return [];
  const input = toolBlock.input as { findings: Finding[] };
  return input.findings ?? [];
}

function checkKeywords(findings: Finding[], keywords: string[]): number {
  if (keywords.length === 0) return 0;
  const allText = findings.map((f) => `${f.commentText} ${f.suggestedFix ?? ""}`).join(" ").toLowerCase();
  return keywords.filter((kw) => allText.includes(kw.toLowerCase())).length;
}

function mapCategory(expected: string): string[] {
  if (expected === "security") return ["security"];
  if (expected === "bug") return ["bug"];
  if (expected === "performance") return ["performance"];
  if (expected === "risky_change") return ["risky_change"];
  if (expected === "clean") return [];
  return [expected];
}

async function runEval() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Set ANTHROPIC_API_KEY environment variable");
    process.exit(1);
  }

  const dataPath = process.argv[2] || path.join(__dirname, "Golden_dataset.json.json");
  if (!fs.existsSync(dataPath)) {
    console.error(`File not found: ${dataPath}`);
    process.exit(1);
  }

  const testCases: TestCase[] = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const client = new Anthropic({ apiKey });
  const results: EvalResult[] = [];

  console.log(`\nRunning evaluation on ${testCases.length} test cases...\n`);
  console.log("─".repeat(90));

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const progress = `[${String(i + 1).padStart(3)}/${testCases.length}]`;

    try {
      const findings = await reviewDiff(client, tc.diff);
      const detected = findings.length > 0;
      const pass = tc.shouldFind ? detected : !detected;

      let severityMatch: boolean | null = null;
      let categoryMatch: boolean | null = null;

      if (tc.shouldFind && detected && tc.expectedSeverity) {
        severityMatch = findings.some((f) => f.severity === tc.expectedSeverity);
        const validCategories = mapCategory(tc.category);
        categoryMatch = findings.some((f) => validCategories.includes(f.category));
      }

      const keywordHits = checkKeywords(findings, tc.expectedKeywords);

      const result: EvalResult = {
        id: tc.id,
        category: tc.category,
        description: tc.description,
        shouldFind: tc.shouldFind,
        detected,
        pass,
        severityMatch,
        categoryMatch,
        keywordHits,
        keywordTotal: tc.expectedKeywords.length,
        findings,
      };
      results.push(result);

      const icon = pass ? "✓" : "✗";
      const findingsSummary = detected
        ? findings.map((f) => `${f.severity}/${f.category}`).join(", ")
        : "none";
      console.log(
        `${progress} ${icon} ${tc.id.padEnd(12)} ${pass ? "PASS" : "FAIL"}  ` +
        `expected=${tc.shouldFind ? "find" : "clean"}  got=${findingsSummary}`
      );

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      results.push({
        id: tc.id,
        category: tc.category,
        description: tc.description,
        shouldFind: tc.shouldFind,
        detected: false,
        pass: false,
        severityMatch: null,
        categoryMatch: null,
        keywordHits: 0,
        keywordTotal: tc.expectedKeywords.length,
        findings: [],
        error,
      });
      console.log(`${progress} ! ${tc.id.padEnd(12)} ERROR  ${error.slice(0, 60)}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // --- Summary ---
  console.log("\n" + "═".repeat(90));
  console.log("EVALUATION SUMMARY");
  console.log("═".repeat(90));

  const bugCases = results.filter((r) => r.shouldFind);
  const cleanCases = results.filter((r) => !r.shouldFind);

  const truePositives = bugCases.filter((r) => r.detected).length;
  const falseNegatives = bugCases.filter((r) => !r.detected).length;
  const trueNegatives = cleanCases.filter((r) => !r.detected).length;
  const falsePositives = cleanCases.filter((r) => r.detected).length;

  const recall = bugCases.length > 0 ? (truePositives / bugCases.length) * 100 : 0;
  const precision = (truePositives + falsePositives) > 0
    ? (truePositives / (truePositives + falsePositives)) * 100
    : 0;
  const falsePositiveRate = cleanCases.length > 0
    ? (falsePositives / cleanCases.length) * 100
    : 0;

  const severityResults = bugCases.filter((r) => r.severityMatch !== null);
  const severityAccuracy = severityResults.length > 0
    ? (severityResults.filter((r) => r.severityMatch).length / severityResults.length) * 100
    : 0;

  const categoryResults = bugCases.filter((r) => r.categoryMatch !== null);
  const categoryAccuracy = categoryResults.length > 0
    ? (categoryResults.filter((r) => r.categoryMatch).length / categoryResults.length) * 100
    : 0;

  const totalKeywordHits = results.reduce((s, r) => s + r.keywordHits, 0);
  const totalKeywords = results.reduce((s, r) => s + r.keywordTotal, 0);
  const keywordHitRate = totalKeywords > 0 ? (totalKeywordHits / totalKeywords) * 100 : 0;

  console.log(`\nOverall:`);
  console.log(`  Total test cases:     ${results.length}`);
  console.log(`  Passed:               ${results.filter((r) => r.pass).length}/${results.length}`);
  console.log(`  Errors:               ${results.filter((r) => r.error).length}`);

  console.log(`\nDetection:`);
  console.log(`  Recall:               ${recall.toFixed(1)}%  (${truePositives}/${bugCases.length} bugs detected)`);
  console.log(`  Precision:            ${precision.toFixed(1)}%  (${truePositives} true / ${truePositives + falsePositives} total findings)`);
  console.log(`  False positive rate:  ${falsePositiveRate.toFixed(1)}%  (${falsePositives}/${cleanCases.length} clean diffs flagged)`);

  console.log(`\nQuality:`);
  console.log(`  Severity accuracy:    ${severityAccuracy.toFixed(1)}%  (${severityResults.filter((r) => r.severityMatch).length}/${severityResults.length})`);
  console.log(`  Category accuracy:    ${categoryAccuracy.toFixed(1)}%  (${categoryResults.filter((r) => r.categoryMatch).length}/${categoryResults.length})`);
  console.log(`  Keyword hit rate:     ${keywordHitRate.toFixed(1)}%  (${totalKeywordHits}/${totalKeywords} keywords found in comments)`);

  // Per-category breakdown
  console.log(`\nPer-category recall:`);
  const categories = Array.from(new Set(bugCases.map((r) => r.category)));
  for (const cat of categories) {
    const catCases = bugCases.filter((r) => r.category === cat);
    const catDetected = catCases.filter((r) => r.detected).length;
    console.log(`  ${cat.padEnd(15)} ${catDetected}/${catCases.length}  (${((catDetected / catCases.length) * 100).toFixed(0)}%)`);
  }

  // Failures list
  const failures = results.filter((r) => !r.pass);
  if (failures.length > 0) {
    console.log(`\nFailed cases:`);
    for (const f of failures) {
      const type = f.shouldFind ? "MISSED" : "FALSE POS";
      console.log(`  ${type.padEnd(10)} ${f.id.padEnd(12)} ${f.description}`);
      if (f.findings.length > 0) {
        for (const finding of f.findings) {
          console.log(`             → [${finding.severity}/${finding.category}] ${finding.commentText.slice(0, 70)}`);
        }
      }
    }
  }

  // Save results
  const outputPath = path.join(path.dirname(dataPath), "eval-results.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);

  // Save CSV summary
  const csvPath = path.join(path.dirname(dataPath), "eval-results.csv");
  const csvHeader = "ID,Category,Description,Should Find,Detected,Pass,Severity Match,Category Match,Keyword Hits,Findings Count,First Finding";
  const csvRows = results.map((r) => {
    const firstFinding = r.findings[0];
    const firstText = firstFinding ? `${firstFinding.severity}/${firstFinding.category}: ${firstFinding.commentText}`.replace(/,/g, ";").replace(/"/g, "'") : "";
    return [
      r.id, r.category, `"${r.description}"`, r.shouldFind, r.detected, r.pass,
      r.severityMatch ?? "N/A", r.categoryMatch ?? "N/A",
      `${r.keywordHits}/${r.keywordTotal}`, r.findings.length, `"${firstText}"`
    ].join(",");
  });
  fs.writeFileSync(csvPath, csvHeader + "\n" + csvRows.join("\n"));
  console.log(`CSV saved to: ${csvPath}`);
}

runEval().catch(console.error);
