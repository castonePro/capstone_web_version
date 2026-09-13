# TravelBusan 개발 문서 — 수정 목록 & 구글 지도 내비게이션 연동 계획

- 작성일: 2026-09-08
- 대상 저장소: `capstone_Backend` (Spring Boot) / `capstone_web_version/Web` (Next.js)
- 이 문서는 계속 수정하면서 쓰는 체크리스트입니다. 항목별로 `- [ ]` 체크박스와 "상태" 필드가 있으니, 진행하면서 표시만 바꿔도 되고, 나중에 이 파일 그대로 다시 주시면 그 내용을 기준으로 이어서 작업할 수 있습니다.
- **2026-09-08 작업 로그**: 3, 4, 5, 9번을 실제 코드로 구현/정리했고(백엔드·프론트 모두 반영, `capstone_Backend`/`capstone_web_version` 폴더에 직접 저장됨), 8번은 `travel_places` 부분만 정정했습니다. 결제(1)·본인인증(2)·FCM 웹푸시(6)는 외부 서비스 API 키/자격증명이 있어야 진행할 수 있어 보류했고, 토큰 저장 방식 변경(7)은 로그인 흐름 전체에 영향을 주는 구조 변경이라 먼저 여쭤보고 진행하려고 남겨뒀습니다. 자세한 내용은 각 항목 참고.
- **2026-09-09 작업 로그 (경로 계산 API 교체)**: 구글 Routes API가 한국 내 경로를 반환하지 못하는 문제(한국 정부의 정밀지도 데이터 반출 규제 미해결, 2026-09 기준)를 확인하고, 자동차 경로 계산을 네이버클라우드플랫폼(NCP) Maps Directions 5 API로 교체했습니다. 구글 맵은 지도 표시(마커)용으로 계속 사용합니다. 네이버 Client Secret은 브라우저에 노출되면 안 되는 키라서, 프론트가 직접 호출하지 않고 백엔드에 새 엔드포인트(`GET /api/v1/routes/drive`, `domain/route` 패키지)를 만들어 서버 대 서버로 호출하도록 구현했습니다. 네이버 Directions API는 도보 모드를 지원하지 않아서, 도보 이동은 프론트(`TripRouteMap.tsx`)에서 하버사인 공식으로 직선거리·예상시간만 추정해서 보여주고(점선으로 구분), 실제 도로 경로선은 자동차 모드에서만 그립니다. `.env.local`에서 더 이상 안 쓰는 `NEXT_PUBLIC_GOOGLE_ROUTES_API_KEY`는 정리했고, 네이버 키는 백엔드의 `application-naver.yaml`(gitignore 처리, `.example` 파일 참고)에 별도로 넣습니다. i18n에 `maps.estimated` 키 추가(6개 언어 전부 반영, 총 686개 키 동기화 확인). 이 환경에는 JDK 17이 없어서(JDK 11만 설치돼 있고 sudo 권한도 없음) 실제 그레이들 빌드로 컴파일 확인은 못 했습니다 — IntelliJ에서 빌드 한 번 돌려서 확인해 주세요.

- **2026-09-13 해결**: 네이버 Directions API가 "구독 필요"(errorCode 210) 에러로 며칠간 안 됐던 원인을 찾았습니다 — 계정/키/콘솔 설정은 전부 처음부터 정상이었고, 제가 `RouteService.java`에 넣은 엔드포인트 도메인이 레거시 주소(`naveropenapi.apigw.ntruss.com`)였던 게 문제였습니다. 공식 문서 기준 정확한 주소인 `https://maps.apigw.ntruss.com/map-direction/v1/driving`로 교체하니 바로 정상 동작 확인됨 (해운대→광안리 실제 테스트: 5.9km·약 19분, 경유지 포함 3지점 테스트도 정상). 이제 실제로 동작합니다.

---

## Part 1. 수정해야 할 부분

### 🔴 우선순위 높음 (실서비스 전환 전 필수)

