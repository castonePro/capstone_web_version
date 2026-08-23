"use client";

/** Flutter features/guide/ui/guide_explore_page.dart 대응 */
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { guideApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
} from "@/components/ui";
import { GuideProductCard } from "@/components/cards";

/**
 * 화면 언어 → 가이드가 구사하는 언어 이름(한국어 표기).
 * 백엔드 guide_service_info.available_languages에는 "영어", "일본어" 같은 한국어 값이 들어 있어서,
 * 외국어 화면에서 "내 언어로 안내 가능한 가이드만" 필터를 걸 때 이 매핑이 필요하다.
 */
const LOCALE_TO_LANGUAGE_NAME: Record<string, string> = {
  ko: "한국어",
  en: "영어",
  ja: "일본어",
  "zh-CN": "중국어",
  vi: "베트남어",
  id: "인도네시아어",
};

export default function GuidesPage() {
  const t = useTranslations("guides");
  const c = useTranslations("common");
  const locale = useLocale();
  const { data, loading, error, reload } = useAsync(() => guideApi.products(), []);

  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState("ALL");
  const [language, setLanguage] = useState("ALL");
  const [carOnly, setCarOnly] = useState(false);
  const [myLanguageOnly, setMyLanguageOnly] = useState(false);
  const [sort, setSort] = useState<"priceAsc" | "priceDesc" | "duration">("priceAsc");

  const myLanguage = LOCALE_TO_LANGUAGE_NAME[locale];

  const regions = useMemo(
    () => [...new Set((data ?? []).map((p) => p.region).filter(Boolean))],
    [data],
  );
  const languages = useMemo(
    () => [...new Set((data ?? []).flatMap((p) => p.availableLanguages ?? []))],
    [data],
  );

  const list = useMemo(() => {
    let arr = data ?? [];
    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase();
      arr = arr.filter((p) =>
        `${p.title} ${p.description} ${p.guideName} ${p.meetingPoint}`.toLowerCase().includes(k),
      );
    }
    if (region !== "ALL") arr = arr.filter((p) => p.region === region);
    if (language !== "ALL") arr = arr.filter((p) => p.availableLanguages?.includes(language));
    if (myLanguageOnly && myLanguage) {
      arr = arr.filter((p) => p.availableLanguages?.includes(myLanguage));
    }
    if (carOnly) arr = arr.filter((p) => p.hasCar);
    return [...arr].sort((a, b) => {
      if (sort === "priceAsc") return Number(a.pricePerPerson) - Number(b.pricePerPerson);
      if (sort === "priceDesc") return Number(b.pricePerPerson) - Number(a.pricePerPerson);
      return a.durationMinutes - b.durationMinutes;
    });
  }, [data, keyword, region, language, carOnly, myLanguageOnly, myLanguage, sort]);

  return (
    <div>
      <PageHeader title={t("exploreTitle")} description={t("exploreDescription")} />

      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={c("search")}>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </Field>
          <Field label={t("region")}>
            <Select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="ALL">{c("all")}</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("language")}>
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="ALL">{c("all")}</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={c("sort")}>
            <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="priceAsc">{t("sortPriceAsc")}</option>
              <option value="priceDesc">{t("sortPriceDesc")}</option>
              <option value="duration">{t("sortDuration")}</option>
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={carOnly} onClick={() => setCarOnly((v) => !v)}>
            {t("carOnly")}
          </Chip>
          {myLanguage && (
            <Chip active={myLanguageOnly} onClick={() => setMyLanguageOnly((v) => !v)}>
              {t("myLanguageOnly", { language: myLanguage })}
            </Chip>
          )}
        </div>
      </Card>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((p) => (
            <GuideProductCard key={p.serviceId} product={p} href={`/guides/${p.serviceId}`} />
          ))}
        </div>
      )}
    </div>
  );
}
