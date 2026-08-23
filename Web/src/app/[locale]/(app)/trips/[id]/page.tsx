"use client";

/** Flutter features/planner_detail/ui/itinerary_detail_page.dart 대응 — 일정 상세 타임라인 */
import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { bidApi, plannerApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useFormat } from "@/lib/i18n/useFormat";
import { Badge, Button, Card, Chip, ErrorState, LoadingBlock, Tag } from "@/components/ui";
import { IconBack } from "@/components/layout/icons";

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("trips");
  const c = useTranslations("common");
  const f = useFormat();
  const { data, loading, error, reload } = useAsync(() => plannerApi.detail(id), [id]);
  const [day, setDay] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
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
