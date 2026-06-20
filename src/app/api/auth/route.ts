import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = (await request.json()) as { password: string };
  const correct = process.env.DASHBOARD_PASSWORD;

  if (!correct) {
    return NextResponse.json({ ok: true });
  }

  if (password !== correct) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("dashboard_auth", "true", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
  return res;
}
