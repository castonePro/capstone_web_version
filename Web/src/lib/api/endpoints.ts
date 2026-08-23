/**
 * 백엔드 컨트롤러 전체를 그대로 옮긴 API 모듈.
 * 각 함수 주석의 경로는 Backend의 @RequestMapping/@GetMapping 등과 1:1로 대응한다.
 * Flutter의 features/(각 도메인)/repository/*.dart 를 대체한다.
 */
import { api } from "./client";
import type {
  AppNotification,
  BidApplication,
  ChatMessage,
  ChatRoom,
  Companion,
  CompanionApplication,
  CompanionChatMessage,
  CompanionCreateRequest,
  CompanionReview,
  CompanionSummary,
  ConfirmCodeResponse,
  GuideConversionApplication,
  GuideConversionStatus,
  GuideProduct,
  GuideProductRequest,
  GuideReview,
  GuideReviewSummary,
  GuiderRegisterRequest,
  GuiderRegisterResponse,
  Itinerary,
  LoginSuccessResponse,
  MeResponse,
  Payment,
  PlannerResponse,
  ReceivedReviewList,
  Report,
  ReportReason,
  ReviewableMember,
  SendCodeResponse,
  SignUpResponse,
  TravelPlace,
  TravelPlaceDetail,
  UserBid,
} from "./types";

/* ────────────────────────── auth · user ────────────────────────── */

export const authApi = {
  /** POST /api/v1/auth/login */
  login: (email: string, password: string) =>
    api.post<LoginSuccessResponse>("/api/v1/auth/login", { email, password }, { skipAuth: true }),

  /** POST /api/v1/auth/signup */
  signup: (email: string, password: string, nickname: string) =>
    api.post<SignUpResponse>(
      "/api/v1/auth/signup",
      { email, password, nickname },
      { skipAuth: true },
    ),
};

export const userApi = {
  /** GET /api/v1/users/me */
  me: () => api.get<MeResponse>("/api/v1/users/me"),

  /** GET /api/v1/users/me/companion-summary */
  companionSummary: () => api.get<CompanionSummary>("/api/v1/users/me/companion-summary"),
};

/* ────────────────────────── verification ────────────────────────── */

export const verificationApi = {
  /** POST /api/v1/verification/phone/send */
  sendCode: (phoneNumber: string) =>
    api.post<SendCodeResponse>("/api/v1/verification/phone/send", { phoneNumber }),

  /** POST /api/v1/verification/phone/confirm */
  confirmCode: (payload: {
    verificationId: string;
    code: string;
    phoneNumber: string;
    birthYear: number;
    gender: string;
  }) => api.post<ConfirmCodeResponse>("/api/v1/verification/phone/confirm", payload),
};

/* ────────────────────────── places ────────────────────────── */

export const placeApi = {
  /**
   * GET /api/v1/places/recommend?category=&lang=
   * lang을 넘기면 백엔드가 travel_place_translations에서 해당 언어의 제목·주소·설명을 채워 준다.
   * (없으면 한국어 원문으로 폴백)
   */
  recommend: (category: string, lang?: string) =>
    api.get<TravelPlace[]>("/api/v1/places/recommend", {
      query: { category, lang },
      skipAuth: true,
    }),

  /** GET /api/v1/places/popular?lang= */
  popular: (lang?: string) =>
    api.get<TravelPlace[]>("/api/v1/places/popular", { query: { lang }, skipAuth: true }),

  /** GET /api/v1/places/{placeId}?lang= */
  detail: (placeId: number | string, lang?: string) =>
    api.get<TravelPlaceDetail>(`/api/v1/places/${placeId}`, { query: { lang }, skipAuth: true }),
};

/** 홈 화면 카테고리 (백엔드 TravelPlaceController 주석의 cat1 값 그대로) */
export const PLACE_CATEGORIES = [
  "인문(문화/예술/역사)",
  "자연",
  "음식",
  "쇼핑",
  "레포츠",
  "숙박",
  "추천코스",
] as const;

/* ────────────────────────── planner ────────────────────────── */