#### 1. 결제 — Mock PG
- 위치: `domain/payment/service/PaymentService.java`, `MockPaymentProvider.java`, `Payment.java`
- 현재 상태: 실제 PG(포트원 등) 연동 없이 요청 즉시 승인 처리됨
- 제안: 실 PG 연동 (`PaymentProvider` 인터페이스를 구현하는 새 클래스 추가 → DI 교체만으로 전환되도록 이미 설계돼 있음)
- 상태: [ ] 미착수

#### 2. 본인인증 — Mock SMS, 인증코드 응답 노출
- 위치: `domain/verification/service/PhoneVerificationService.java`, `MockPhoneVerificationProvider.java`, `VerificationDto.java`(devCode)
- 현재 상태: 실제 SMS 발송 없이 개발용 인증코드(`devCode`)가 API 응답에 그대로 노출됨
- 제안: 실 SMS 공급자(Firebase Phone Auth, NHN Cloud 등) 연동 후 `devCode` 필드 제거
- 상태: [ ] 미착수

#### 3. 관광지(TravelPlace)에 위경도 데이터가 있지만 공개 API로는 노출되지 않음
- 위치: `domain/recommend_place/entity/TravelPlace.java`, `TravelPlaceDetailDto.java`, `TravelPlaceService.getPlaceDetail()` (여기엔 없음) / `domain/planner/service/PlannerService.java` (여기엔 실제로 씀)
- **정정**: `travel_places.location` 컬럼은 실제로 존재합니다. `PlannerService.java` 49~52번 줄에서 `p.location.SDO_POINT.X AS mapx`, `p.location.SDO_POINT.Y AS mapy`로 실제 조회하고 있는 걸 코드에서 직접 확인했습니다 (Oracle Spatial `SDO_GEOMETRY` 타입). `DB_SCHEMA.md`가 이 컬럼을 PostgreSQL `POINT` 타입으로 설명한 건 Oracle 마이그레이션 이전 버전이라 **타입 설명이 틀렸습니다** (8번 항목과 연결).
- 현재 상태: 좌표 데이터 자체는 DB에 있고 AI 플래너(`PlannerService`)가 내부적으로 이미 쓰고 있음. 다만 관광지 목록/상세를 다루는 `TravelPlaceService`·`TravelPlaceController`·`TravelPlaceDetailDto`에는 이 컬럼이 전혀 매핑돼 있지 않아서, 프론트의 관광지 상세 페이지(`places/[placeId]`)는 좌표를 받을 방법이 없음
- 왜 중요한가: Part 2(구글 지도 연동)의 선행 조건. 관광지 상세 페이지에 지도를 넣으려면 이 API 노출 작업이 먼저 필요함 (일정 상세 페이지는 `ItineraryDetail`에 이미 위경도가 있어 이 작업과 무관하게 바로 가능)
- 제안: `TravelPlace` 엔티티 또는 `TravelPlaceService`의 네이티브 SQL에 `p.location.SDO_POINT.X`, `p.location.SDO_POINT.Y`를 `mapx`/`mapy`(또는 `longitude`/`latitude`)로 추가해서 `TravelPlaceDetailDto`에 실어 응답
- **실제 DB로 확인 완료**: 사용자님이 실제 Oracle DB에서 `DESC TRAVEL_PLACES` 결과를 직접 붙여주셨고, `LOCATION SDO_GEOMETRY`가 정확히 있는 걸 확인했습니다 (`PLACE_ID NUMBER(10)`, `TITLE/ADDR1 VARCHAR2(255)`, `FIRST_IMAGE/FIRST_IMAGE2 CLOB`, `CAT1~3 VARCHAR2(50)`, `LOCATION SDO_GEOMETRY`). 코드로 추론했던 내용과 정확히 일치했습니다.
- 상태: [x] **완료** — `TravelPlaceService.getPlaceDetail()`의 네이티브 SQL에 `tp.location.SDO_POINT.X AS mapx`, `tp.location.SDO_POINT.Y AS mapy`를 추가하고 `TravelPlaceDetailDto`에 `latitude`/`longitude` 필드를 추가함. **정정**: 처음엔 "프론트 타입에 이미 선언돼 있어서 손댈 게 없다"고 적었는데 틀린 얘기였습니다 — 확인해보니 `latitude`/`longitude`는 `ItineraryDetailItem` 타입에만 있었고 `TravelPlaceDetail` 타입엔 없었어서, 지도 구현하면서 `types.ts`의 `TravelPlaceDetail`에 추가했습니다. `/recommend`, `/popular` 목록 API는 아직 좌표 미포함(엔티티 그대로 반환) — 필요해지면 별도 작업

