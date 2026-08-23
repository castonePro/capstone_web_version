"use client";

/** Flutter features/companion/ui/companion_applicants_page.dart 대응 */
import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { companionApi } from "@/lib/api/endpoints";
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
  type BadgeTone,
} from "@/components/ui";
import { ReportDialog } from "@/components/ReportDialog";
import { TranslatableText } from "@/components/TranslatableText";
import type { ApplicationStatus } from "@/lib/api/types";
import { IconBack } from "@/components/layout/icons";

const TONE: Record<ApplicationStatus, BadgeTone> = {
  PENDING: "accent",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELED: "neutral",
};

export default function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("companions");
  const c = useTranslations("common");
  const f = useFormat();
  const { data, loading, error, reload } = useAsync(() => companionApi.applications(id), [id]);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [report, setReport] = useState<{ userId: string; nickname: string } | null>(null);

  async function run(applicationId: string, fn: () => Promise<unknown>, message: string) {
    setBusy(applicationId);
    try {
      await fn();
      setToast(message);
      reload();
    } catch (e) {
      setToast(f.apiError(e));
    } finally {
      setBusy(null);
    }
  }

  const pending = (data ?? []).filter((a) => a.status === "PENDING");
  const others = (data ?? []).filter((a) => a.status !== "PENDING");

  return (
    <div>
      <Link
        href={`/companions/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-accent-text"
      >
        <IconBack width={18} height={18} />
        {t("detailTitle")}
      </Link>

      <PageHeader title={t("applicantsTitle")} description={t("applicantsDescription")} />

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
        <EmptyState title={t("noApplicants")} description={t("noApplicantsBody")} />
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-base font-semibold">
              {t("pendingApplications")} <span className="text-accent">{pending.length}</span>
            </h2>
            {pending.length === 0 ? (
              <p className="text-[13px] text-muted">{t("noPending")}</p>
            ) : (
              <div className="space-y-3">
                {pending.map((a) => (
                  <Card key={a.applicationId}>
                    <div className="flex flex-wrap items-start gap-3">
                      <Avatar
                        src={a.applicantProfileImageUrl}
                        name={a.applicantNickname}
                        size={44}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{a.applicantNickname}</p>
                          {a.applicantPhoneVerified && (
                            <Badge tone="teal">{c("verifiedBadge")}</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12px] text-muted">
                          {f.profileMeta(a.applicantBirthYear, a.applicantGender)} ·{" "}
                          {t("appliedAt", { date: f.dateFull(a.createdAt) })}
                        </p>
                        {a.introduction && (
                          <div className="mt-2 rounded-[12px] bg-sand px-3 py-2.5 text-[13px] text-ink2">
                            <TranslatableText text={a.introduction} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                      <Button
                        size="sm"
                        loading={busy === a.applicationId}
                        onClick={() =>
                          void run(
                            a.applicationId,
                            () => companionApi.approve(a.applicationId),
                            t("toastApproved"),
                          )
                        }
                      >
                        {t("approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busy === a.applicationId}
                        onClick={() =>
                          void run(
                            a.applicationId,
                            () => companionApi.reject(a.applicationId),
                            t("toastRejected"),
                          )
                        }
                      >
                        {t("reject")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setReport({ userId: a.applicantId, nickname: a.applicantNickname })
                        }
                      >
                        {t("report")}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {others.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold">{t("processedApplications")}</h2>
              <div className="space-y-3">
                {others.map((a) => (
                  <Card key={a.applicationId}>
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar
                        src={a.applicantProfileImageUrl}
                        name={a.applicantNickname}
                        size={36}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.applicantNickname}</p>
                        <p className="text-[12px] text-muted">{f.dateFull(a.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.noShow && <Badge tone="danger">{t("noShow")}</Badge>}
                        <Badge tone={TONE[a.status]}>{f.applicationStatus(a.status)}</Badge>
                      </div>
                    </div>
                    {a.status === "APPROVED" && !a.noShow && (
                      <div className="mt-3 border-t border-line pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={busy === a.applicationId}
                          onClick={() =>
                            void run(
                              a.applicationId,
                              () => companionApi.markNoShow(a.applicationId),
                              t("toastNoShow"),
                            )
                          }
                        >
                          {t("markNoShow")}
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {report && (
        <ReportDialog
          open
          onClose={() => setReport(null)}
          reportedUserId={report.userId}
          reportedUserNickname={report.nickname}
          companionId={id}
        />
      )}
    </div>
  );
}
