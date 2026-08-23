"use client";

/** Flutter features/main/travel_explore_page.dart 대응 */
import { useState } from "react";
import { PLACE_CATEGORIES, placeApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { Chip, EmptyState, ErrorState, Input, LoadingBlock, PageHeader } from "@/components/ui";
import { PlaceCard } from "@/components/cards";

export default function PlacesPage() {
  const [category, setCategory] = useState<string>(PLACE_CATEGORIES[0]);
  const [keyword, setKeyword] = useState("");
  const { data, loading, error, reload } = useAsync(() => placeApi.recommend(category), [category]);

  const filtered = (data ?? []).filter((p) =>
    keyword.trim()
      ? `${p.title ?? ""} ${p.addr1 ?? ""}`.toLowerCase().includes(keyword.trim().toLowerCase())
      : true,
  );

  return (
    <div>
      <PageHeader
        title="여행지 탐색"
        description="부산의 장소를 카테고리별로 둘러보세요. 백엔드가 카테고리마다 무작위로 5곳씩 추천합니다."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {PLACE_CATEGORIES.map((c) => (
            <Chip key={c} active={c === category} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
        <div className="sm:ml-auto sm:w-64">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="장소·주소 검색"
          />
        </div>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="표시할 장소가 없습니다"
          description="다른 카테고리를 선택하거나 검색어를 지워 보세요."
        />
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