---

### 🟡 우선순위 중간

#### 4. 프로필 수정 API 없음
- 위치: `domain/user/controller/UserController.java` (README에도 명시된 알려진 gap)
- 현재 상태: `PUT /api/v1/users/me`가 없어 프론트 `/me/edit` 페이지가 조회 전용
- 제안: 수정 가능한 필드(닉네임, 프로필 이미지 등) 정의 후 엔드포인트 추가, 프론트 폼 연결
- 상태: [x] **완료** — `User.updateProfile()` 비즈니스 메서드 + `PUT /api/v1/users/me`(`UserDto.UpdateRequest`) 추가. `/me/edit` 페이지에서 닉네임을 편집·저장할 수 있도록 프론트도 연결함(저장 후 `fetchMe()`로 갱신). 이메일/나이대/성별은 인증 시 정해지는 값이라 계속 조회 전용. 프로필 이미지는 업로드 플로우 자체가 이 코드베이스에 없어서 이번엔 손대지 않음(별도 작업 필요)

#### 5. 가이드 상품 단건 조회 API 없음
- 위치: `domain/guide/controller/GuideProductController.java`
- 현재 상태: `GET /guide/products/{id}`가 없어 프론트가 목록 전체를 받아 클라이언트에서 찾아 씀 (비효율 + 목록에 없는 상품은 조회 불가)
- 제안: 단건 조회 엔드포인트 추가
- 상태: [x] **완료** — `GET /api/v1/guide/products/{serviceId}`(게시된 상품만 반환) 추가, 프론트 `guides/[serviceId]/page.tsx`가 목록 전체를 받아 `find`하던 방식에서 단건 조회로 교체함. 가이드 본인의 상품 수정 화면(`guide/products/[serviceId]/edit`)은 미게시 상품도 봐야 해서 `myProducts()` 워크어라운드를 그대로 둠(의도적)

#### 6. FCM 웹 푸시 미구현
- 위치: 프론트 전역 (Service Worker 없음), 백엔드 `FcmService.java`는 앱용으로만 동작
- 현재 상태: 인앱 알림만 60초 폴링으로 동작, 브라우저 푸시 없음
- 제안: Firebase 웹 설정 + Service Worker(`firebase-messaging-sw.js`) 추가
- 상태: [ ] 미착수

#### 7. 인증 토큰을 localStorage에 저장 (XSS 노출 위험)
- 위치: `lib/api/client.ts`의 `AuthStorage`
- 현재 상태: README에도 "운영 전환 시 HttpOnly 쿠키로 바꾸는 게 안전"이라고 명시돼 있음
- 제안: 백엔드가 HttpOnly 쿠키로 토큰을 내려주는 방식으로 전환, `AuthStorage`만 교체
- 상태: [ ] 미착수

---

### 🟢 우선순위 낮음 (정리/문서/품질)

