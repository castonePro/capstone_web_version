/**
 * 언어에 의존하지 않는 순수 포맷터.
 *
 * 언어별 라벨(상태·사유 등)과 날짜 표기는 `src/lib/i18n/useFormat.ts`의
 * `useFormat()` 훅을 쓴다. 이 파일은 그 훅과 서버 컴포넌트가 공통으로 쓰는 계산만 담는다.
 */

import type { Locale } from "@/i18n/routing";
import { localeTags } from "@/i18n/routing";

const tagOf = (locale: string) =>
  localeTags[locale as Locale] ?? (locale || "ko-KR");

/** "2026-08-22" → 언어별 짧은 날짜 (8월 22일 / Aug 22 / 8月22日) */
export function formatDate(iso: string | null | undefined, locale = "ko"): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(tagOf(locale), {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(d);
}

/** 연도까지 포함한 날짜 */
export function formatDateFull(iso: string | null | undefined, locale = "ko"): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(tagOf(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(d);
}

export function formatDateTime(iso: string | null | undefined, locale = "ko"): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(tagOf(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(d);
}

/** "14:30:00" → "14:30" (언어 무관) */
export function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}

/** 두 날짜 사이의 일수 (양 끝 포함). 기간 라벨 생성에 쓴다. */
export function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

/** 분 → { hours, minutes } (언어별 문구 조립은 useFormat이 담당) */
export function splitMinutes(min: number): { hours: number; minutes: number } {
  return { hours: Math.floor(min / 60), minutes: min % 60 };
}

/** 통화 표기. 원화 금액을 언어별 관습에 맞게 보여 준다. */
export function formatPrice(
  amount: number | string | null | undefined,
  locale = "ko",
): string {
  if (amount == null) return "-";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(n)) return String(amount);
  return new Intl.NumberFormat(tagOf(locale), {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * 출생연도 → 나이대 구간.
 * 신원 공개 정책상 정확한 나이 대신 "20대 초반" 같은 구간만 노출한다.
 * 문구 조립은 언어별로 다르므로 여기서는 숫자만 계산한다.
 */
export function ageBand(
  birthYear: number | null | undefined,
): { decade: number; band: "early" | "mid" | "late" } | null {
  if (!birthYear) return null;
  const age = new Date().getFullYear() - birthYear + 1;
  const decade = Math.floor(age / 10) * 10;
  if (decade < 20) return { decade: 10, band: "mid" };
  const rest = age % 10;
  return { decade, band: rest < 4 ? "early" : rest < 7 ? "mid" : "late" };
}

/** 상대 시간 계산 (문구는 useFormat이 언어별로 붙인다) */
export function relativeParts(
  iso: string | null | undefined,
): { unit: "now" | "minute" | "hour" | "day" | "date"; value: number } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return { unit: "now", value: 0 };
  if (min < 60) return { unit: "minute", value: min };
  const hour = Math.floor(min / 60);
  if (hour < 24) return { unit: "hour", value: hour };
  const day = Math.floor(hour / 24);
  if (day < 7) return { unit: "day", value: day };
  return { unit: "date", value: 0 };
}

/**
 * 서버·네트워크 오류를 사람이 읽을 문구로.
 * 백엔드가 에러 코드를 내려주면 ApiError.code에 담기므로, 화면에서는
 * useFormat().apiError(e)를 써서 언어별 문구로 바꾼다. 이 함수는 최후 폴백이다.
 */
export function rawErrorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return "";
}
