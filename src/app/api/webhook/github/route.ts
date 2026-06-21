import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/webhook-verify";
import { getInstallationToken } from "@/lib/github-auth";
import { getPRFiles, formatDiffForReview, postPRReview } from "@/lib/github-api";
import { reviewWithLLM, summarizePR } from "@/lib/llm-review";
import { filterValidFindings } from "@/lib/diff-validator";
import { upsertRepo, upsertPullRequest, insertReview, insertFindings, updatePRState } from "@/lib/db";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] GITHUB_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    console.warn("[webhook] Invalid signature — rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event !== "pull_request") {
    return NextResponse.json({ ok: true, skipped: `event=${event}` });
  }

  const payload = JSON.parse(rawBody) as {
    action: string;
    pull_request: { number: number; head: { sha: string }; merged: boolean };
    installation: { id: number };
    repository: { full_name: string; owner: { login: string }; name: string };
  };

  const { action, pull_request: pr, installation, repository } = payload;

  // Step 6: track PR state changes (closed/merged)
  if (action === "closed") {
    const state = pr.merged ? "merged" : "closed";
    console.log(`[step6] PR #${pr.number} ${state}`);
    try {
      await updatePRState(repository.full_name, pr.number, state);
    } catch (err) {
      console.error("[step6] error updating PR state:", err);
    }
    return NextResponse.json({ ok: true, stateUpdated: state });
  }

  if (!["opened", "reopened", "synchronize"].includes(action)) {
    return NextResponse.json({ ok: true, skipped: `action=${action}` });
  }

  console.log(
    `[webhook] pull_request.${action} — ${repository.full_name}#${pr.number} sha=${pr.head.sha}`
  );

  const startTime = Date.now();

  try {
    // Step 2: authenticate and fetch the diff
    const token = await getInstallationToken(installation.id);
    console.log(`[step2] installation token acquired`);

    const files = await getPRFiles(
      token,
      repository.owner.login,
      repository.name,
      pr.number
    );
    console.log(`[step2] fetched ${files.length} changed file(s)`);
    files.forEach((f) =>
      console.log(`  ${f.status.padEnd(8)} ${f.filename}  +${f.additions}/-${f.deletions}`)
    );

    const diff = formatDiffForReview(files);
    console.log(`[step2] diff ready — ${diff.length} chars`);

    // Step 3: LLM review + PR summary (parallel)
    const [rawFindings, summary] = await Promise.all([
      reviewWithLLM({ repo: repository.full_name, pr: pr.number, diff }),
      summarizePR({ repo: repository.full_name, pr: pr.number, diff }),
    ]);
    console.log(`[step3] LLM returned ${rawFindings.length} finding(s)`);
    console.log(`[step3] summary: ${summary.slice(0, 100)}...`);

    // Step 4: filter out hallucinated line numbers
    const findings = filterValidFindings(files, rawFindings);
    console.log(`[step4] ${findings.length} finding(s) passed diff validation`);
    findings.forEach((f) =>
      console.log(`  [${f.severity}] ${f.filePath}:${f.lineNumber} — ${f.commentText.slice(0, 80)}`)
    );

    // Persist to DB first (so we have finding IDs for feedback buttons)
    const repoId = await upsertRepo(repository.owner.login, repository.name);
    const prId = await upsertPullRequest(
      repoId,
      pr.number,
      `PR #${pr.number}`,
      "unknown",
      "open",
      new Date().toISOString()
    );
    const latencySeconds = Math.round((Date.now() - startTime) / 1000);
    const dbReviewId = await insertReview(prId, pr.head.sha, latencySeconds, "completed");
    const findingIds = await insertFindings(dbReviewId, findings);
    console.log(`[db] saved review ${dbReviewId} with ${findings.length} finding(s)`);

    // Step 5: post bundled PR review to GitHub (with feedback buttons)
    const { reviewId: ghReviewId, commentCount } = await postPRReview(
      token,
      repository.owner.login,
      repository.name,
      pr.number,
      pr.head.sha,
      findings,
      summary,
      findingIds
    );
    console.log(`[step5] posted review #${ghReviewId} with ${commentCount} comment(s)`);

  } catch (err) {
    console.error("[webhook] error:", err);
    return NextResponse.json({ error: "Review failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reviewPosted: true });
}
