"use client";

/** Flutter features/planner_detail/ui/itinerary_detail_page.dart 대응 — 일정 상세 타임라인 */
import Link from "next/link";
import { use, useState } from "react";
import { bidApi, plannerApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import {
  Badge,
  Button,
  Card,
  Chip,
  ErrorState,
  LoadingBlock,
  Tag,
} from "@/components/ui";
import { errorMessage, formatMinutes, formatPeriod, formatTime } from "@/lib/utils/format";
import { IconBack } from "@/components/layout/icons";

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useAsync(() => plannerApi.detail(id), [id]);
  const [day, setDay] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const days = [...new Set(data.details.map((d) => d.dayNumber))].sort((a, b) => a - b);
  const activeDay = day ?? days[0] ?? 1;
  const courses = data.details
    .filter((d) => d.dayNumber === activeDay)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  async function proposeToGuides() {
    setBusy(true);
    try {
      await bidApi.createUserBid(Number(id));
      setToast("가이드에게 일정을 제안했습니다.");
    } catch (e) {
      setToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link
        href="/trips"
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-accent-text"
      >
        <IconBack width={18} height={18} />
        내 여행
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {data.region ?? "부산광역시"} · {formatPeriod(data.startDate, data.endDate)}
          </p>
          <div className="mt-2 flex gap-1.5">
            <Badge tone="neutral">{days.length}일</Badge>
            <Badge tone="neutral">{data.details.length}개 코스</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" loading={busy} onClick={() => void proposeToGuides()}>
            가이드에게 제안
          </Button>
          <Link href={`/companions/new?itineraryId=${data.itineraryId}`}>
            <Button size="sm">이 일정으로 동행 모집</Button>
          </Link>
        </div>
      </header>

      {toast && (
        <div className="mb-4 rounded-[12px] border border-line bg-sand px-4 py-3 text-[13px] text-ink2">
          {toast}
        </div>
      )}

      {days.length > 1 && (
        <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
          {days.map((d) => (
            <Chip key={d} active={d === activeDay} onClick={() => setDay(d)}>
              DAY {d}
            </Chip>
          ))}
        </div>
      )}

      <ol className="space-y-3">
        {courses.map((c, i) => (
          <li key={c.detailId}>
            <Card>
              <div className="flex gap-4">
                <div className="shrink-0 text-center">
                  <p className="text-[13px] font-semibold tabular-nums text-ink">
                    {formatTime(c.startTime) || "--:--"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {formatMinutes(c.durationMinutes)}
                  </p>
                  {i < courses.length - 1 && (
                    <div className="mx-auto mt-2 h-6 w-px bg-line" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold">{c.placeName}</h3>
                    {c.placeId && (
                      <Link
                        href={`/places/${c.placeId}`}
                        className="text-[12px] font-medium text-accent-text hover:underline"
                      >
                        장소 정보
                      </Link>
                    )}
                  </div>
                  {c.description && (
                    <p className="mt-1 text-[13px] leading-relaxed text-ink2">{c.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.categoryType?.map((t) => <Tag key={t}>{t}</Tag>)}
                    {c.operatingHours && <Tag>운영 {c.operatingHours}</Tag>}
                  </div>
                  {c.latitude != null && c.longitude != null && (
                    <a
                      href={`https://map.kakao.com/link/map/${encodeURIComponent(c.placeName)},${c.latitude},${c.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-[12px] font-medium text-accent-text hover:underline"
                    >
                      지도에서 보기
                    </a>
                  )}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