#### 8. `DB_SCHEMA.md` 문서가 실제 DB(Oracle)와 불일치
- 위치: `capstone_web_version/DB_SCHEMA.md`
- 현재 상태: 문서는 PostgreSQL + pgvector 기준으로 작성됨. 실제로는 `2fff568`→`0b4b4b2` 커밋에서 Oracle로 이미 마이그레이션 완료 (`application-docker.yaml`의 `OracleDialect`, `ojdbc11` 확인됨)
- **구체적 오류 사례 (실제 코드로 확인)**: 문서 173~188번 줄은 `travel_places.location`을 PostgreSQL `POINT` 타입(`location[0]`/`[1]` 배열 접근)으로 설명하지만, 실제 `PlannerService.java`(49~52번 줄)는 `p.location.SDO_POINT.X`/`.Y`로 조회함 — Oracle Spatial `SDO_GEOMETRY` 타입. `travel_vectors`(pgvector `VECTOR(768)`, `<=>` 연산자)도 Oracle에는 그대로 없는 타입이라 실제로는 다른 방식(Oracle 23ai VECTOR 타입 또는 외부 벡터 스토어)일 가능성이 높음 — 확인 필요
- 제안: Oracle 기준으로 DDL/타입 재작성 (`SDO_GEOMETRY` 사용법, UUID 처리 방식, 벡터 검색 대체 방안 포함)
- 상태: [x] **부분 완료** — `travel_places` 섹션은 실제 Oracle DDL(`SDO_GEOMETRY`)로 다시 쓰고, PostgreSQL 버전은 `<details>` 접이문으로 기록용으로 남김. `travel_vectors`(pgvector) 섹션은 Oracle에서 실제로 어떻게 바뀌었는지 코드로 확인이 안 돼서 경고 문구만 추가함 — 여기는 여전히 미해결 (12번 항목과 연결)

#### 9. `AiController`의 미인증/미사용 엔드포인트 정리
- 위치: `domain/ai/controller/AiController.java` — `GET /api/v1/planner/generate`
- 현재 상태: 인증도 에러 처리도 없는 데모용 엔드포인트로 보임. 실제로 쓰이는 건 `PlannerController`의 `POST /api/v1/planner/generate`이며, 경로가 겹쳐 혼동 소지가 있음
- 제안: 삭제하거나, 계속 쓸 거면 인증/에러처리 추가하고 경로를 분리
- 상태: [x] **완료(임시 조치)** — 다른 곳에서 참조하는 곳이 없는 걸 확인하고 내용을 비웠습니다. 다만 이 작업 환경(컴퓨터 파일 접근)에 삭제 권한이 없어서 파일 자체를 지우지는 못했고, 안내 주석만 남긴 빈 파일로 남아 있습니다 — 편하실 때 `AiController.java` 파일을 직접 지워주시면 완전히 정리됩니다

#### 10. 테스트 커버리지 부족
- 위치: `src/test/java` 전체 (파일 6개뿐)
- 제안: 결제/인증/AI 플래너 등 핵심 도메인부터 단위 테스트 추가
- 상태: [ ] 미착수

#### 11. 패키지명 오타
- 위치: `domain/bidapplication/entitiy/`, `domain/notification/entitiy/` (두 곳 모두 `entity`가 아닌 `entitiy`로 오타, 다른 도메인은 `entity`로 일관됨)
- 제안: 패키지명 통일 (리팩터링 시 import 전체 수정 필요하므로 별도 커밋으로 진행 권장)
- 상태: [ ] 미착수

#### 12. AI 플래너의 임베딩 서버가 외부 의존성으로 문서화되지 않음
- 위치: `application-docker.yaml`의 `embedding.server.url` (기본값 `http://localhost:8000`)
- 현재 상태: RAG 검색에 쓰이는 임베딩 서버가 이 두 저장소 밖에 있는 별도 서비스로 추정되나 README 등에 설명이 없음
- 제안: 임베딩 서버 저장소/실행 방법을 README에 문서화하거나, 없다면 현재 AI 플래너가 임베딩 없이 어떻게 동작하는지 확인 필요
- 상태: [ ] 미착수

---

## Part 2. 구글 지도 내비게이션 기능 연동 계획

### 먼저 알아둘 것

