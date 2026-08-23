import { defineRouting } from "next-intl/routing";

/**
 * 지원 언어. 순서가 언어 선택 UI에 그대로 노출된다.
 *
 * ko  한국어        (기본 · 원문)
 * en  English
 * ja  日本語
 * zh-CN 简体中文
 * vi  Tiếng Việt
 * id  Bahasa Indonesia
 */
export const locales = ["ko", "en", "ja", "zh-CN", "vi", "id"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ko";

/** 언어 선택 UI에 쓰는 표시 이름 (각 언어의 자기 표기) */
export const localeNames: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  "zh-CN": "简体中文",
  vi: "Tiếng Việt",
  id: "Bahasa Indonesia",
};

/** `<html lang>` 및 Intl 포맷터에 넘길 BCP-47 태그 */
export const localeTags: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  "zh-CN": "zh-CN",
  vi: "vi-VN",
  id: "id-ID",
};

/**
 * 백엔드로 보낼 Accept-Language 값.
 * Spring MessageSource가 이 값으로 messages_{lang}.properties를 고른다.
 */
export const acceptLanguageOf = (locale: Locale) => localeTags[locale];

export const routing = defineRouting({
  locales,
  defaultLocale,
  // 기본 언어에도 prefix를 붙인다 (/ko/home).
  // 관광 서비스라 링크 공유·검색 노출이 중요해서 URL에 언어가 항상 드러나는 편이 낫다.
  localePrefix: "always",
  // 첫 방문 시 브라우저 Accept-Language로 언어를 골라 리다이렉트한다.
  localeDetection: true,
});
