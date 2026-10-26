# 블로그 발행 일정 도우미

발행 예정 글의 제목과 일시를 입력하면 **네이버 캘린더**에 아래 일정이 한 번에 등록됩니다. (Next.js)

- 발행 일정
- 발행 1일 뒤: 검색 색인 확인
- 발행 7일 뒤: 검색 노출 확인
- 발행 14일 뒤: 성과 점검

자동으로 글을 올리는 기능은 없습니다. 일정을 알려 주는 것까지만 합니다.

## 1단계. 네이버 애플리케이션 등록 (처음 한 번)
1. https://developers.naver.com → 로그인 → **Application → 애플리케이션 등록**
2. 애플리케이션 이름: `블로그일정도우미`
3. 사용 API: **네이버 로그인**, **캘린더** 두 개 선택
4. 네이버 로그인 제공 정보 표(회원이름 등)는 체크하지 않아도 됩니다.
5. 서비스 환경: **PC 웹**
   - 서비스 URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/api/auth/callback`
6. 등록 후 **Client ID / Client Secret** 확인

개발 중 상태의 앱은 등록한 본인 계정(멤버)만 로그인할 수 있습니다. 개인용으로는 이대로 충분합니다.

## 2단계. 실행
```bash
npm install
cp .env.example .env.local     # 윈도우는 파일 이름만 .env.local 로 바꿔서 복사
# .env.local 파일을 열어 Client ID / Secret 입력
npm run dev
```
http://localhost:3000 을 열고 "네이버로 로그인" → 글 정보 입력 → "네이버 캘린더에 등록"

## 참고
- 키와 로그인 토큰은 서버에서만 다루며 브라우저 쪽 코드에는 노출되지 않습니다.
- 로그인 유지 시간은 네이버가 주는 토큰 유효 시간(보통 1시간)입니다. 만료되면 다시 로그인합니다.
- 이 앱의 캘린더 호출 방식은 제가 공식 문서를 직접 열어 확인하지 못한 부분이 있습니다. 첫 실행에서 오류가 나면 화면에 표시되는 오류 문구를 알려 주세요.

## 구조
```
app/page.js                    화면
app/api/auth/login|callback    네이버 로그인
app/api/auth/status            로그인 확인/로그아웃
app/api/schedule/route.js      일정 등록
lib/naver.js                   네이버 로그인·캘린더 호출
```
