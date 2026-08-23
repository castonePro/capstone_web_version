"use client";

/**
 * 사용자 작성 콘텐츠(UGC) 온디맨드 번역.
 *
 * 동행 모집글·가이드 상품 설명·리뷰·채팅처럼 미리 번역해 둘 수 없는 글에 쓴다.
 * 원문을 그대로 보여 주고, 아래에 "번역 보기" 링크를 붙인다. 누르면 그때 서버로
 * 번역을 요청하고 결과를 컴포넌트 안에 캐시한다(같은 글을 다시 눌러도 재요청 없음).
 *
 * 화면 언어가 한국어이거나 번역할 내용이 없으면 링크 자체를 숨긴다.
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { translationApi } from "@/lib/api/endpoints";
import { useFormat } from "@/lib/i18n/useFormat";
import { Spinner, cx } from "@/components/ui";

export function TranslatableText({
  text,
  className,
  /** 원문 언어를 알고 있으면 넘긴다. 모르면 서버가 감지한다. */
  sourceLang,
}: {
  text: string | null | undefined;
  className?: string;
  sourceLang?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("translate");
  const f = useFormat();

  const [translated, setTranslated] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!text || !text.trim()) return null;

  // 화면 언어가 원문 언어와 같으면 번역 링크가 필요 없다.
  const sameLanguage = locale === (sourceLang ?? "ko");

  async function toggle() {
    setError(null);
    if (translated) {
      setShowing((v) => !v);
      return;
    }
    setLoading(true);
    try {
      const res = await translationApi.translate([text!], locale, sourceLang);
      setTranslated(res.translations[0] ?? text!);
      setShowing(true);
    } catch (e) {
      setError(f.apiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <p className="leading-relaxed whitespace-pre-line">
        {showing && translated ? translated : text}
      </p>

      {!sameLanguage && (
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggle()}
            disabled={loading}
            className={cx(
              "inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors",
              "text-muted hover:text-accent-text disabled:opacity-60",
            )}
          >
            {loading && <Spinner size={11} />}
            {showing ? t("showOriginal") : t("showTranslation")}
          </button>
          {showing && <span className="text-[11px] text-muted">{t("machineTranslated")}</span>}
        </div>
      )}

      {error && <p className="mt-1 text-[12px] text-[#b21232]">{error}</p>}
    </div>
  );
}
