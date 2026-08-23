"use client";

/** Flutter features/profile/ui/my_bid_status_page.dart 대응 — 내가 올린 역제안과 지원 가이드 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bidApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import type { BidApplication } from "@/lib/api/types";
import { errorMessage, formatDateFull, formatPeriod } from "@/lib/utils/format";

export default function MyBidsPage() {
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => bidApi.myBids(), []);
  const [open, setOpen] = useState<string | null>(null);
  const [apps, setApps] = useState<Record<string, BidApplication[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function toggle(bidId: string) {
    if (open === bidId) {
      setOpen(null);
      return;
    }
    setOpen(bidId);
    if (apps[bidId]) return;
    try {
      const list = await bidApi.bidApplications(bidId);
      setApps((p) => ({ ...p, [bidId]: list }));
    } catch (e) {
      setToast(errorMessage(e));
    }
  }

  async function select(applicationId: string) {
    setBusy(applicationId);
    try {
      const room = await bidApi.selectGuide(applicationId);
      router.push(`/chat/${room.roomId}`);
    } catch (e) {
      setToast(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="내 제안 현황"
        description="가이드에게 올린 일정과 지원한 가이드를 확인하고 선택합니다."
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
        <EmptyState
          title="올린 제안이 없습니다"
          description="내 여행에서 '가이드에게 제안'을 누르면 여기에 표시됩니다."
          action={
            <Link href="/trips">
              <Button size="sm">내 여행으로</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {data!.map((bid) => (
            <Card key={bid.bidId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge tone={bid.status === "PENDING" ? "accent" : "success"}>
                    {bid.status === "PENDING" ? "가이드 모집중" : "가이드 선정됨"}
                  </Badge>
                  <h3 className="mt-2 truncate text-[15px] font-semibold">{bid.title}</h3>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {bid.region ?? "부산"} · {formatPeriod(bid.startDate, bid.endDate)} ·{" "}
                    {bid.courses.length}개 코스
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void toggle(bid.bidId)}>
                  {open === bid.bidId ? "접기" : "지원 가이드 보기"}
                </Button>
              </div>

              {open === bid.bidId && (
                <div className="mt-4 border-t border-line pt-4">
                  {!apps[bid.bidId] ? (
                    <p className="text-[13px] text-muted">불러오는 중…</p>
                  ) : apps[bid.bidId].length === 0 ? (
                    <p className="text-[13px] text-muted">아직 지원한 가이드가 없습니다.</p>
                  ) : (
                    <ul className="space-y-3">
                      {apps[bid.bidId].map((a) => (
                        <li key={a.applicationId} className="flex items-center gap-3">
                          <Avatar name={a.guideNickname} size={40} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{a.guideNickname}</p>
                            <p className="truncate text-[12px] text-muted">
                              {a.guideIntroduction || `지원 ${formatDateFull(a.createdAt)}`}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            loading={busy === a.applicationId}
                            onClick={() => void select(a.applicationId)}
                          >
                            선택 · 대화 시작
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
