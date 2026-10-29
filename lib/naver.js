// 네이버 로그인(OAuth) + 캘린더 API 호출 모듈 (서버에서만 사용)

export function getEnv() {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error(
      "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 이 설정되지 않았습니다. .env.local 파일을 확인하세요."
    );
  }
  return { id, secret };
}

export function redirectUri(req) {
  return (
    process.env.NAVER_REDIRECT_URI ||
    `${new URL(req.url).origin}/api/auth/callback`
  );
}

// 로그인 주소 만들기
export function authorizeUrl(req, state) {
  const { id } = getEnv();
  const p = new URLSearchParams({
    response_type: "code",
    client_id: id,
    redirect_uri: redirectUri(req),
    state,
  });
  return `https://nid.naver.com/oauth2.0/authorize?${p.toString()}`;
}

// code → access_token 교환
export async function exchangeToken(code, state) {
  const { id, secret } = getEnv();
  const p = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: id,
    client_secret: secret,
    code,
    state,
  });
  const res = await fetch(`https://nid.naver.com/oauth2.0/token?${p.toString()}`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error_description || json.error || "토큰 발급 실패");
  }
  return json; // access_token, refresh_token, expires_in
}

// refresh_token → 새 access_token (Claude 기록용)
export async function refreshAccessToken(refreshToken) {
  const { id, secret } = getEnv();
  const p = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: id,
    client_secret: secret,
    refresh_token: refreshToken,
  });
  const res = await fetch(`https://nid.naver.com/oauth2.0/token?${p.toString()}`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.error || !json.access_token) {
    throw new Error(json.error_description || json.error || "토큰 갱신 실패");
  }
  return json.access_token;
}

// 지금 한국 시각을 "YYYY-MM-DDTHH:mm" 로
export function nowKst() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// ---- 시간 계산: 입력한 "한국 시각 그대로"를 기준으로 더하고 빼기 ----
const pad = (n) => String(n).padStart(2, "0");

// "2026-10-30T10:00" → { y, m, d, hh, mm }
function parseLocal(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s || "");
  if (!m) throw new Error("날짜·시간 형식이 올바르지 않습니다.");
  return { y: +m[1], m: +m[2], d: +m[3], hh: +m[4], mm: +m[5] };
}

// 달력 숫자 기준으로 일/분을 더해 YYYYMMDDTHHMMSS 로 반환
export function icalLocal(s, addDays = 0, addMinutes = 0) {
  const t = parseLocal(s);
  const dt = new Date(Date.UTC(t.y, t.m - 1, t.d + addDays, t.hh, t.mm + addMinutes));
  return (
    `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}` +
    `T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`
  );
}

function utcStamp() {
  const d = new Date();
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

// iCal 텍스트에서 쓰면 안 되는 문자 정리
const esc = (t = "") =>
  String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function buildIcal({ start, durationMin = 30, summary, description = "" }) {
  const stamp = utcStamp();
  const uid = `${crypto.randomUUID()}@naver-blog-planner`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:Naver Calendar",
    "CALSCALE:GREGORIAN",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Seoul",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZNAME:GMT+09:00",
    "TZOFFSETFROM:+0900",
    "TZOFFSETTO:+0900",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    "SEQUENCE:0",
    "CLASS:PUBLIC",
    "TRANSP:OPAQUE",
    `UID:${uid}`,
    `DTSTART;TZID=Asia/Seoul:${start.begin}`,
    `DTEND;TZID=Asia/Seoul:${start.end}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    `CREATED:${stamp}`,
    `LAST-MODIFIED:${stamp}`,
    `DTSTAMP:${stamp}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// 네이버 캘린더에 일정 1건 추가
export async function createSchedule(accessToken, ical) {
  const body = new URLSearchParams({
    calendarId: "defaultCalendarId",
    scheduleIcalString: ical,
  });
  const res = await fetch("https://openapi.naver.com/calendar/createSchedule.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  if (!res.ok) {
    throw new Error(`캘린더 API 오류 ${res.status}: ${text.slice(0, 200)}`);
  }
  return json || { raw: text };
}
