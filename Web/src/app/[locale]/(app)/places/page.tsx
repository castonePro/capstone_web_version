"use client";

/** Flutter features/main/travel_explore_page.dart 대응 */
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PLACE_CATEGORIES, placeApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { Chip, EmptyState, ErrorState, Input, LoadingBlock, PageHeader } from "@/components/ui";
import { PlaceCard } from "@/components/cards";

export default function PlacesPage() {
  const t = useTranslations("places");
  const cat = useTranslations("placeCategories");
  const locale = useLocale();
  const [category, setCategory] = useState<string>(PLACE_CATEGORIES[0]);
  const [keyword, setKeyword] = useState("");
  const { data, loading, error, reload } = useAsync(() => placeApi.recommend(category, locale), [category, locale]);

  const filtered = (data ?? []).filter((p) =>
    keyword.trim()
      ? `${p.title ?? ""} ${p.addr1 ?? ""}`.toLowerCase().includes(keyword.trim().toLowerCase())
      : true,
  );

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {PLACE_CATEGORIES.map((c) => (
            <Chip key={c} active={c === category} onClick={() => setCategory(c)}>
              {cat(c)}
            </Chip>
          ))}
        </div>
        <div className="sm:ml-auto sm:w-64">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("searchPlaceholder")}
          />
        </div>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <PlaceCard key={p.placeId} place={p} />
          ))}
        </div>
      )}
    </div>
  );
}
