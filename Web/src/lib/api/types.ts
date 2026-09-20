/**
 * 백엔드 DTO(Spring Boot)와 1:1 대응하는 타입.
 * 출처: Backend/src/main/java/com/capstone/travelbusan/domain/(각 도메인)/dto/*.java
 * 필드명은 서버 JSON 그대로 유지한다(스네이크/카멜 혼용도 서버 기준을 따른다).
 */

// ─── auth (AuthDto) ───
export interface AuthData {
  user_id: string;
  access_token: string;
  nickname: string;
  is_guide: boolean;
}
export interface LoginSuccessResponse {
  status: string;
  data: AuthData;
}
export interface SignUpResponse {
  status: string;
  message: string;
}

// ─── user (UserDto.MeResponse) ───
export interface MeResponse {
  user_id: string;
  email: string;
  nickname: string;
  profile_image_url: string | null;
  is_guide: boolean;
  phone_verified: boolean;
  birth_year: number | null;
  gender: string | null;
  companion_host_count: number;
  companion_join_count: number;
  no_show_count: number;
  sanction_level: SanctionLevel;
  restricted_until: string | null;
}
export type SanctionLevel = "NONE" | "WARNED" | "RESTRICTED" | "BANNED";

// ─── companion (CompanionReviewDto.Summary) ───
export interface CompanionSummary {
  companionHostCount: number;
  companionJoinCount: number;
  averageRating: number | null;
  operationAverageRating: number | null;
  reviewCount: number;
}

// ─── places (TravelPlace / TravelPlaceDetailDto) ───
export interface TravelPlace {
  placeId: number;
  title: string | null;
  addr1: string | null;
  firstImage: string | null;
  firstImage2: string | null;
  cat1: string | null;
  cat2: string | null;
  cat3: string | null;
}
export interface TravelPlaceDetail extends TravelPlace {
  homepage: string;
  overview: string;
  latitude: number | null;
  longitude: number | null;
}

// ─── routes (RouteResponseDto — 자동차 경로 계산, 네이버클라우드 Directions API 기반) ───
export interface RouteResult {
  distanceMeters: number;
  durationSec: number;
  path: { lat: number; lng: number }[];
}

// ─── planner ───
export interface ItineraryDetailItem {
  detailId: number;
  dayNumber: number;
  startTime: string | null; // "HH:mm:ss"
  durationMinutes: number | null;
  placeName: string;
  categoryType: string[] | null;
  operatingHours: string | null;
  description: string | null;
  placeId: number | null;
  sortOrder: number;
  latitude: number | null;
  longitude: number | null;
}
export interface Itinerary {
  itineraryId: number;
  title: string;
  region: string | null;
  startDate: string | null; // "YYYY-MM-DD"
  endDate: string | null;
  details: ItineraryDetailItem[];
}

/** POST /planner/generate 응답 (PlannerResponse) */
export interface PlannerResponse {
  status: string;
  data: GeneratedPlan | string;
}
export interface GeneratedCourse {
  day_number: number;
  start_time: string; // 서버가 "HH:mm"으로 정규화해서 내려준다
  duration_minutes: number;
  /** 서버가 place_id로 DB에서 채운 값 (LLM 출력 아님) */
  place: string;
  /**
   * travel_places.place_id. 저장 시 이 값을 그대로 되돌려주면
   * 서버가 이름 재조회(동명 장소·환각에 취약) 없이 바로 연결한다.
   */
  place_id: number | null;
  latitude: number | null;
  longitude: number | null;
  category_type: string[];
  operating_hours: string | null;
  description: string;
}
export interface GeneratedPlan {
  title: string;
  region: string;
  start_date: string;
  end_date: string;
  generated_courses: GeneratedCourse[];
}

/** 한 턴이 어떻게 분류됐는지. 서버 PlannerIntent와 1:1. */
export type PlannerIntent = "NEW_PLAN" | "MODIFY" | "ASK" | "OUT_OF_SCOPE";

export interface SessionMessage {
  seq: number;
  role: "user" | "assistant";
  content: string;
  intent: PlannerIntent | null;
  createdAt: string | null;
}

/** GET /planner/sessions/{id} — 새로고침 후 대화 복구용 */
export interface SessionHistory {
  sessionId: string;
  locale: string | null;
  messages: SessionMessage[];
  /** 서버가 보관 중인 최신 일정. 과거 버전은 남기지 않는다 */
  plan: GeneratedPlan | null;
  turnCount: number;
  remainingTurns: number;
}

/** POST /planner/sessions/{id}/messages */
export interface SessionTurn {
  sessionId: string;
  intent: PlannerIntent;
  reply: string;
  plan: GeneratedPlan | null;
  /** 이번 턴에 추가·수정된 코스의 place_id. 해당 카드에 "수정됨" 표시를 붙인다 */
  changedPlaceIds: number[];
  turnCount: number;
  remainingTurns: number;
}

// ─── companions ───
export type CompanionStatus =
  | "RECRUITING"
  | "UNDER_MINIMUM"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED";

export interface Companion {
  companionId: string;
  status: CompanionStatus;
  title: string;
  minParticipants: number;
  maxParticipants: number;
  approvedCount: number;
  preferenceTags: string[] | null;
  costSharingNote: string | null;
  description: string | null;
  minAge: number | null;
  maxAge: number | null;
  snsHandle: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  itineraryId: number;
  itineraryTitle: string;
  region: string | null;
  hostId: string;
  hostNickname: string;
  hostProfileImageUrl: string | null;
  hostPhoneVerified: boolean;
  hostBirthYear: number | null;
  hostGender: string | null;
  boosted: boolean;
}

export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";

