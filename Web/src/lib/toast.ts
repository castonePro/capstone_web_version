"use client";

import { toast as sonnerToast, type ExternalToast } from "sonner";
import { ApiError } from "@/lib/api/client";

export const DEFAULT_DELETE_FALLBACK_MESSAGE =
  "삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

export const DEFAULT_API_FALLBACK_MESSAGE =
  "요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

/**
 * 백엔드 에러 응답에서 메시지를 추출하는 헬퍼 함수.
 *
 * 백엔드 에러 응답 스펙:
 * - HTTP Status: 400 Bad Request, 409 Conflict, 또는 500 Internal Server Error
 * - Response Body:
 *   {
 *     "status": "error",
 *     "message": "연결된 데이터(동행 모집글, 신청 내역 등)가 존재하여 삭제할 수 없습니다."
 *   }
 *
 * 추출 우선순위:
 * 1. error.response?.data?.message (Axios / ApiError response 형식)
 * 2. error.body?.message (ApiError의 body 객체)
 * 3. error.data?.message
 * 4. error.message (단, 단순 HTTP 상태코드 "HTTP 500" 또는 "Network error" 등은 제외)
 * 5. 위에서 유효한 메시지가 없거나 네트워크 오류인 경우 fallback 사용
 */
export function extractErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_DELETE_FALLBACK_MESSAGE
): string {
  if (!error) return fallback;

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, any>;

    // 1. error.response.data.message (Axios 인터셉터 / ApiError 호환)
    const resData = err.response?.data;
    if (resData) {
      if (
        typeof resData === "object" &&
        resData !== null &&
        typeof resData.message === "string" &&
        resData.message.trim()
      ) {
        return resData.message.trim();
      }
      if (typeof resData === "string" && resData.trim() && !resData.trim().startsWith("<")) {
        return resData.trim();
      }
    }

    // 2. error.body.message (ApiError 본문)
    const body = err.body;
    if (body && typeof body === "object" && typeof body.message === "string" && body.message.trim()) {
      return body.message.trim();
    }

    // 3. error.data.message
    const data = err.data;
    if (data && typeof data === "object" && typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }

    // 4. 네트워크 에러(status 0)인 경우 즉시 폴백 반환
    if (err.status === 0) {
      return fallback;
    }

    // 5. error.message 검사 (ApiError 및 일반 Error 인스턴스)
    if (typeof err.message === "string" && err.message.trim()) {
      const msg = err.message.trim();
      const isGenericHttp = /^HTTP\s+\d+$/i.test(msg);
      const isNetworkError = /network error|failed to fetch|networkrequestfailed/i.test(msg);
      const isAbort = /aborted|timed out|request timed out/i.test(msg);

      if (!isGenericHttp && !isNetworkError && !isAbort) {
        return msg;
      }
    }
  }

  return fallback;
}

/**
 * 데이터 삭제 실패 시 백엔드 응답(response.data.message)을 추출하여 에러 토스트를 표시합니다.
 * 네트워크 오류 등으로 메시지가 없으면 기본 안내 문구를 띄웁니다.
 * 동일한 메시지에 대해서는 id를 지정하여 중복 토스트가 여러 개 뜨지 않도록 처리합니다.
 */
export function showDeleteErrorToast(
  error: unknown,
  fallback: string = DEFAULT_DELETE_FALLBACK_MESSAGE,
  options?: ExternalToast
) {
  const message = extractErrorMessage(error, fallback);
  return sonnerToast.error(message, {
    id: `delete-error-${message}`,
    ...options,
  });
}

/**
 * 일반 API 요청 실패 시 에러 토스트를 표시합니다.
 */
export function showApiErrorToast(
  error: unknown,
  fallback: string = DEFAULT_API_FALLBACK_MESSAGE,
  options?: ExternalToast
) {
  const message = extractErrorMessage(error, fallback);
  return sonnerToast.error(message, {
    id: `api-error-${message}`,
    ...options,
  });
}

export const toast = sonnerToast;
