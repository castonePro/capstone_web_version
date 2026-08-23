"use client";

/** Flutter features/companion/ui/companion_applicants_page.dart 대응 */
import Link from "next/link";
import { use, useState } from "react";
import { companionApi } from "@/lib/api/endpoints";
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
import { ReportDialog } from "@/components/ReportDialog";
import {
  APPLICATION_STATUS_LABEL,
  errorMessage,
  formatAgeBand,
  formatDateFull,
  formatGender,
} from "@/lib/utils/format";
import type { ApplicationStatus } from "@/lib/api/types";
import { IconBack } from "@/components/layout/icons";

const TONE: Record<ApplicationStatus, "accent" | "success" | "neutral" | "danger"> = {
  PENDING: "accent",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELED: "neutral",
};

export default function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
      setToast(errorMessage(e));
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
        동행 상세
      </Link>

      <PageHeader
        title="신청자 관리"
        description="승인 전에는 인증 배지·나이대·성별까지만 보입니다. 승인 후 그룹 채팅에서 더 이야기해 보세요."
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
        <EmptyState title="아직 신청자가 없습니다" description="모집글을 부스트하면 상단에 노출됩니다." />
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-base font-semibold">
              대기중 <span className="text-accent">{pending.length}</span>
            </h2>
            {pending.length === 0 ? (
              <p className="text-[13px] text-muted">대기중인 신청이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {pending.map((a) => (
                  <Card key={a.applicationId}>
                    <div className="flex flex-wrap items-start gap-3">
                      <Avatar src={a.applicantProfileImageUrl} name={a.applicantNickname} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{a.applicantNickname}</p>
                          {a.applicantPhoneVerified && <Badge tone="teal">본인 인증</Badge>}
                        </div>
                        <p className="mt-0.5 text-[12px] text-muted">
                          {[formatAgeBand(a.applicantBirthYear), formatGender(a.applicantGender)]
                            .filter(Boolean)
                            .join(" · ") || "정보 비공개"}{" "}
                          · 신청 {formatDateFull(a.createdAt)}
                        </p>
                        {a.introduction && (
                          <p className="mt-2 rounded-[12px] bg-sand px-3 py-2.5 text-[13px] leading-relaxed text-ink2">
                            {a.introduction}
                          </p>
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
                            "신청을 승인했습니다.",
                          )
                        }
                      >
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busy === a.applicationId}
                        onClick={() =>
                          void run(
                            a.applicationId,
                            () => companionApi.reject(a.applicationId),
                            "신청을 거절했습니다.",
                          )
                        }
                      >
                        거절
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setReport({ userId: a.applicantId, nickname: a.applicantNickname })
                        }
                      >
                        신고
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {others.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold">처리된 신청</h2>
              <div className="space-y-3">
                {others.map((a) => (
                  <Card key={a.applicationId}>
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar src={a.applicantProfileImageUrl} name={a.applicantNickname} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.applicantNickname}</p>
                        <p className="text-[12px] text-muted">{formatDateFull(a.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.noShow && <Badge tone="danger">노쇼</Badge>}
                        <Badge tone={TONE[a.status]}>{APPLICATION_STATUS_LABEL[a.status]}</Badge>
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
                              "노쇼로 처리했습니다.",
                            )
                          }
                        >
                          노쇼 처리
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
