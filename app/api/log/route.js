import { NextResponse } from "next/server";
import { buildIcal, icalLocal, nowKst, refreshAccessToken, createSchedule } from "../../../lib/naver";

export const dynamic = "force-dynamic";

// Claude 작업 기록용: ?key=...&title=...&desc=...&at=YYYY-MM-DDTHH:mm(선택, 한국시각)&min=15(선택)
async function handle(params) {
  const logKey = process.env.LOG_KEY;
  const refresh = process.env.NAVER_REFRESH_TOKEN;
  if (!logKey || !refresh) {
    return NextResponse.json({ ok: false, error: "LOG_KEY / NAVER_REFRESH_TOKEN 이 설정되지 않았습니다." }, { status: 503 });
  }
  if (params.get("key") !== logKey) {
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 401 });
  }

  const title = String(params.get("title") || "").trim().slice(0, 100);
  const desc = String(params.get("desc") || "").trim().slice(0, 500);
  const at = params.get("at") || nowKst();
  const min = Math.min(Math.max(Number(params.get("min")) || 15, 5), 240);
  if (!title) {
    return NextResponse.json({ ok: false, error: "title 이 필요합니다." }, { status: 400 });
  }

  try {
    const access = await refreshAccessToken(refresh);
    const ical = buildIcal({
      start: { begin: icalLocal(at), end: icalLocal(at, 0, min) },
      durationMin: min,
      summary: title,
      description: desc,
    });
    await createSchedule(access, ical);
    return NextResponse.json({ ok: true, title, at });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
  }
}

export async function GET(req) {
  return handle(new URL(req.url).searchParams);
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  return handle(new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])));
}