export const plannerApi = {
  /**
   * POST /api/v1/planner/generate — 인증 없이 호출 가능(SecurityConfig permitAll)
   *
   * lang: 생성 결과(제목·설명)를 어떤 언어로 받을지. 장소 검색 자체는
   * multilingual-e5 임베딩이라 한국어 원문 벡터를 교차언어로 찾아낸다.
   */
  generate: (prompt: string, categories: string[], lang?: string) =>
    api.post<PlannerResponse>(
      "/api/v1/planner/generate",
      { prompt, categories, lang },
      { timeoutMs: 180_000 }, // RAG + GPT 생성이라 넉넉히
    ),

  /** POST /api/v1/planner/save → 저장된 itineraryId */
  save: (data: unknown) => api.post<number>("/api/v1/planner/save", { status: "success", data }),

  /** GET /api/v1/planner/itineraries */
  list: () => api.get<Itinerary[]>("/api/v1/planner/itineraries"),

  /** GET /api/v1/planner/itineraries/{id} */
  detail: (itineraryId: number | string) =>
    api.get<Itinerary>(`/api/v1/planner/itineraries/${itineraryId}`),

  /** DELETE /api/v1/planner/itineraries/{id} */
  remove: (itineraryId: number | string) =>
    api.delete<void>(`/api/v1/planner/itineraries/${itineraryId}`),
};

/* ────────────────────────── companions ────────────────────────── */

export const companionApi = {
  /** POST /api/v1/companions */
  create: (body: CompanionCreateRequest) => api.post<Companion>("/api/v1/companions", body),

  /** GET /api/v1/companions — 탐색 */
  explore: () => api.get<Companion[]>("/api/v1/companions"),

  /** GET /api/v1/companions/{id} */
  detail: (companionId: string) => api.get<Companion>(`/api/v1/companions/${companionId}`),

  /** GET /api/v1/companions/my/hosting */
  myHosting: () => api.get<Companion[]>("/api/v1/companions/my/hosting"),

  /** GET /api/v1/companions/my/joined */
  myJoined: () => api.get<Companion[]>("/api/v1/companions/my/joined"),

  /** PATCH /api/v1/companions/{id}/close */
  close: (companionId: string) => api.patch<Companion>(`/api/v1/companions/${companionId}/close`),

  /** PATCH /api/v1/companions/{id}/decision */
  decide: (
    companionId: string,
    decision: "CONTINUE" | "POSTPONE" | "CANCEL",
    newStartDate?: string,
    newEndDate?: string,
  ) =>
    api.patch<Companion>(`/api/v1/companions/${companionId}/decision`, {
      decision,
      ...(newStartDate ? { newStartDate } : {}),
      ...(newEndDate ? { newEndDate } : {}),
    }),

  /** PATCH /api/v1/companions/{id}/start */
  start: (companionId: string) => api.patch<Companion>(`/api/v1/companions/${companionId}/start`),

  /** PATCH /api/v1/companions/{id}/complete */
  complete: (companionId: string) =>
    api.patch<Companion>(`/api/v1/companions/${companionId}/complete`),

  /** PATCH /api/v1/companions/{id}/cancel */
  cancel: (companionId: string) => api.patch<Companion>(`/api/v1/companions/${companionId}/cancel`),

  /** PATCH /api/v1/companions/{id}/boost — 모집글 부스트 결제 */
  boost: (companionId: string) => api.patch<unknown>(`/api/v1/companions/${companionId}/boost`),

  /** GET /api/v1/companions/{id}/applications */
  applications: (companionId: string) =>
    api.get<CompanionApplication[]>(`/api/v1/companions/${companionId}/applications`),

  /** POST /api/v1/companions/{id}/applications */
  apply: (companionId: string, introduction: string) =>
    api.post<CompanionApplication>(`/api/v1/companions/${companionId}/applications`, {
      introduction,
    }),

  /** PATCH /api/v1/companions/applications/{applicationId}/approve */
  approve: (applicationId: string) =>
    api.patch<CompanionApplication>(`/api/v1/companions/applications/${applicationId}/approve`),

  /** PATCH /api/v1/companions/applications/{applicationId}/reject */
  reject: (applicationId: string) =>
    api.patch<CompanionApplication>(`/api/v1/companions/applications/${applicationId}/reject`),

  /** PATCH /api/v1/companions/applications/{applicationId}/no-show */
  markNoShow: (applicationId: string) =>
    api.patch<CompanionApplication>(`/api/v1/companions/applications/${applicationId}/no-show`),

  /** DELETE /api/v1/companions/applications/{applicationId} */
  cancelApplication: (applicationId: string) =>
    api.delete<void>(`/api/v1/companions/applications/${applicationId}`),

  /** GET /api/v1/companions/{id}/chat/messages */
  chatMessages: (companionId: string) =>
    api.get<CompanionChatMessage[]>(`/api/v1/companions/${companionId}/chat/messages`),

  /** GET /api/v1/companions/{id}/reviews/reviewable */
  reviewableMembers: (companionId: string) =>
    api.get<ReviewableMember[]>(`/api/v1/companions/${companionId}/reviews/reviewable`),

  /** GET /api/v1/companions/{id}/reviews/received */
  receivedReviews: (companionId: string) =>
    api.get<ReceivedReviewList>(`/api/v1/companions/${companionId}/reviews/received`),

  /** POST /api/v1/companions/{id}/reviews */
  submitReview: (
    companionId: string,
    payload: {
      revieweeId: string;
      rating: number;
      tags?: string[];
      comment?: string;
      operationRating?: number;
    },
  ) => api.post<CompanionReview>(`/api/v1/companions/${companionId}/reviews`, payload),
};

