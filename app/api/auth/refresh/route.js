import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 로그인 직후 10분 동안만, 본인 브라우저에 한해 연동 열쇠를 보여 준다.
export async function GET(req) {
  const t = req.cookies.get("nb_refresh")?.value;
  if (!t) {
    return NextResponse.json(
      { error: "열쇠가 없습니다. 로그아웃 후 다시 로그인하고 10분 안에 눌러 주세요." },
      { status: 404 }
    );
  }
  const res = NextResponse.json({ refreshToken: t });
  res.cookies.delete("nb_refresh");
  return res;
}
