"use client";

/** Flutter features/guide/ui/bid_status_page.dart 대응 — 가이드: 사용자 역제안 입찰 현황 */
import { useState } from "react";
import { bidApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
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
import { errorMessage, formatPeriod, formatTime } from "@/lib/utils/format";

export default function GuideBidsPage() {
  const { data, loading, error, reload } = useAsync(() => bidApi.allBids(), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function apply(bidId: string) {
    setBusy(bidId);
    try {
      await bidApi.applyToBid(bidId);
      setToast("입찰에 참여했습니다. 사용자가 선택하면 채팅방이 열립니다.");
    } catch (e) {
      setToast(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function cancel(bidId: string) {
    setBusy(bidId);
    try {
      await bidApi.cancelBidApplication(bidId);
      setToast("입찰 참여를 취소했습니다.");
    } catch (e) {
      setToast(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="입찰 현황"
        description="사용자가 직접 올린 일정입니다. 마음에 드는 일정에 참여하면 사용자가 가이드를 선택합니다."
      />

      {toast && (
        <div className="mb-4 rounded-[12px] border border-line bg-sand px-4 py-3 text-[13px] text-ink2">
          {toast}
        </div>
      )}

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="올라온 일정이 없습니다" description="사용자가 일정을 제안하면 여기에 표시됩니다." />
      ) : (
        <div className="space-y-3">
          {data!.map((bid) => {
            const days = [...new Set(bid.courses.map((c) => c.dayNumber))].sort((a, b) => a - b);
            const open = expanded === bid.bidId;
            return (
              <Card key={bid.bidId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={bid.status === "PENDING" ? "accent" : "success"}>
                        {bid.status === "PENDING" ? "모집중" : "가이드 선정됨"}
                      </Badge>
                    </div>
                    <h3 className="mt-2 text-[15px] font-semibold">{bid.title}</h3>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {bid.userNickname} · {bid.region ?? "부산"} ·{" "}
                      {formatPeriod(bid.startDate, bid.endDate)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      loading={busy === bid.bidId}
                      onClick={() => void apply(bid.bidId)}
                    >
                      입찰 참여
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === bid.bidId}
                      onClick={() => void cancel(bid.bidId)}
                    >
                      참여 취소
                    </Button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : bid.bidId)}
                  className="mt-3 text-[13px] font-semibold text-accent-text hover:underline"
                >
                  {open ? "코스 접기" : `코스 보기 (${bid.courses.length}곳, ${days.length}일)`}
                </button>

                {open && (
                  <div className="mt-3 space-y-4 border-t border-line pt-3">
                    {days.map((day) => (
                      <div key={day}>
                        <p className="mb-1.5 text-[13px] font-semibold text-accent-text">
                          DAY {day}
                        </p>
                        <ol className="space-y-1.5 border-l border-line pl-4">
                          {bid.courses
                            .filter((c) => c.dayNumber === day)
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map((c, i) => (
                              <li key={`${day}-${i}`} className="relative text-[13px]">
                                <span className="absolute -left-[21px] top-2 h-1.5 w-1.5 rounded-full bg-accent" />
                                <span className="font-semibold tabular-nums">
                                  {formatTime(c.startTime) || "--:--"}
                                </span>{" "}
                                <span className="font-medium">{c.placeName}</span>
                                {c.description && (
                                  <p className="mt-0.5 text-muted">{c.description}</p>
                                )}
                                {c.categoryType && c.categoryType.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {c.categoryType.map((t) => (
                                      <Tag key={t}>{t}</Tag>
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
