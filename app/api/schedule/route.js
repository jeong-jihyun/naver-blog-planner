import { NextResponse } from "next/server";
import { buildIcal, icalLocal, createSchedule } from "../../../lib/naver";

export const dynamic = "force-dynamic";

// 발행 후 확인 일정 (며칠 뒤 / 무엇을 확인)
const CHECKS = {
  index: { days: 1, label: "검색 색인 확인", memo: "서치어드바이저/구글 서치콘솔에서 색인됐는지 확인" },
  exposure: { days: 7, label: "검색 노출 확인", memo: "핵심 키워드로 검색해 노출 순위와 유입 확인" },
  review: { days: 14, label: "성과 점검", memo: "조회수·체류시간·AI 브리핑 인용수를 보고 글 구조 보완 여부 결정" },
};

export async function POST(req) {
  const token = req.cookies.get("nb_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const title = String(body.title || "").trim();
  const blog = String(body.blog || "").trim();
  const publishAt = String(body.publishAt || "");
  const checks = Array.isArray(body.checks) ? body.checks.filter((k) => CHECKS[k]) : [];

  if (!title || !publishAt) {
    return NextResponse.json({ error: "글 제목과 발행 일시를 입력하세요." }, { status: 400 });
  }

  // 만들 일정 목록: 발행 + 선택한 확인 일정
  const jobs = [
    {
      name: "발행",
      begin: icalLocal(publishAt),
      end: icalLocal(publishAt, 0, 30),
      summary: `[발행] ${title}`,
      description: blog ? `블로그: ${blog}` : "",
    },
    ...checks.map((k) => ({
      name: CHECKS[k].label,
      begin: icalLocal(publishAt, CHECKS[k].days),
      end: icalLocal(publishAt, CHECKS[k].days, 30),
      summary: `[${CHECKS[k].label}] ${title}`,
      description: `${CHECKS[k].memo}${blog ? `\n블로그: ${blog}` : ""}`,
    })),
  ];

  const results = [];
  for (const j of jobs) {
    try {
      const ical = buildIcal({
        start: { begin: j.begin, end: j.end },
        summary: j.summary,
        description: j.description,
      });
      await createSchedule(token, ical);
      results.push({ name: j.name, ok: true, when: j.begin });
    } catch (e) {
      results.push({ name: j.name, ok: false, error: e.message });
    }
  }

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json(
    { results },
    { status: failed.length === results.length ? 502 : 200 }
  );
}
