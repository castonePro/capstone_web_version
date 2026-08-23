"use client";

/** 내가 접수한 신고 내역 (GET /api/v1/reports/my) */
import Link from "next/link";
import { reportApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  type BadgeTone,
} from "@/components/ui";
import type { Report } from "@/lib/api/types";
import { REPORT_REASON_LABEL, formatDateTime } from "@/lib/utils/format";
import { IconBack } from "@/components/layout/icons";

const STATUS_LABEL: Record<Report["status"], string> = {
  PENDING: "접수됨",
  REVIEWED: "검토 완료",
  DISMISSED: "기각",
  ACTION_TAKEN: "조치 완료",
};

const STATUS_TONE: Record<Report["status"], BadgeTone> = {
  PENDING: "accent",
  REVIEWED: "teal",
  DISMISSED: "neutral",
  ACTION_TAKEN: "success",
};

export default function MyReportsPage() {
  const { data, loading, error, reload } = useAsync(() => reportApi.myReports(), []);

  return (
    <div className="max-w-3xl">
      <Link
        href="/me"
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-accent-text"
      >
        <IconBack width={18} height={18} />
        마이페이지
      </Link>

      <PageHeader
        title="내 신고 내역"
        description="접수한 신고와 운영자 처리 상태입니다."
      />

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="신고 내역이 없습니다" />
      ) : (
        <div className="space-y-3">
          {data!.map((r) => (
            <Card key={r.reportId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    <Badge tone="neutral">{REPORT_REASON_LABEL[r.reasonCategory]}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{r.reportedUserNickname}</p>
                  {r.description && (
                    <p className="mt-1 text-[13px] leading-relaxed text-ink2">{r.description}</p>
                  )}
                  {r.companionId && (
                    <Link
                      href={`/companions/${r.companionId}`}
                      className="mt-2 inline-block text-[12px] font-medium text-accent-text hover:underline"
                    >
                      관련 동행 보기
                    </Link>
                  )}
                </div>
                <p className="shrink-0 text-[12px] text-muted">{formatDateTime(r.createdAt)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
