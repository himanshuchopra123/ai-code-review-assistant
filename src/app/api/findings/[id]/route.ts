import { NextRequest, NextResponse } from "next/server";
import { updateFindingOutcome } from "@/lib/db";

const VALID_OUTCOMES = [
  "pending",
  "addressed",
  "dismissed",
  "reacted_positive",
  "reacted_negative",
  "no_action",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const findingId = parseInt(id, 10);
  if (isNaN(findingId)) {
    return NextResponse.json({ error: "Invalid finding ID" }, { status: 400 });
  }

  const body = await request.json();
  const { outcome } = body as { outcome: string };

  if (!outcome || !VALID_OUTCOMES.includes(outcome)) {
    return NextResponse.json(
      { error: `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    await updateFindingOutcome(findingId, outcome);
    return NextResponse.json({ ok: true, findingId, outcome });
  } catch (err) {
    console.error("[findings] update error:", err);
    return NextResponse.json({ error: "Failed to update finding" }, { status: 500 });
  }
}