/* ────────────────────────── guide products ────────────────────────── */

export const guideApi = {
  /** GET /api/v1/guide/products — 게시된 상품 전체 */
  products: () => api.get<GuideProduct[]>("/api/v1/guide/products"),

  /** GET /api/v1/guide/my-products — 내 상품(미게시 포함) */
  myProducts: () => api.get<GuideProduct[]>("/api/v1/guide/my-products"),

  /** GET /api/v1/guide/my-products/published */
  myPublishedProducts: () => api.get<GuideProduct[]>("/api/v1/guide/my-products/published"),

  /** POST /api/v1/guide/products */
  create: (body: GuideProductRequest) => api.post<GuideProduct>("/api/v1/guide/products", body),

  /** PUT /api/v1/guide/products/{serviceId} */
  update: (serviceId: string, body: GuideProductRequest) =>
    api.put<GuideProduct>(`/api/v1/guide/products/${serviceId}`, body),

  /** DELETE /api/v1/guide/products/{serviceId} */
  remove: (serviceId: string) => api.delete<void>(`/api/v1/guide/products/${serviceId}`),

  /** PATCH /api/v1/guide/products/{serviceId}/publish */
  togglePublish: (serviceId: string) =>
    api.patch<GuideProduct>(`/api/v1/guide/products/${serviceId}/publish`),
};

/* ────────────────────────── guider (가이드 등록) ────────────────────────── */

export const guiderApi = {
  /** POST /api/v1/guider/{userId}/register */
  register: (userId: string, body: GuiderRegisterRequest) =>
    api.post<GuiderRegisterResponse>(`/api/v1/guider/${userId}/register`, body),
};

/* ────────────────────────── guide conversion ────────────────────────── */

export const guideConversionApi = {
  /** GET /api/v1/guide-conversion/status */
  status: () => api.get<GuideConversionStatus>("/api/v1/guide-conversion/status"),

  /** POST /api/v1/guide-conversion/apply */
  apply: (message?: string) =>
    api.post<GuideConversionApplication>("/api/v1/guide-conversion/apply", {
      ...(message ? { message } : {}),
    }),

  /** GET /api/v1/guide-conversion/applications/my */
  myApplications: () =>
    api.get<GuideConversionApplication[]>("/api/v1/guide-conversion/applications/my"),
};

/* ────────────────────────── user bids / bid applications ────────────────────────── */

export const bidApi = {
  /** POST /api/v1/user-bids — 역으로 제안하기 */
  createUserBid: (itineraryId: number) => api.post<UserBid>("/api/v1/user-bids", { itineraryId }),

  /** GET /api/v1/user-bids/guide — 가이드: 입찰 현황 전체 */
  allBids: () => api.get<UserBid[]>("/api/v1/user-bids/guide"),

  /** GET /api/v1/user-bids/my — 사용자: 내 제안 목록 */
  myBids: () => api.get<UserBid[]>("/api/v1/user-bids/my"),

  /** POST /api/v1/bid-applications — 가이드 입찰 참여 */
  applyToBid: (bidId: string) => api.post<BidApplication>("/api/v1/bid-applications", { bidId }),

  /** DELETE /api/v1/bid-applications/{bidId} — 가이드 참여 취소 */
  cancelBidApplication: (bidId: string) => api.delete<void>(`/api/v1/bid-applications/${bidId}`),

  /** GET /api/v1/bid-applications/{bidId} — 참여 가이드 목록 */
  bidApplications: (bidId: string) => api.get<BidApplication[]>(`/api/v1/bid-applications/${bidId}`),

  /** POST /api/v1/bid-applications/{applicationId}/select — 가이드 선택 → 채팅방 생성 */
  selectGuide: (applicationId: string) =>
    api.post<ChatRoom>(`/api/v1/bid-applications/${applicationId}/select`),
};

