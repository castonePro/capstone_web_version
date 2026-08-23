import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Asia/Seoul",
    formats: {
      dateTime: {
        short: { year: "numeric", month: "short", day: "numeric" },
        long: { year: "numeric", month: "long", day: "numeric", weekday: "short" },
      },
    },
    // 번역이 비어 있으면 키의 마지막 조각을 보여 준다.
    // (개발 중 콘솔 노이즈를 줄이고, 누락은 `npm run i18n:check`로 한 번에 잡는다)
    getMessageFallback({ key }) {
      return key.split(".").pop() ?? key;
    },
  };
});
