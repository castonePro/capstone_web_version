"use client";

/**
 * 화면에서 쓰는 언어 의존 포맷터·라벨을 한곳에 모은 훅.
 *
 *   const f = useFormat();
 *   f.date(iso)              → 8월 22일 / Aug 22 / 8月22日
 *   f.period(start, end)     → 8월 22일 – 8월 24일 (3일)
 *   f.companionStatus(s)     → 모집중 / Recruiting / 募集中
 *   f.apiError(err)          → 백엔드 에러 코드를 언어별 문구로
 *
 * 기존 format.ts의 하드코딩 라벨 맵을 대체한다.
 */

import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api/client";
import type {
  ApplicationStatus,
  CompanionStatus,
  PaymentStatus,
  PaymentType,
  ReportReason,
  SanctionLevel,
} from "@/lib/api/types";
import {
  ageBand,
  daysBetween,
  formatDate,
  formatDateFull,
  formatDateTime,
  formatPrice,
  formatTime,
  rawErrorMessage,
  relativeParts,
  splitMinutes,
} from "@/lib/utils/format";

export function useFormat() {
  const locale = useLocale();
  const t = useTranslations("format");
  const s = useTranslations("status");
  const e = useTranslations("errors");

  return {
    locale,

    date: (iso: string | null | undefined) => formatDate(iso, locale),
    dateFull: (iso: string | null | undefined) => formatDateFull(iso, locale),
    dateTime: (iso: string | null | undefined) => formatDateTime(iso, locale),
    time: formatTime,
    price: (v: number | string | null | undefined) => formatPrice(v, locale),

    /** "8월 22일 – 8월 24일 (3일)" */
    period(start?: string | null, end?: string | null) {
      if (!start && !end) return t("noDates");
      if (start && end) {
        const days = daysBetween(start, end);
        const range = `${formatDate(start, locale)} – ${formatDate(end, locale)}`;
        return days > 0 ? `${range} (${t("dayCount", { count: days })})` : range;
      }
      return formatDate(start ?? end, locale);
    },

    /** "1시간 30분" */
    minutes(min: number | null | undefined) {
      if (min == null) return "-";
      const { hours, minutes } = splitMinutes(min);
      if (hours && minutes) return t("hourMinute", { hours, minutes });
      if (hours) return t("hour", { hours });
      return t("minute", { minutes });
    },

    /** "방금 / 5분 전 / 3시간 전 / 2일 전 / 날짜" */
    relative(iso: string | null | undefined) {
      const p = relativeParts(iso);
      if (!p) return "";
      if (p.unit === "now") return t("justNow");
      if (p.unit === "minute") return t("minutesAgo", { count: p.value });
      if (p.unit === "hour") return t("hoursAgo", { count: p.value });
      if (p.unit === "day") return t("daysAgo", { count: p.value });
      return formatDateFull(iso, locale);
    },

    /** "20대 초반" — 정확한 나이는 노출하지 않는다 */
    ageBand(birthYear: number | null | undefined) {
      const b = ageBand(birthYear);
      if (!b) return "";
      return t(`ageBand.${b.band}`, { decade: b.decade });
    },

    gender(g: string | null | undefined) {
      if (g === "MALE" || g === "FEMALE" || g === "OTHER") return s(`gender.${g}`);
      return "";
    },

    /** 나이대 · 성별을 한 줄로. 둘 다 없으면 "정보 비공개" */
    profileMeta(birthYear: number | null | undefined, gender: string | null | undefined) {
      const parts = [this.ageBand(birthYear), this.gender(gender)].filter(Boolean);
      return parts.length ? parts.join(" · ") : t("undisclosed");
    },

    companionStatus: (v: CompanionStatus) => s(`companion.${v}`),
    applicationStatus: (v: ApplicationStatus) => s(`application.${v}`),
    paymentType: (v: PaymentType) => s(`paymentType.${v}`),
    paymentStatus: (v: PaymentStatus) => s(`paymentStatus.${v}`),
    reportReason: (v: ReportReason) => s(`reportReason.${v}`),
    reportStatus: (v: string) => s(`reportStatus.${v}`),
    sanction: (v: SanctionLevel) => s(`sanction.${v}`),

    /**
     * 백엔드 에러를 언어별 문구로.
     * 서버가 errorCode를 주면 그 키로 번역하고, 없으면 서버 문구(한국어)를 그대로,
     * 그것도 없으면 일반 오류 문구로 폴백한다.
     */
    apiError(err: unknown): string {
      if (err instanceof ApiError) {
        if (err.code) {
          try {
            const translated = e(err.code);
            // 번역이 없으면 getMessageFallback이 키 조각을 돌려주므로 그때는 서버 문구를 쓴다
            if (translated && translated !== err.code) return translated;
          } catch {
            /* noop */
          }
        }
        if (err.status === 0) return e("network");
        if (err.status === 401) return e("UNAUTHORIZED");
        if (err.message) return err.message;
      }
      if (err && typeof err === "object") {
        const anyErr = err as Record<string, unknown>;
        const res = anyErr.response as { data?: { message?: string } } | undefined;
        if (res?.data?.message) return String(res.data.message);
      }
      return rawErrorMessage(err) || e("unknown");
    },
  };
}
