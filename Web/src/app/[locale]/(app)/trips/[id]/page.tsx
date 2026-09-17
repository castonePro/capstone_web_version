"use client";

/** Flutter features/planner_detail/ui/itinerary_detail_page.dart 대응 — 일정 상세 타임라인 */
import { use, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { bidApi, plannerApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useFormat } from "@/lib/i18n/useFormat";
import { Badge, Button, Card, Chip, ErrorState, LoadingBlock, Tag } from "@/components/ui";
import { IconBack } from "@/components/layout/icons";
import { TripRouteMap, type TripRoutePoint } from "@/components/maps/TripRouteMap";

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("trips");
  const c = useTranslations("common");
  const f = useFormat();
  const { data, loading, error, reload } = useAsync(() => plannerApi.detail(id), [id]);
  const [day, setDay] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 아래 useMemo는 Hooks 규칙 때문에(early return 뒤에 두면 렌더마다 호출 개수가 달라짐)
  // loading/error/!data로 일찍 return 하기 전, 다른 훅들과 함께 항상 호출되게 위에 둔다.
  // data가 아직 없을 때는 빈 배열/기본값으로 계산해두고, 실제 사용은 아래 return문에서만 한다.
  const days = data ? [...new Set(data.details.map((d) => d.dayNumber))].sort((a, b) => a - b) : [];
  const activeDay = day ?? days[0] ?? 1;
  const courses = data
    ? data.details.filter((d) => d.dayNumber === activeDay).sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  // 좌표 있는 코스만 지도에 찍는다 (TourAPI 원본에 좌표 없는 장소가 섞여있을 수 있음).
  // useMemo로 감싸지 않으면 매 렌더마다 새 배열이 만들어져서 TripRouteMap 내부의
  // fitBounds/Routes API 호출 effect가 (day를 안 바꿔도) 계속 재실행된다.
  const mapPoints: TripRoutePoint[] = useMemo(
    () =>
      courses
        .filter((c) => c.latitude != null && c.longitude != null)
        .map((c) => ({ id: c.detailId, lat: c.latitude as number, lng: c.longitude as number, label: c.placeName })),
    // courses는 data/activeDay에서 파생되므로 그 둘을 의존성으로 둔다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, activeDay],
  );

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  async function proposeToGuides() {
    setBusy(true);
    try {
      await bidApi.createUserBid(Number(id));
      setToast(t("proposedToast"));
    } catch (e) {
      setToast(f.apiError(e));
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
        {t("title")}
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {data.region ?? c("busanCity")} · {f.period(data.startDate, data.endDate)}
          </p>
          <div className="mt-2 flex gap-1.5">
            <Badge tone="neutral">{t("dayCount", { count: days.length })}</Badge>
            <Badge tone="neutral">{t("courseCount", { count: data.details.length })}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" loading={busy} onClick={() => void proposeToGuides()}>
            {t("proposeToGuides")}
          </Button>
          <Link href={`/companions/new?itineraryId=${data.itineraryId}`}>
            <Button size="sm">{t("recruitWithThis")}</Button>
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
              {t("day", { n: d })}
            </Chip>
          ))}
        </div>
      )}

      <TripRouteMap points={mapPoints} />

      <ol className="space-y-3">
        {courses.map((course, i) => (
          <li key={course.detailId}>
            <Card>
              <div className="flex gap-4">
                <div className="shrink-0 text-center">
                  <p className="text-[13px] font-semibold tabular-nums text-ink">
                    {f.time(course.startTime) || "--:--"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">{f.minutes(course.durationMinutes)}</p>
                  {i < courses.length - 1 && (
                    <div className="mx-auto mt-2 h-6 w-px bg-line" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold">{course.placeName}</h3>
                    {course.placeId && (
                      <Link
                        href={`/places/${course.placeId}`}
                        className="text-[12px] font-medium text-accent-text hover:underline"
                      >
                        {t("placeInfo")}
                      </Link>
                    )}
                  </div>
                  {course.description && (
                    <p className="mt-1 text-[13px] leading-relaxed text-ink2">
                      {course.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {course.categoryType?.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                    {course.operatingHours && (
                      <Tag>{t("hours", { value: course.operatingHours })}</Tag>
                    )}
                  </div>
                  {course.latitude != null && course.longitude != null && (
                    <a
                      href={`https://map.kakao.com/link/map/${encodeURIComponent(course.placeName)},${course.latitude},${course.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-[12px] font-medium text-accent-text hover:underline"
                    >
                      {t("openMap")}
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
