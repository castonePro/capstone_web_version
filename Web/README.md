# Travel Busan — Web

Flutter 모바일 앱(`Flutter/`)을 **Next.js 웹앱**으로 재작성한 프론트엔드다. 백엔드(`Backend/`, Spring Boot)는 그대로 쓴다.

- **Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4**
- **다국어 6종** — 한국어 · English · 日本語 · 简体中文 · Tiếng Việt · Bahasa Indonesia (next-intl)
- **반응형** — `lg`(1024px) 이상은 좌측 사이드바 + 넓은 콘텐츠, 미만은 앱과 동일한 하단 탭바
- 디자인 토큰은 Flutter의 `config/sunset_theme.dart` · `config/palette.dart` 값을 그대로 옮겼다

---

## 1. 실행

```bash
cd Web
cp .env.local.example .env.local     # NEXT_PUBLIC_API_BASE_URL 확인
npm install
npm run dev                          # http://localhost:3000
```

백엔드가 함께 떠 있어야 한다.

```bash
cd ../Backend && ./gradlew bootRun   # http://localhost:8080
```

빌드 · 타입 검사 · 번역 키 점검:

```bash
npm run build
npm run typecheck
npm run i18n:check    # 6개 언어 파일의 키가 어긋나지 않았는지 확인
```

---

## 2. 백엔드에 필요한 변경 (필수)

브라우저는 다른 오리진의 API를 호출할 때 **CORS**를 요구한다. 모바일 앱에는 없던 제약이라 백엔드에 설정을 추가했다. **기존 모바일 앱 동작에는 영향이 없다** — CORS는 브라우저에만 적용되는 규칙이다.

| 파일 | 변경 |
|---|---|
| `global/config/CorsConfig.java` | **신규** — 허용 오리진·메서드·헤더 정의 |
| `global/config/SecurityConfig.java` | `.cors(...)` 한 줄 + `OPTIONS /**` permitAll 추가 (나머지 규칙 그대로) |
| `src/main/resources/application.yaml` | `app.cors.allowed-origins` 추가 |

`WebSocketConfig`는 이미 `setAllowedOriginPatterns("*")` + SockJS라 **수정하지 않았다**. 그대로 웹에서 붙는다.

배포 시 `application.yaml`의 허용 오리진에 실제 웹 도메인을 추가할 것:

```yaml
app:
  cors:
    allowed-origins: http://localhost:3000,https://travelbusan.example.com
```

---

## 3. 구조

```
src/
  app/
    layout.tsx                 루트 레이아웃 (통과용)
    [locale]/layout.tsx        <html>/<body> + NextIntlClientProvider + AuthProvider
    [locale]/page.tsx          스플래시 — 토큰 유무로 /home | /login 분기
    [locale]/login/  signup/   인증 화면 (셸 밖)
    [locale]/(app)/            로그인 필요한 모든 화면 (AppShell 적용)
      home/                    홈 — 퀵메뉴·인기 장소·카테고리 추천·모집중 동행
      places/  places/[placeId]        여행지 탐색 · 상세
      trips/   trips/[id]              내 여행(일정 목록) · 일정 상세 타임라인
      ai/                              AI 여행 플래너 (대화형 + 저장)
      companions/                      동행 탐색
        new/                           동행 모집글 작성
        my/                            내가 연 방 · 참여한 동행
        [id]/                          동행 상세 (방장/참여자 액션 분기)
        [id]/applicants/               신청자 승인·거절·노쇼
        [id]/chat/                     그룹 채팅 (STOMP)
        [id]/reviews/                  더블 블라인드 상호 평가
      guides/  guides/[serviceId]      가이드 상품 탐색 · 상세(리뷰·문의)
      guide/products/                  [가이드] 상품 관리
      guide/products/new/              [가이드] 상품 등록
      guide/products/[serviceId]/edit/ [가이드] 상품 수정
      guide/portfolio/                 [가이드] 포트폴리오
      guide/bids/                      [가이드] 입찰 현황
      guide/register/                  가이드 등록 (3단계)
      guide-conversion/                예비 가이드 → 정식 가이드 전환
      chat/  chat/[roomId]             1:1 채팅 목록 · 대화 (STOMP)
      notifications/                   인앱 알림
      payments/                        결제 내역 (Mock PG)
      verify-phone/                    본인 인증
      recent/                          최근 본 (브라우저 로컬)
      me/  me/edit  me/bids  me/reports  마이페이지
  components/
    layout/AppShell.tsx        반응형 셸 (사이드바 / 하단 탭바 / 알림 배지)
    layout/nav-config.ts       유저·가이드 모드 네비게이션 정의
    ui/index.tsx               Button · Card · Field · Chip · Badge · Modal 등
    layout/LocaleSwitcher.tsx  언어 전환 (현재 경로 유지)
    cards.tsx                  PlaceCard · CompanionCard · GuideProductCard · ItineraryCard
    GuideProductForm.tsx       상품 등록/수정 공용 폼
    ReportDialog.tsx           신고 모달
    TranslatableText.tsx       UGC "번역 보기" (동행글·리뷰·채팅·알림)
  lib/
    api/client.ts              fetch 래퍼 + 토큰 자동 부착 + 401 처리 (DioClient 대응)
    api/endpoints.ts           백엔드 컨트롤러 전체 매핑
    api/types.ts               백엔드 DTO 1:1 타입
    auth/AuthProvider.tsx      로그인·프로필·가이드 모드 (AuthProvider 대응)
    ws/stomp.ts                SockJS + STOMP (stomp_dart_client 대응)
    storage/recentViews.ts     최근 본 로컬 저장 (RecentViewStore 대응)
    hooks/useAsync.ts          로딩·에러·재조회 훅
    i18n/useFormat.ts          언어별 날짜·통화·나이대·상태 라벨
    utils/format.ts            언어 무관 순수 포맷터
```

