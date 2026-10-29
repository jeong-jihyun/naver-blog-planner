"use client";

import { useEffect, useState } from "react";

const CHECK_OPTIONS = [
  { key: "index", label: "발행 1일 뒤 · 검색 색인 확인" },
  { key: "exposure", label: "발행 7일 뒤 · 검색 노출 확인" },
  { key: "review", label: "발행 14일 뒤 · 성과 점검" },
];

function fmt(ical) {
  // 20261030T100000 → 2026-10-30 10:00
  return `${ical.slice(0, 4)}-${ical.slice(4, 6)}-${ical.slice(6, 8)} ${ical.slice(9, 11)}:${ical.slice(11, 13)}`;
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [blog, setBlog] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [checks, setChecks] = useState(["index", "exposure", "review"]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("error");
    if (q) setError(q);
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((j) => setLoggedIn(j.loggedIn))
      .catch(() => setLoggedIn(false));
  }, []);

  function toggle(k) {
    setChecks((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, blog, publishAt, checks }),
      });
      const json = await res.json();
      if (res.status === 401) {
        setLoggedIn(false);
        throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
      }
      if (!json.results) throw new Error(json.error || "오류가 발생했습니다.");
      setResults(json.results);
      if (!res.ok) setError("일정을 하나도 등록하지 못했습니다. 아래 오류 내용을 확인하세요.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const [rt, setRt] = useState("");
  async function showKey() {
    const r = await fetch("/api/auth/refresh");
    const j = await r.json();
    if (j.refreshToken) setRt(j.refreshToken);
    else setError(j.error || "열쇠를 가져오지 못했습니다.");
  }

  async function logout() {
    await fetch("/api/auth/status", { method: "DELETE" });
    setLoggedIn(false);
    setResults(null);
  }

  return (
    <div className="wrap">
      <h1>블로그 발행 일정 도우미</h1>
      <p className="desc">
        발행 예정 글을 입력하면 네이버 캘린더에 발행 일정과 발행 후 확인 일정이 한 번에 등록됩니다.
      </p>

      {error && <div className="error">{error}</div>}

      {loggedIn === null && <div className="card">확인 중...</div>}

      {loggedIn === false && (
        <div className="card">
          <p style={{ marginTop: 0 }}>먼저 네이버 계정으로 로그인해 주세요. 캘린더에 일정을 넣을 권한을 요청합니다.</p>
          <a className="login" href="/api/auth/login">네이버로 로그인</a>
        </div>
      )}

      {loggedIn && (
        <form className="card" onSubmit={submit}>
          <div className="top">
            <span className="ok">로그인됨</span>
            <button type="button" className="link" onClick={logout}>로그아웃</button>
          </div>

          <label>글 제목</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                 placeholder="예: 『투명한 나선』 리뷰" required />

          <label>블로그 (선택)</label>
          <input type="text" value={blog} onChange={(e) => setBlog(e.target.value)}
                 placeholder="예: 책 리뷰 블로그" />

          <label>발행 일시 (한국 시간)</label>
          <input type="datetime-local" value={publishAt}
                 onChange={(e) => setPublishAt(e.target.value)} required />

          <label>발행 후 확인 일정</label>
          <div className="checks">
            {CHECK_OPTIONS.map((o) => (
              <label key={o.key}>
                <input type="checkbox" checked={checks.includes(o.key)} onChange={() => toggle(o.key)} />
                {o.label}
              </label>
            ))}
          </div>
          <p className="hint">각 일정은 같은 시각에 30분짜리로 등록됩니다.</p>

          <button className="main" disabled={loading}>
            {loading ? "등록 중..." : "네이버 캘린더에 등록"}
          </button>

          <button type="button" className="link" onClick={showKey}>Claude 연동 열쇠 보기 (로그인 후 10분 안)</button>
          {rt && (
            <p className="hint" style={{ wordBreak: "break-all" }}>
              이 값은 비밀번호와 같습니다. Vercel 환경변수 NAVER_REFRESH_TOKEN 에만 넣고, 다른 곳에는 붙여넣지 마세요.<br />
              <strong>{rt}</strong>
            </p>
          )}

          {results && (
            <ul className="result">
              {results.map((r) => (
                <li key={r.name}>
                  {r.ok ? (
                    <><span className="ok">등록 완료</span> · {r.name} · {fmt(r.when)}</>
                  ) : (
                    <><span className="ng">실패</span> · {r.name}<br />{r.error}</>
                  )}
                </li>
              ))}
            </ul>
          )}
        </form>
      )}
    </div>
  );
}
