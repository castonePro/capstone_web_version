"use client";

/** Flutter features/profile/ui/my_bid_status_page.dart 대응 — 내가 올린 역제안과 지원 가이드 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { bidApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useFormat } from "@/lib/i18n/useFormat";
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

export default function MyBidsPage() {
  const router = useRouter();
  const t = useTranslations("bids");
  const c = useTranslations("common");
  const tt = useTranslations("trips");
  const f = useFormat();
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
      setToast(f.apiError(e));
    }
  }

  async function select(applicationId: string) {
    setBusy(applicationId);
    try {
      const room = await bidApi.selectGuide(applicationId);
      router.push(`/chat/${room.roomId}`);
    } catch (e) {
      setToast(f.apiError(e));
      setBusy(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title={t("myTitle")} description={t("myDescription")} />

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
        <EmptyState
          title={t("emptyMyTitle")}
          description={t("emptyMyBody")}
          action={
            <Link href="/trips">
              <Button size="sm">{tt("title")}</Button>
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
                    {bid.status === "PENDING" ? t("recruitingGuides") : t("guideSelected")}
                  </Badge>
                  <h3 className="mt-2 truncate text-[15px] font-semibold">{bid.title}</h3>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {bid.region ?? c("busan")} · {f.period(bid.startDate, bid.endDate)} ·{" "}
                    {tt("courseCount", { count: bid.courses.length })}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void toggle(bid.bidId)}>
                  {open === bid.bidId ? c("collapse") : t("showApplicants")}
                </Button>
              </div>

              {open === bid.bidId && (
                <div className="mt-4 border-t border-line pt-4">
                  {!apps[bid.bidId] ? (
                    <p className="text-[13px] text-muted">{c("loading")}</p>
                  ) : apps[bid.bidId].length === 0 ? (
                    <p className="text-[13px] text-muted">{t("noApplicants")}</p>
                  ) : (
                    <ul className="space-y-3">
                      {apps[bid.bidId].map((a) => (
                        <li key={a.applicationId} className="flex items-center gap-3">
                          <Avatar name={a.guideNickname} size={40} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{a.guideNickname}</p>
                            <p className="truncate text-[12px] text-muted">
                              {a.guideIntroduction ||
                                t("appliedAt", { date: f.dateFull(a.createdAt) })}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            loading={busy === a.applicationId}
                            onClick={() => void select(a.applicationId)}
                          >
                            {t("selectAndChat")}
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