---

## 3-1. 다국어 (i18n)

6개 언어를 지원한다. 언어는 **URL 경로 prefix**로 구분한다 — `/ko/companions`, `/en/companions`, `/ja/companions` …

| 코드 | 언어 | 여행지 데이터 출처 |
|---|---|---|
| `ko` | 한국어 (원문) | TourAPI 국문 |
| `en` | English | TourAPI 다국어 |
| `ja` | 日本語 | TourAPI 다국어 |
| `zh-CN` | 简体中文 | TourAPI 다국어 |
| `vi` | Tiếng Việt | 기계 번역 |
| `id` | Bahasa Indonesia | 기계 번역 |

### 구조

```
messages/                 언어별 번역 파일 (674개 키 × 6)
  ko.json                 ← 원본. 문구를 바꿀 때는 항상 여기부터
  en.json ja.json zh-CN.json vi.json id.json
src/i18n/
  routing.ts              지원 언어·기본 언어·prefix 정책
  navigation.ts           언어 prefix를 자동으로 붙이는 Link / useRouter / usePathname
  request.ts              요청별 메시지 로딩
src/middleware.ts         브라우저 언어 감지 → 첫 방문 시 자동 리다이렉트
src/lib/i18n/useFormat.ts 날짜·통화·나이대·상태 라벨을 언어에 맞게
scripts/i18n-check.mjs    키 누락·잉여 점검 (npm run i18n:check)
```

### 규칙 세 가지

1. **`next/link` 대신 `@/i18n/navigation`의 `Link`를 쓴다.** `useRouter`·`usePathname`도 마찬가지. 그래야 언어 prefix가 자동으로 붙는다. (`useSearchParams`는 `next/navigation` 그대로)
2. **하드코딩 문구 금지.** `useTranslations("네임스페이스")`로 꺼내 쓴다. 새 문구는 `messages/ko.json`에 먼저 넣고 나머지 5개에 채운다.
3. **날짜·금액·상태 라벨은 `useFormat()`을 쓴다.** `f.date()`, `f.price()`, `f.period()`, `f.companionStatus()` 등이 현재 언어에 맞춰 나온다. `Intl` API를 쓰므로 언어별 관습(`8월 22일` vs `Aug 22` vs `8月22日`)이 자동으로 적용된다.

### 번역이 걸리는 네 지점

