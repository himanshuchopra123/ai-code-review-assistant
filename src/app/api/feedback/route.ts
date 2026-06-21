import { NextRequest, NextResponse } from "next/server";
import { updateFindingOutcome } from "@/lib/db";

const VALID_OUTCOMES = ["addressed", "dismissed"];

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const outcome = request.nextUrl.searchParams.get("outcome");

  if (!id || !outcome || !VALID_OUTCOMES.includes(outcome)) {
    return new NextResponse(page("Invalid request", "Missing or invalid parameters."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const findingId = parseInt(id, 10);
  if (isNaN(findingId)) {
    return new NextResponse(page("Invalid request", "Invalid finding ID."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    await updateFindingOutcome(findingId, outcome);
    const label = outcome === "addressed" ? "Acknowledged" : "Dismissed";
    return new NextResponse(
      page(
        `Finding ${label}`,
        `Thank you! This finding has been marked as <strong>${outcome}</strong>. You can close this tab.`
      ),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch {
    return new NextResponse(page("Error", "Failed to update finding. Please try again."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}

function page(title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f4f4f5; }
  .card { background: white; border-radius: 12px; padding: 40px; text-align: center; max-width: 400px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #71717a; font-size: 14px; margin: 0; }
</style>
</head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body>
</html>`;
}