export interface CompanionApplication {
  applicationId: string;
  companionId: string;
  introduction: string | null;
  status: ApplicationStatus;
  noShow: boolean;
  createdAt: string;
  applicantId: string;
  applicantNickname: string;
  applicantProfileImageUrl: string | null;
  applicantPhoneVerified: boolean;
  applicantBirthYear: number | null;
  applicantGender: string | null;
}

export interface CompanionCreateRequest {
  itineraryId: number;
  title: string;
  minParticipants: number;
  maxParticipants: number;
  preferenceTags?: string[];
  costSharingNote?: string;
  description?: string;
  minAge?: number | null;
  maxAge?: number | null;
  snsHandle?: string;
}

export interface CompanionReview {
  reviewId: string;
  companionId: string;
  companionTitle: string;
  reviewerId: string;
  reviewerNickname: string;
  revieweeId: string;
  rating: number;
  tags: string[] | null;
  operationRating: number | null;
  comment: string | null;
  createdAt: string;
}
export interface ReviewableMember {
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  isHost: boolean;
  alreadyReviewed: boolean;
}
export interface ReceivedReviewList {
  reviews: CompanionReview[];
  pendingCount: number;
}

// ─── companion chat ───
export interface CompanionChatMessage {
  messageId: string;
  companionId: string;
  senderId: string;
  senderNickname: string;
  content: string;
  createdAt: string;
}

// ─── chat (1:1) ───
export interface ChatRoom {
  roomId: string;
  userId: string;
  userNickname: string;
  guideId: string;
  guideNickname: string;
  isClosed: boolean;
  createdAt: string;
  unreadCount: number;
  lastMessage: string | null;
}
export interface ChatMessage {
  messageId: string;
  roomId: string;
  senderId: string;
  senderNickname: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// ─── guide products ───
export interface GuideSchedule {
  startTime: string;
  endTime: string;
  title: string;
  description: string;
}
export interface GuideProduct {
  serviceId: string;
  guideName: string;
  title: string;
  description: string;
  region: string;
  durationMinutes: number;
  maxCapacity: number;
  pricePerPerson: number;
  hasCar: boolean;
  availableLanguages: string[];
  meetingPoint: string;
  meetingPointDesc: string | null;
  includedItems: string[] | null;
  excludedItems: string[] | null;
  relatedMaterials: string[] | null;
  isPublished: boolean;
  guideUserId: string;
}
export interface GuideProductRequest {
  title: string;
  description: string;
  region: string;
  durationMinutes: number;
  maxCapacity: number;
  pricePerPerson: number;
  hasCar: boolean;
  availableLanguages: string[];
  meetingPoint: string;
  meetingPointDesc?: string;
  includedItems?: string[];
  excludedItems?: string[];
  relatedMaterials?: string[];
  schedules?: GuideSchedule[];
}

// ─── guider (가이드 등록) ───
export interface LanguageScore {
  exam: string;
  score: string;
}
export interface GuiderRegisterRequest {
  activeRegions: string[];
  availableLanguages: string[];
  experiencePeriod: string;
  languageScores: LanguageScore[];
  introduction: string;
  specialties: string[];
}
export interface GuiderRegisterResponse {
  guideId: string;
  message: string;
}

// ─── user bids / bid applications ───
export interface UserBidCourse {
  dayNumber: number;
  startTime: string | null;
  durationMinutes: number | null;
  placeName: string;
  categoryType: string[] | null;
  description: string | null;
  sortOrder: number;
}
export interface UserBid {
  bidId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  itineraryId: number;
  title: string;
  region: string | null;
  startDate: string | null;
  endDate: string | null;
  userNickname: string;
  courses: UserBidCourse[];
}
export interface BidApplication {
  applicationId: string;
  bidId: string;
  guideId: string;
  guideNickname: string;
  guideIntroduction: string | null;
  createdAt: string;
}

// ─── reviews (가이드 상품) ───
export interface GuideReview {
  reviewId: string;
  guideId: string;
  guideNickname: string;
  userId: string;
  userNickname: string;
  rating: number;
  content: string | null;
  createdAt: string;
}
export interface GuideReviewSummary {
  guideId: string;
  averageRating: number | null;
  reviewCount: number;
}

// ─── notifications ───
export interface AppNotification {
  notificationId: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

// ─── payments ───
export type PaymentType = "PARTICIPATION_FEE" | "DEPOSIT" | "BOOST";
export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED" | "FORFEITED" | "FAILED";
export interface Payment {
  paymentId: string;
  companionId: string;
  companionTitle: string;
  type: PaymentType;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
  resolvedAt: string | null;
}

// ─── reports ───
export type ReportReason =
  | "NO_SHOW"
  | "HARASSMENT"
  | "INAPPROPRIATE_BEHAVIOR"
  | "FRAUD"
  | "OTHER";
export interface Report {
  reportId: string;
  reportedUserId: string;
  reportedUserNickname: string;
  companionId: string | null;
  reasonCategory: ReportReason;
  description: string | null;
  status: "PENDING" | "REVIEWED" | "DISMISSED" | "ACTION_TAKEN";
  createdAt: string;
}

// ─── guide conversion ───
export interface GuideConversionApplication {
  applicationId: string;
  message: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  appliedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}
export interface GuideConversionStatus {
  companionHostCount: number;
  companionJoinCount: number;
  operationAverageRating: number | null;
  meetsHostRequirement: boolean;
  meetsJoinRequirement: boolean;
  meetsRatingRequirement: boolean;
  eligible: boolean;
  preliminaryGuide: boolean;
  alreadyGuide: boolean;
  latestApplication: GuideConversionApplication | null;
}

// ─── verification ───
export interface SendCodeResponse {
  status: string;
  verificationId: string;
  devCode: string | null;
}
export interface ConfirmCodeResponse {
  status: string;
  phoneVerified: boolean;
}