구글은 **웹용 턴바이턴 내비게이션 SDK를 따로 제공하지 않습니다.** ("Navigation SDK"는 Android/iOS 전용) 웹에서는 ①지도 렌더링(Maps JavaScript API) + ②경로 계산(Routes API) + ③브라우저 위치추적(Geolocation API)을 조합해서 내비게이션 UI를 직접 만들어야 합니다. 아래 단계는 이 세 가지를 단계적으로 쌓아가는 순서입니다.

또한 Google Maps Platform은 더 이상 통합 $200 크레딧이 아니라, API별로 월 1만 회 정도의 무료 호출 한도를 주는 방식으로 바뀌었습니다 (Step 9 참고). 미리 알고 시작하는 게 좋습니다.

기능을 3단계로 나눠서 구현하는 걸 권장합니다: **① 지도에 위치 표시 → ② 일정 경로/소요시간 표시 → ③ 실시간 내 위치 추적 내비게이션.** 한 번에 다 하려 하지 말고 순서대로 붙이는 게 디버깅이 쉽습니다.

---

### Step 1. 백엔드 데이터 준비 (선행 필수) — ✅ 완료 (2026-09-08)

Part 1의 3번 항목과 동일합니다. 좌표 없이는 지도를 그릴 수 없으므로 가장 먼저 처리해야 합니다.

- 컬럼은 이미 있습니다 — `PlannerService.java`가 `travel_places.location`(Oracle `SDO_GEOMETRY`)을 `p.location.SDO_POINT.X`/`.Y`로 실제로 조회하고 있는 걸 코드로 확인했습니다. 새로 만들 필요 없이 **같은 방식으로 `TravelPlaceService`에도 노출**하면 됩니다
- `TravelPlaceService.getPlaceDetail()`의 네이티브 SQL에 `tp.location.SDO_POINT.X AS mapx, tp.location.SDO_POINT.Y AS mapy` 추가
- `TravelPlaceDetailDto`에 `latitude`/`longitude`(또는 `mapx`/`mapy`) 필드 추가, `TravelPlaceService`에서 값 채워서 리턴
- 목록 API(`getRecommendByCategory`, `getPopularPlaces`)에서도 지도에 여러 장소를 한 번에 찍고 싶으면 같은 방식으로 좌표 추가 필요
- `ItineraryDetail`(일정 상세)은 이미 `latitude`/`longitude` 필드를 갖고 있으므로 **일정 경로 지도는 이 작업 없이 바로 시작 가능** — 관광지 상세 페이지 지도가 이 작업의 대상

### Step 2. Google Cloud 프로젝트 설정

