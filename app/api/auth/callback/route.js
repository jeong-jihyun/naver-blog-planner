import { NextResponse } from "next/server";
import { exchangeToken } from "../../../../lib/naver";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = req.cookies.get("nb_state")?.value;
  const back = (msg) =>
    NextResponse.redirect(new URL(`/?error=${encodeURIComponent(msg)}`, req.url));

  if (url.searchParams.get("error")) {
    return back(url.searchParams.get("error_description") || "로그인이 취소되었습니다.");
  }
  if (!code || !state || !saved || state !== saved) {
    return back("로그인 확인(state)이 맞지 않습니다. 다시 로그인해 주세요.");
  }

  try {
    const token = await exchangeToken(code, state);
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set("nb_token", token.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Number(token.expires_in) || 3600,
    });
    res.cookies.delete("nb_state");
    return res;
  } catch (e) {
    return back(e.message);
  }
}
