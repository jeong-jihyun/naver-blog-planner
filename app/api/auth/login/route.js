import { NextResponse } from "next/server";
import { authorizeUrl } from "../../../../lib/naver";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const state = crypto.randomUUID();
    const res = NextResponse.redirect(authorizeUrl(req, state));
    res.cookies.set("nb_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    return res;
  } catch (e) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(e.message)}`, req.url));
  }
}
