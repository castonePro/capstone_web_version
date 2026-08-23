"use client";

/** Flutter features/main/place_detail_page.dart 대응 */
import Link from "next/link";
import { use, useEffect } from "react";
import { placeApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { recentViews } from "@/lib/storage/recentViews";
import { Button, Card, ErrorState, LoadingBlock, Tag } from "@/components/ui";
import { IconBack } from "@/components/layout/icons";

export default function PlaceDetailPage({ params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = use(params);
  const { data, loading, error, reload } = useAsync(() => placeApi.detail(placeId), [placeId]);

  // 최근 본 항목 기록 (앱의 RecentViewStore.record와 동일)
  useEffect(() => {
    if (!data) return;
    recentViews.record({
      type: "place",
      id: String(data.placeId),
      title: data.title ?? "이름 없음",
      subtitle: data.addr1 ?? "",
      imageUrl: data.firstImage ?? "",
    });
  }, [data]);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div>
      <Link
        href="/places"
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-accent-text"
      >
        <IconBack width={18} height={18} />
        여행지 목록
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="overflow-hidden rounded-[12px] border border-line bg-sand">
          {data.firstImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.firstImage}
              alt={data.title ?? ""}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="grid aspect-[4/3] place-items-center text-sm text-muted">
              이미지 없음
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
          <p className="mt-1.5 text-sm text-muted">{data.addr1 || "주소 정보 없음"}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {[data.cat1, data.cat2, data.cat3].filter(Boolean).map((c) => (
              <Tag key={c as string}>{c}</Tag>
            ))}
          </div>

          {data.homepage && (
            <div
              className="mt-4 text-[13px] break-all text-accent-text [&_a]:underline"
              // 백엔드가 TourAPI의 homepage 필드를 <a> 태그가 포함된 HTML로 내려준다.
              dangerouslySetInnerHTML={{ __html: data.homepage }}
            />
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href={`https://map.kakao.com/link/search/${encodeURIComponent(data.title ?? "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                지도에서 보기
              </Button>
            </a>
            <Link href="/ai">
              <Button size="sm">이 장소로 일정 만들기</Button>
            </Link>
          </div>
        </div>
      </div>

      <Card className="mt-6">
        <h2 className="mb-2 text-base font-semibold">소개</h2>
        <p className="text-sm leading-relaxed whitespace-pre-line text-ink2">{data.overview}</p>
      </Card>
    </div>
  );
}
