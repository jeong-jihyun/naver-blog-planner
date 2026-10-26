import "./globals.css";

export const metadata = {
  title: "블로그 발행 일정 도우미",
  description: "발행 예정 글을 네이버 캘린더에 발행·확인 일정으로 자동 등록",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
