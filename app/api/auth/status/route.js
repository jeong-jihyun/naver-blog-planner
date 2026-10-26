import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  return NextResponse.json({ loggedIn: Boolean(req.cookies.get("nb_token")?.value) });
}

// 로그아웃
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("nb_token");
  return res;
}