/* ────────────────────────── chat (1:1) ────────────────────────── */

export const chatApi = {
  /** GET /api/v1/chat/rooms */
  rooms: () => api.get<ChatRoom[]>("/api/v1/chat/rooms"),

  /** GET /api/v1/chat/rooms/{roomId}/messages */
  messages: (roomId: string) => api.get<ChatMessage[]>(`/api/v1/chat/rooms/${roomId}/messages`),

  /** DELETE /api/v1/chat/rooms/{roomId} — 채팅방 나가기 */
  leave: (roomId: string) => api.delete<void>(`/api/v1/chat/rooms/${roomId}`),

  /** POST /api/v1/chat/rooms/direct — 가이드에게 바로 문의 */
  createDirect: (guideId: string) =>
    api.post<ChatRoom>("/api/v1/chat/rooms/direct", { guideId }),
};

/* ────────────────────────── reviews (가이드 상품) ────────────────────────── */

export const reviewApi = {
  /** POST /api/v1/reviews */
  create: (payload: {
    guideId: string;
    serviceId?: string;
    rating: number;
    content?: string;
  }) => api.post<GuideReview>("/api/v1/reviews", payload),

  /** GET /api/v1/reviews/guide/{guideId} */
  byGuide: (guideId: string) => api.get<GuideReview[]>(`/api/v1/reviews/guide/${guideId}`),

  /** GET /api/v1/reviews/guide/{guideId}/summary */
  summary: (guideId: string) =>
    api.get<GuideReviewSummary>(`/api/v1/reviews/guide/${guideId}/summary`),
};

/* ────────────────────────── notifications ────────────────────────── */

export const notificationApi = {
  /** GET /api/v1/notifications */
  list: () => api.get<AppNotification[]>("/api/v1/notifications"),

  /** GET /api/v1/notifications/unread-count */
  unreadCount: () => api.get<number>("/api/v1/notifications/unread-count"),

  /** PATCH /api/v1/notifications/{id}/read */
  markRead: (notificationId: string) =>
    api.patch<void>(`/api/v1/notifications/${notificationId}/read`),

  /** PATCH /api/v1/notifications/read-all */
  markAllRead: () => api.patch<void>("/api/v1/notifications/read-all"),
};

/* ────────────────────────── payments ────────────────────────── */

export const paymentApi = {
  /** GET /api/v1/payments/my */
  myPayments: () => api.get<Payment[]>("/api/v1/payments/my"),

  /** POST /api/v1/payments/{paymentId}/pay — Mock PG 즉시 승인 */
  pay: (paymentId: string) => api.post<Payment>(`/api/v1/payments/${paymentId}/pay`),
};

/* ────────────────────────── reports ────────────────────────── */

export const reportApi = {
  /** POST /api/v1/reports */
  submit: (payload: {
    reportedUserId: string;
    reasonCategory: ReportReason;
    companionId?: string;
    description?: string;
  }) => api.post<Report>("/api/v1/reports", payload),

  /** GET /api/v1/reports/my */
  myReports: () => api.get<Report[]>("/api/v1/reports/my"),
};


/* ────────────────────────── translation (UGC 온디맨드 번역) ────────────────────────── */

export interface TranslateResult {
  /** 요청한 순서 그대로. 번역이 불필요하면(원문이 이미 목표 언어) 원문이 그대로 온다. */
  translations: string[];
  /** 서버가 감지한 원문 언어 (예: "ko") */
  detectedSourceLang: string | null;
}

export const translationApi = {
  /**
   * POST /api/v1/translate
   *
   * 사용자 작성 콘텐츠(동행 모집글·가이드 상품 설명·리뷰·채팅)를 화면에서 눌렀을 때만 번역한다.
   * 백엔드가 (원문 해시 + 목표 언어)로 캐시하므로 같은 글을 여러 사람이 눌러도 API 호출은 1회다.
   */
  translate: (texts: string[], targetLang: string, sourceLang?: string) =>
    api.post<TranslateResult>(
      "/api/v1/translate",
      { texts, targetLang, sourceLang },
      { timeoutMs: 30_000 },
    ),
};
