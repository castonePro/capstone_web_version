"use client";

/** Flutter features/guide/ui/guide_explore_page.dart 대응 */
import { useMemo, useState } from "react";
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

export default function GuidesPage() {
  const { data, loading, error, reload } = useAsync(() => guideApi.products(), []);
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState("ALL");
  const [language, setLanguage] = useState("ALL");
  const [carOnly, setCarOnly] = useState(false);
  const [sort, setSort] = useState<"priceAsc" | "priceDesc" | "duration">("priceAsc");

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
    if (carOnly) arr = arr.filter((p) => p.hasCar);
    return [...arr].sort((a, b) => {
      if (sort === "priceAsc") return Number(a.pricePerPerson) - Number(b.pricePerPerson);
      if (sort === "priceDesc") return Number(b.pricePerPerson) - Number(a.pricePerPerson);
      return a.durationMinutes - b.durationMinutes;
    });
  }, [data, keyword, region, language, carOnly, sort]);

  return (
    <div>
      <PageHeader
        title="가이드 찾기"
        description="검증된 로컬 가이드의 상품을 둘러보고 바로 문의해 보세요."
      />

      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="검색">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="상품명·가이드·설명"
            />
          </Field>
          <Field label="지역">
            <Select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="ALL">전체</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="언어">
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="ALL">전체</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="정렬">
            <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="priceAsc">가격 낮은순</option>
              <option value="priceDesc">가격 높은순</option>
              <option value="duration">소요 시간 짧은순</option>
            </Select>
          </Field>
        </div>
        <div className="mt-3">
          <Chip active={carOnly} onClick={() => setCarOnly((v) => !v)}>
            차량 보유만
          </Chip>
        </div>
      </Card>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <EmptyState
          title="조건에 맞는 가이드 상품이 없습니다"
          description="필터를 넓혀 보세요."
        />
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
