/**
 * Flutter의 features/core/network/dio_client.dart 대응.
 *
 * 동작을 그대로 옮겼다:
 *  - baseUrl 고정
 *  - 모든 요청에 Authorization: Bearer <token> 자동 부착
 *  - 401 응답이면 저장된 토큰 삭제 (자동 로그아웃)
 *
 * 차이: 모바일의 flutter_secure_storage 대신 웹에서는 localStorage를 쓴다.
 * (브라우저에는 안전한 키체인이 없다. XSS 대비가 필요하면 백엔드에서
 *  HttpOnly 쿠키로 내려주는 방식으로 바꿔야 한다 — README 참고.)
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8080";

const TOKEN_KEY = "access_token";
const USER_ID_KEY = "user_id";
const NICKNAME_KEY = "nickname";
const IS_GUIDE_KEY = "is_guide";

const isBrowser = () => typeof window !== "undefined";

/** Flutter의 AuthStorage 대응 */
export const AuthStorage = {
  getToken(): string | null {
    if (!isBrowser()) return null;
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  saveToken(token: string) {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* 사생활 보호 모드 등에서 실패할 수 있다 */
    }
  },
  saveUserData(userId: string, nickname: string, isGuide: boolean) {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(USER_ID_KEY, userId);
      window.localStorage.setItem(NICKNAME_KEY, nickname);
      window.localStorage.setItem(IS_GUIDE_KEY, String(isGuide));
    } catch {
      /* noop */
    }
  },
  getUserId(): string | null {
    if (!isBrowser()) return null;
    try {
      return window.localStorage.getItem(USER_ID_KEY);
    } catch {
      return null;
    }
  },
  getNickname(): string | null {
    if (!isBrowser()) return null;
    try {
      return window.localStorage.getItem(NICKNAME_KEY);
    } catch {
      return null;
    }
  },
  isGuide(): boolean {
    if (!isBrowser()) return false;
    try {
      return window.localStorage.getItem(IS_GUIDE_KEY) === "true";
    } catch {
      return false;
    }
  },
  clear() {
    if (!isBrowser()) return;
    try {
      [TOKEN_KEY, USER_ID_KEY, NICKNAME_KEY, IS_GUIDE_KEY].forEach((k) =>
        window.localStorage.removeItem(k),
      );
    } catch {
      /* noop */
    }
  },
};

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  /**
   * 백엔드가 내려주는 에러 코드(예: "COMPANION_NOT_RECRUITING").
   * 다국어 문구는 프론트의 messages/*.json → errors.<code> 에서 찾는다.
   * 코드가 없으면(구버전 응답) message(한국어)를 그대로 쓴다.
   */
  readonly code?: string;
  constructor(status: number, message: string, body?: unknown, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

/**
 * 현재 화면의 언어. URL의 첫 조각(/en/home)에서 읽고, 없으면 next-intl이 심는
 * NEXT_LOCALE 쿠키를 본다. 서버 에러 메시지를 언어에 맞게 받기 위해
 * 모든 요청의 Accept-Language 헤더로 보낸다.
 */
const SUPPORTED = ["ko", "en", "ja", "zh-CN", "vi", "id"];
const BCP47: Record<string, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  "zh-CN": "zh-CN",
  vi: "vi-VN",
  id: "id-ID",
};

export function currentLocale(): string {
  if (!isBrowser()) return "ko";
  const seg = window.location.pathname.split("/")[1];
  if (SUPPORTED.includes(seg)) return seg;
  try {
    const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    if (m && SUPPORTED.includes(m[1])) return m[1];
  } catch {
    /* noop */
  }
  return "ko";
}

/** 401이 발생하면 알려주는 훅 (AuthProvider가 구독해서 로그인 화면으로 보낸다) */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** 로그인/회원가입처럼 토큰 없이 호출하는 엔드포인트 */
  skipAuth?: boolean;
  signal?: AbortSignal;
  /** 기본 60초 (Dio의 receiveTimeout과 동일). AI 생성은 더 길게 잡는다. */
  timeoutMs?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, skipAuth = false, timeoutMs = 60_000 } = options;

  let url = `${API_BASE_URL}${path}`;
  if (query) {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    // 백엔드 MessageSource가 이 값으로 언어별 에러 메시지를 고른다
    "Accept-Language": BCP47[currentLocale()] ?? "ko-KR",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (!skipAuth) {
    const token = AuthStorage.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error).name === "AbortError") {
      throw new ApiError(0, "Request timed out", undefined, "TIMEOUT");
    }
    throw new ApiError(0, "Network error", undefined, "network");
  }
  clearTimeout(timer);

  if (res.status === 401) {
    AuthStorage.clear();
    onUnauthorized?.();
    throw new ApiError(401, "Unauthorized", undefined, "UNAUTHORIZED");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const message =
      (obj && "message" in obj
        ? String(obj.message)
        : typeof parsed === "string"
          ? parsed
          : "") || `HTTP ${res.status}`;
    // GlobalExceptionHandler가 ErrorResponse에 code를 담아 주면 그걸 쓴다
    const code =
      obj && typeof obj.code === "string"
        ? obj.code
        : obj && typeof obj.errorCode === "string"
          ? obj.errorCode
          : undefined;
    throw new ApiError(res.status, message, parsed, code);
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
