"use client";

/** Flutter features/guide/ui/bid_status_page.dart 대응 — 가이드: 사용자 역제안 입찰 현황 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { bidApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useFormat } from "@/lib/i18n/useFormat";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Tag,
} from "@/components/ui";
import { TranslatableText } from "@/components/TranslatableText";

export default function GuideBidsPage() {
  const t = useTranslations("bids");
  const c = useTranslations("common");
  const tt = useTranslations("trips");
  const f = useFormat();
  const { data, loading, error, reload } = useAsync(() => bidApi.allBids(), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function apply(bidId: string) {
    setBusy(bidId);
    try {
      await bidApi.applyToBid(bidId);
      setToast(t("toastApplied"));
    } catch (e) {
      setToast(f.apiError(e));
    } finally {
      setBusy(null);
    }
  }

  async function cancel(bidId: string) {
    setBusy(bidId);
    try {
      await bidApi.cancelBidApplication(bidId);
      setToast(t("toastCanceled"));
    } catch (e) {
      setToast(f.apiError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader title={t("guideTitle")} description={t("guideDescription")} />

      {toast && (
        <div className="mb-4 rounded-[12px] border border-line bg-sand px-4 py-3 text-[13px] text-ink2">
          {toast}
        </div>
      )}

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title={t("emptyGuideTitle")} description={t("emptyGuideBody")} />
      ) : (
        <div className="space-y-3">
          {data!.map((bid) => {
            const days = [...new Set(bid.courses.map((x) => x.dayNumber))].sort((a, b) => a - b);
            const open = expanded === bid.bidId;
            return (
              <Card key={bid.bidId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge tone={bid.status === "PENDING" ? "accent" : "success"}>
                      {bid.status === "PENDING" ? t("open") : t("guideSelected")}
                    </Badge>
                    <h3 className="mt-2 text-[15px] font-semibold">{bid.title}</h3>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {bid.userNickname} · {bid.region ?? c("busan")} ·{" "}
                      {f.period(bid.startDate, bid.endDate)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      loading={busy === bid.bidId}
                      onClick={() => void apply(bid.bidId)}
                    >
                      {t("applyToBid")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === bid.bidId}
                      onClick={() => void cancel(bid.bidId)}
                    >
                      {t("cancelApplication")}
                    </Button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : bid.bidId)}
                  className="mt-3 text-[13px] font-semibold text-accent-text hover:underline"
                >
                  {open
                    ? t("hideCourses")
                    : t("showCourses", { spots: bid.courses.length, days: days.length })}
                </button>

                {open && (
                  <div className="mt-3 space-y-4 border-t border-line pt-3">
                    {days.map((day) => (
                      <div key={day}>
                        <p className="mb-1.5 text-[13px] font-semibold text-accent-text">
                          {tt("day", { n: day })}
                        </p>
                        <ol className="space-y-1.5 border-l border-line pl-4">
                          {bid.courses
                            .filter((x) => x.dayNumber === day)
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map((course, i) => (
                              <li key={`${day}-${i}`} className="relative text-[13px]">
                                <span className="absolute -left-[21px] top-2 h-1.5 w-1.5 rounded-full bg-accent" />
                                <span className="font-semibold tabular-nums">
                                  {f.time(course.startTime) || "--:--"}
                                </span>{" "}
                                <span className="font-medium">{course.placeName}</span>
                                {course.description && (
                                  <TranslatableText
                                    text={course.description}
                                    className="mt-0.5 text-muted"
                                  />
                                )}
                                {course.categoryType && course.categoryType.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {course.categoryType.map((tag) => (
                                      <Tag key={tag}>{tag}</Tag>
                                    ))}
                                  </div>
                                )}
                              </li>
                            ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
