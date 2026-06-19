import type { PRFile } from "./github-api";
import type { LLMFinding } from "./llm-review";

// Returns the set of new-file line numbers that correspond to added (+) lines
function getAddedLines(patch: string): Set<number> {
  const added = new Set<number>();
  let newLine = 0;

  for (const line of patch.split("\n")) {
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      newLine = parseInt(hunkMatch[1], 10) - 1;
      continue;
    }
    if (line.startsWith("-")) continue; // deleted lines don't advance the new-file counter
    newLine++;
    if (line.startsWith("+")) {
      added.add(newLine);
    }
  }

  return added;
}

// Filters out findings whose line numbers don't appear in the actual diff.
// Allows ±2 line tolerance for off-by-one errors in the model's line counting.
export function filterValidFindings(
  files: PRFile[],
  findings: LLMFinding[]
): LLMFinding[] {
  const addedByFile = new Map<string, Set<number>>();
  for (const f of files) {
    if (f.patch) {
      addedByFile.set(f.filename, getAddedLines(f.patch));
    }
  }

  return findings.filter((finding) => {
    const lines = addedByFile.get(finding.filePath);
    if (!lines) return false;
    for (let delta = -2; delta <= 2; delta++) {
      if (lines.has(finding.lineNumber + delta)) return true;
    }
    return false;
  });
}