1. [Google Cloud Console](https://console.cloud.google.com)에서 프로젝트 생성 (또는 기존 프로젝트 사용)
2. 결제 계정 연결 — API 활성화 자체는 무료지만 대부분의 지도 API는 결제 계정 연결이 필수
3. API 라이브러리에서 아래 API들 활성화
   - **Maps JavaScript API** — 지도 렌더링
   - **Routes API** — 경로 계산 (구글이 레거시가 된 Directions API 대신 신규 프로젝트에 권장하는 API)
   - **Places API (New)** — 장소 검색/자동완성이 필요하면 (선택)
   - **Geocoding API** — 주소 ↔ 좌표 변환이 필요하면 (선택, `addr1` 주소 데이터를 좌표로 바꿔야 한다면 여기서 활용 가능)
4. 결제 > 예산 및 알림에서 월 예산 알림 설정 (비용 급증 방지)

### Step 3. API 키 발급 및 제한

1. API 및 서비스 > 사용자 인증 정보 > API 키 만들기
2. **키를 용도별로 2개 이상 분리 발급** 하는 걸 권장:
   - 브라우저(프론트엔드)용 키: **HTTP 리퍼러 제한**을 걸어서 `localhost:3000/*`, 배포 도메인/* 만 허용
   - 서버(백엔드)용 키 (Routes API를 서버에서 호출할 경우): **IP 주소 제한**
3. 각 키마다 "API 제한"에서 실제 쓰는 API만 체크 (전체 허용 금지)
4. 발급받은 키는 절대 git에 커밋하지 않기
   - 백엔드는 이미 `application-ai.yaml.example` 같은 `.example` 패턴을 쓰고 있으니, `application-maps.yaml.example`을 같은 방식으로 추가
   - 프론트는 `.env.local.example`에 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=` 항목 추가 (브라우저에 노출되는 키이므로 반드시 리퍼러 제한 필수)

### Step 4. 프론트엔드 라이브러리 설치 — ✅ 완료 (2026-09-08)

`package.json`에 `@vis.gl/react-google-maps` 의존성을 추가해뒀습니다. 로컬에서 `npm install` 한 번 돌리면(또는 다음에 어차피 `npm install` 하실 때 같이) 받아집니다 — 이 작업 환경에선 `npm install`을 직접 실행하지 않았습니다(node_modules가 아예 없는 상태라 전체 설치라 오래 걸리고, 사용자님 동의 없이 큰 다운로드를 시작하고 싶지 않았습니다).

```bash
cd Web
npm install
```

구글이 공식으로 유지하는 React 컴포넌트/훅 라이브러리입니다 (`APIProvider`, `Map`, `Marker`, `useMap` 등 제공). Next.js 15 / React 19와 함께 쓸 수 있습니다.

### Step 5. 1단계 — 지도에 위치 표시 — ✅ 완료 (2026-09-08)

- `src/components/maps/PlaceLocationMap.tsx` (신규): 좌표 하나를 정적으로 보여주는 지도. `places/[placeId]/page.tsx`에 연결함
- `src/components/maps/TripRouteMap.tsx` (신규): 하루 코스의 장소들을 순서대로(1, 2, 3…) 마커로 표시. `trips/[id]/page.tsx`에 연결함(활성 Day가 바뀌면 지도도 그 날의 코스로 갱신됨)
- 두 컴포넌트 모두 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`가 비어있으면 에러로 죽는 대신 "API 키가 필요합니다" 안내만 보여주도록 만들어서, 키가 아직 없어도 나머지 화면은 정상 동작합니다
- `types.ts`의 `TravelPlaceDetail`에 `latitude`/`longitude`를 추가함(Part 1 3번 항목에서 실수로 "이미 있다"고 잘못 적었던 부분 — 지도 만들면서 발견하고 고쳤습니다)

```tsx
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

<APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
  <Map defaultCenter={{ lat, lng }} defaultZoom={14}>
    <Marker position={{ lat, lng }} />
  </Map>
</APIProvider>
```

(계획 초안에는 `mapId`를 넣었었는데, 실제로는 뺐습니다 — `mapId`는 Cloud Console에서 별도로 만든 지도 스타일을 쓸 때나 Advanced Marker를 쓸 때 필요한데, 이번엔 숫자 라벨이 붙는 기본 `Marker`만 써서 필요 없었습니다.)

### Step 6. 2단계 — 경로 계산 및 표시 — ✅ 완료 (2026-09-08)

- 일정(`itinerary.details`)을 `sortOrder`/`dayNumber` 순으로 정렬해 Routes API의 `waypoints`로 전달
- Routes API `computeRoutes` 호출 (이동수단은 사용자가 도보/자동차/대중교통 중 고르게 UI 제공 권장)
- 프론트에서 직접 호출할지, 백엔드에 프록시 엔드포인트(`PlannerController`에 `/api/v1/planner/route` 같은 걸 추가)를 둘지 결정 — API 키를 서버에 숨기고 싶다면 프록시 권장
- 응답의 인코딩된 polyline을 지도 위에 `Polyline`으로 렌더링, 총 거리/소요시간을 화면에 표시

**실제 구현**: `TripRouteMap.tsx` 안의 `RouteController`가 이 역할을 합니다. 코스가 2곳 이상이면 프론트에서 직접 Routes API(`routes.googleapis.com/directions/v2:computeRoutes`)를 호출하고(위에서 결정 못 내렸던 "프론트 직접 호출 vs 백엔드 프록시" 중 **직접 호출**로 선택 — 우선 빠르게 동작하는 걸 만드는 게 목적이라, 비용 통제가 중요해지면 나중에 프록시로 옮기면 됩니다), 도보/자동차 토글(`Chip`)을 제공하고, 받은 폴리라인을 `google.maps.geometry.encoding.decodePath`로 디코드해서 지도 위에 빨간 선으로 그리고, 총 거리(km/m)·소요시간을 지도 위쪽에 텍스트로 보여줍니다. **아직 API 키가 없어서 실제로 지도가 뜨는지, Routes API 응답이 예상한 형식과 맞는지는 확인 못 했습니다** — 키를 넣고 브라우저에서 한 번 열어보시는 게 필요합니다.

### Step 7. 3단계 — 실시간 위치 & 내비게이션 UI

- 브라우저 `navigator.geolocation.watchPosition()`으로 실시간 좌표 추적 (HTTPS 환경 필수, 위치 권한 요청 UX 및 거부 시 폴백 처리 필요)
- 현재 위치를 지도에 별도 마커로 표시, "따라가기(팔로우 카메라)" 모드 옵션 제공
- 다음 목적지까지 남은 거리/도착예정시간 계산 — 매번 Routes API를 재호출하면 비용이 크게 늘어나니, 짧은 구간은 haversine 근사 계산으로 처리하고 경로 이탈 시에만 재계산하는 방식 권장
- Routes API 응답의 구간별 안내 문구(`navigationInstruction`)를 리스트 UI로 보여주고, 필요하면 브라우저 `SpeechSynthesis` API로 음성 안내 추가

### Step 8. 백엔드 연동 마무리

- `PlannerController`가 이미 각 `ItineraryDetail`에 위경도를 포함해 응답하므로 프론트는 별도 API 추가 없이 바로 지도에 쓸 수 있음
- (선택) Routes API 호출을 서버 프록시로 옮기면: API 키를 브라우저에 노출하지 않아도 되고, 서버에서 호출량을 로깅/제한해 비용 통제가 쉬워짐

### Step 9. 비용/보안 관리

- 2026년 기준 무료 사용량(월간, API별): Maps JavaScript API 동적 로드 1만 회, Routes API의 Compute Routes(Essentials) 1만 회, Places API(New) Autocomplete/Geocoding 각 1만 회 — 이후는 종량 과금
- API 및 서비스 > 할당량에서 일일/분당 호출 한도를 설정해 예상치 못한 폭주 방지
- 결제 > 예산 알림으로 월 비용 임계치 초과 시 이메일 알림
- 브라우저 노출 키는 반드시 리퍼러 제한, 서버 키는 IP 제한 — Step 3에서 이미 설정했는지 다시 확인

### Step 10. 테스트 & 배포

- 실제 모바일 브라우저(GPS 정확도 낮은 실내/지하 환경 포함)에서 위치 추적 테스트
- 위치 권한 거부 시 대체 UI(수동으로 출발지 검색 등) 준비
- 다국어 6개 언어(`messages/*.json`)에 지도/내비게이션 관련 문구 추가 후 `npm run i18n:check`
- 배포 도메인을 브라우저 키의 HTTP 리퍼러 허용 목록에 추가
- CSP/보안 헤더를 쓰고 있다면 `maps.googleapis.com`, `maps.gstatic.com`을 `script-src`/`img-src`에 허용 목록으로 추가

---

## 참고 자료

- [Set up the Maps JavaScript API — Google for Developers](https://developers.google.com/maps/documentation/javascript/get-api-key)
- [@vis.gl/react-google-maps — npm](https://www.npmjs.com/package/@vis.gl/react-google-maps)
- [Why migrate to Routes API? — Google for Developers](https://developers.google.com/maps/documentation/routes/migrate-routes-why)
- [Directions API (Legacy) overview — Google for Developers](https://developers.google.com/maps/documentation/directions/overview)
- [Google Maps Platform Pricing — Google for Developers](https://developers.google.com/maps/billing-and-pricing/pricing)