| 대상 | 방법 |
|---|---|
| UI 문구 | `messages/*.json` (674개 키) |
| 서버 에러 | 백엔드가 `code`를 내려주면 `messages/*.json`의 `errors.<code>`로 번역. 코드가 없으면 서버 문구 그대로 |
| 여행지 데이터 | 백엔드 `travel_place_translations` 테이블. 프론트는 `?lang=`만 붙인다 |
| 사용자 작성 글 | `<TranslatableText>` — "번역 보기"를 눌렀을 때만 `POST /api/v1/translate` 호출 |

`TranslatableText`는 동행 모집글·가이드 상품 설명·리뷰·채팅 메시지·알림 본문에 붙어 있다. 채팅이 특히 중요한데, 외국인 여행자와 한국 가이드가 각자 모국어로 쓰고 읽을 수 있게 해 준다.

### 언어 추가하기

1. `src/i18n/routing.ts`의 `locales`·`localeNames`·`localeTags`에 추가
2. `messages/<code>.json` 생성 (`ko.json` 복사 후 번역)
3. `src/lib/api/client.ts`의 `SUPPORTED`·`BCP47`에 추가
4. 백엔드 `MessageConfig.SUPPORTED_LOCALES` + `messages_<code>.properties` 추가
5. `npm run i18n:check`

---

## 4. Flutter → Web 대응표

| Flutter | Web |
|---|---|
| `DioClient` (인터셉터로 토큰 부착, 401 시 토큰 삭제) | `lib/api/client.ts` — 동일 동작 |
| `AuthStorage` (flutter_secure_storage) | `AuthStorage` (localStorage) — 아래 보안 주의 참고 |
| `AuthProvider` (provider 패키지) | `lib/auth/AuthProvider.tsx` (React Context) |
| `features/*/repository/*.dart` | `lib/api/endpoints.ts` 하나로 통합 |
| `stomp_dart_client` | `@stomp/stompjs` + `sockjs-client` |
| `RecentViewStore` | `lib/storage/recentViews.ts` |
| (없음) | `next-intl` — 6개 언어 · 경로 prefix 라우팅 |
| `MainPage` IndexedStack + BottomNav | `AppShell` (사이드바 + 하단 탭바) |
| `Palette` / `SunsetColors` | `globals.css`의 `@theme` 토큰 |
| Navigator push/pop | App Router 파일 기반 라우팅 |

### 앱과 다르게 동작하는 것

1. **토큰 저장 위치** — 브라우저에는 키체인이 없어 `localStorage`를 쓴다. XSS에 노출될 수 있으니, 운영에 올릴 때는 백엔드가 `HttpOnly` 쿠키로 토큰을 내려주는 방식으로 바꾸는 편이 안전하다. (`client.ts`의 `AuthStorage`만 교체하면 된다)
2. **FCM 푸시** — 웹 푸시는 Service Worker + Firebase 웹 설정이 따로 필요해 넣지 않았다. 인앱 알림(`/notifications`)은 그대로 동작하며, 셸이 60초마다 안 읽은 개수를 폴링한다.
3. **프로필 수정** — 백엔드에 `PUT /api/v1/users/me`가 없어 `/me/edit`은 조회 전용이다. (앱도 동일한 상태) API가 생기면 그 폼만 연결하면 된다.
4. **가이드 상품 단건 조회** — 백엔드에 `GET /guide/products/{id}`가 없어 목록에서 찾아 쓴다. 앱과 같은 방식이다.

---

## 5. STOMP 채팅

백엔드 `WebSocketConfig` 기준:

| 용도 | 구독 | 전송 |
|---|---|---|
| 1:1 채팅 | `/topic/chat/{roomId}` | `/app/chat/{roomId}` |
| 동행 그룹 채팅 | `/topic/companion-chat/{companionId}` | `/app/companion-chat/{companionId}` |

엔드포인트는 `{API_BASE_URL}/ws/chat` (SockJS). 페이로드는 `{ content, senderId }`로 앱과 동일하다.

---

## 6. 배포

```bash
npm run build
npm run start          # Node 서버 (기본 3000)
```

정적 호스팅(S3·CloudFront 등)에 올리려면 `next.config.ts`에 `output: "export"`를 추가하면 되지만, 동적 라우트(`[id]`)가 많아 Node 서버(또는 Vercel/Amplify) 방식이 편하다.

배포 후 `application.yaml`의 `app.cors.allowed-origins`에 웹 도메인을 반드시 추가할 것.
