"use client";

/** 내가 접수한 신고 내역 (GET /api/v1/reports/my) */
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { reportApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useFormat } from "@/lib/i18n/useFormat";
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
import { IconBack } from "@/components/layout/icons";

const STATUS_TONE: Record<Report["status"], BadgeTone> = {
  PENDING: "accent",
  REVIEWED: "teal",
  DISMISSED: "neutral",
  ACTION_TAKEN: "success",
};

export default function MyReportsPage() {
  const t = useTranslations("report");
  const tm = useTranslations("me");
  const f = useFormat();
  const { data, loading, error, reload } = useAsync(() => reportApi.myReports(), []);

  return (
    <div className="max-w-3xl">
      <Link
        href="/me"
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-accent-text"
      >
        <IconBack width={18} height={18} />
        {tm("title")}
      </Link>

      <PageHeader title={t("myTitle")} description={t("myDescription")} />

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title={t("emptyTitle")} />
      ) : (
        <div className="space-y-3">
          {data!.map((r) => (
            <Card key={r.reportId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={STATUS_TONE[r.status]}>{f.reportStatus(r.status)}</Badge>
                    <Badge tone="neutral">{f.reportReason(r.reasonCategory)}</Badge>
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
                      {t("relatedCompanion")}
                    </Link>
                  )}
                </div>
                <p className="shrink-0 text-[12px] text-muted">{f.dateTime(r.createdAt)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
