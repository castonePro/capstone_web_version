"use client";

/** Flutter features/companion/ui/companion_detail_page.dart 대응 */
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { companionApi, plannerApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFormat } from "@/lib/i18n/useFormat";
import { recentViews } from "@/lib/storage/recentViews";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  LoadingBlock,
  Modal,
  Select,
  Tag,
  Textarea,
} from "@/components/ui";
import { CompanionStatusBadge } from "@/components/cards";
import { ReportDialog } from "@/components/ReportDialog";
import { TranslatableText } from "@/components/TranslatableText";
import { IconBack } from "@/components/layout/icons";

export default function CompanionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("companions");
  const c = useTranslations("common");
  const tt = useTranslations("trips");
  const f = useFormat();
  const { userId, me } = useAuth();

  const { data, loading, error, reload } = useAsync(() => companionApi.detail(id), [id]);
  const [applyOpen, setApplyOpen] = useState(false);
  const [introduction, setIntroduction] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decision, setDecision] = useState<"CONTINUE" | "POSTPONE" | "CANCEL">("CONTINUE");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  const isHost = !!data && !!userId && data.hostId === userId;
  const itinerary = useAsync(
    () => (data ? plannerApi.detail(data.itineraryId) : Promise.resolve(null)),
    [data?.itineraryId],
  );

  useEffect(() => {
    if (!data) return;
    recentViews.record({
      type: "companion",
      id: data.companionId,
      title: data.title,
      subtitle: data.region ?? "",
      imageUrl: "",
    });
  }, [data]);

  async function run(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await fn();
      setToast(message);
      reload();
    } catch (e) {
      setToast(f.apiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitApply() {
    setBusy(true);
    try {
      await companionApi.apply(id, introduction.trim());
      setApplyOpen(false);
      setToast(t("applySent"));
      reload();
    } catch (e) {
      setToast(f.apiError(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const full = data.approvedCount >= data.maxParticipants;
  const canApply = !isHost && data.status === "RECRUITING" && !full;

  return (
    <div>
      <Link
        href="/companions"
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-accent-text"
      >
        <IconBack width={18} height={18} />
        {t("exploreTitle")}
      </Link>

      {toast && (
        <div className="mb-4 rounded-[12px] border border-line bg-sand px-4 py-3 text-[13px] text-ink2">
          {toast}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* ─── 본문 ─── */}
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <CompanionStatusBadge status={data.status} />
              {data.boosted && <Badge tone="accent">{t("boosted")}</Badge>}
              {(data.minAge != null || data.maxAge != null) && (
                <Badge tone="neutral">
                  {t("ageRange", {
                    min: data.minAge ?? "–",
                    max: data.maxAge ?? "–",
                  })}
                </Badge>
              )}
            </div>
            <h1 className="mt-2.5 text-2xl font-semibold tracking-tight">{data.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {data.region ?? c("busan")} · {f.period(data.startDate, data.endDate)}
            </p>
            {data.preferenceTags && data.preferenceTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {data.preferenceTags.map((tag) => (
                  <Tag key={tag}>#{tag}</Tag>
                ))}
              </div>
            )}
          </div>

          {data.description && (
            <Card>
              <h2 className="mb-2 text-base font-semibold">{t("intro")}</h2>
              <TranslatableText text={data.description} className="text-sm text-ink2" />
            </Card>
          )}

          {data.costSharingNote && (
            <Card>
              <h2 className="mb-2 text-base font-semibold">{t("costSharing")}</h2>
              <TranslatableText text={data.costSharingNote} className="text-sm text-ink2" />
            </Card>
          )}

          {/* 일정 코스 */}
          <Card>
            <h2 className="mb-3 text-base font-semibold">
              {t("itinerary")}
              <span className="ml-2 text-[13px] font-normal text-muted">{data.itineraryTitle}</span>
            </h2>
            {itinerary.loading ? (
              <p className="text-[13px] text-muted">{c("loading")}</p>
            ) : itinerary.data ? (
              <div className="space-y-4">
                {[...new Set(itinerary.data.details.map((d) => d.dayNumber))]
                  .sort((a, b) => a - b)
                  .map((day) => (
                    <div key={day}>
                      <p className="mb-1.5 text-[13px] font-semibold text-accent-text">
                        {tt("day", { n: day })}
                      </p>
                      <ol className="space-y-1.5 border-l border-line pl-4">
                        {itinerary.data!.details
                          .filter((d) => d.dayNumber === day)
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((d) => (
                            <li key={d.detailId} className="relative text-[13px]">
                              <span className="absolute -left-[21px] top-2 h-1.5 w-1.5 rounded-full bg-accent" />
                              <span className="font-semibold tabular-nums">
                                {f.time(d.startTime) || "--:--"}
                              </span>{" "}
                              <span className="font-medium">{d.placeName}</span>{" "}
                              <span className="text-muted">{f.minutes(d.durationMinutes)}</span>
                            </li>
                          ))}
                      </ol>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">{t("itineraryRestricted")}</p>
            )}
          </Card>
        </div>

        {/* ─── 사이드 ─── */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <p className="text-[13px] text-muted">{t("participants")}</p>
            <p className="mt-1 text-2xl font-semibold">
              {data.approvedCount}
              <span className="text-base font-normal text-muted"> / {data.maxParticipants}</span>
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              {t("minParticipants", { count: data.minParticipants })}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                  width: `${Math.min(100, (data.approvedCount / Math.max(1, data.maxParticipants)) * 100)}%`,
                }}
              />
            </div>

            <div className="mt-4 space-y-2">
              {isHost ? (
                <HostActions
                  status={data.status}
                  busy={busy}
                  companionId={id}
                  onClose={() => run(() => companionApi.close(id), t("toastClosed"))}
                  onDecision={() => setDecisionOpen(true)}
                  onStart={() => run(() => companionApi.start(id), t("toastStarted"))}
                  onComplete={() => run(() => companionApi.complete(id), t("toastCompleted"))}
                  onCancel={() => run(() => companionApi.cancel(id), t("toastCanceled"))}
                  onBoost={() => run(() => companionApi.boost(id), t("toastBoosted"))}
                />
              ) : (
                <>
                  <Button className="w-full" disabled={!canApply} onClick={() => setApplyOpen(true)}>
                    {data.status !== "RECRUITING"
                      ? t("closedForApplications")
                      : full
                        ? t("full")
                        : t("apply")}
                  </Button>
                  {me && !me.phone_verified && (
                    <Link href="/verify-phone" className="block">
                      <Button variant="outline" className="w-full">
                        {t("verifyToApply")}
                      </Button>
                    </Link>
                  )}
                  <Link href={`/companions/${id}/chat`} className="block">
                    <Button variant="outline" className="w-full">
                      {t("groupChat")}
                    </Button>
                  </Link>
                </>
              )}

              {data.status === "COMPLETED" && (
                <Link href={`/companions/${id}/reviews`} className="block">
                  <Button variant="secondary" className="w-full">
                    {t("writeReview")}
                  </Button>
                </Link>
              )}
            </div>
          </Card>

          <Card>
            <p className="mb-3 text-[13px] font-semibold text-ink2">{t("host")}</p>
            <div className="flex items-center gap-3">
              <Avatar src={data.hostProfileImageUrl} name={data.hostNickname} size={44} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{data.hostNickname}</p>
                <p className="truncate text-[12px] text-muted">
                  {f.profileMeta(data.hostBirthYear, data.hostGender)}
                </p>
              </div>
              {data.hostPhoneVerified && <Badge tone="teal">{c("verifiedBadge")}</Badge>}
            </div>
            {data.snsHandle && (
              <p className="mt-3 text-[13px] text-ink2">SNS · {data.snsHandle}</p>
            )}
            <p className="mt-3 text-[12px] text-muted">
              {t("createdAt", { date: f.dateFull(data.createdAt) })}
            </p>
            {!isHost && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="mt-3 text-[12px] font-medium text-muted hover:text-[#b21232]"
              >
                {t("report")}
              </button>
            )}
          </Card>
        </div>
      </div>

      {/* ─── 참여 신청 모달 ─── */}
      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title={t("apply")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setApplyOpen(false)}>
              {c("cancel")}
            </Button>
            <Button loading={busy} onClick={() => void submitApply()}>
              {t("sendApplication")}
            </Button>
          </>
        }
      >
        <Field label={t("selfIntro")} hint={t("selfIntroHint")}>
          <Textarea
            value={introduction}
            onChange={(e) => setIntroduction(e.target.value)}
            placeholder={t("selfIntroPlaceholder")}
          />
        </Field>
      </Modal>

      {/* ─── 인원 미달 결정 모달 ─── */}
      <Modal
        open={decisionOpen}
        onClose={() => setDecisionOpen(false)}
        title={t("decisionTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecisionOpen(false)}>
              {c("close")}
            </Button>
            <Button
              loading={busy}
              onClick={() => {
                setDecisionOpen(false);
                void run(
                  () =>
                    companionApi.decide(id, decision, newStart || undefined, newEnd || undefined),
                  t("toastDecision"),
                );
              }}
            >
              {c("apply")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t("decisionLabel")}>
            <Select
              value={decision}
              onChange={(e) => setDecision(e.target.value as typeof decision)}
            >
              <option value="CONTINUE">{t("decisionContinue")}</option>
              <option value="POSTPONE">{t("decisionPostpone")}</option>
              <option value="CANCEL">{t("decisionCancel")}</option>
            </Select>
          </Field>
          {decision === "POSTPONE" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("newStartDate")}>
                <input
                  type="date"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full rounded-[12px] border border-line px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                />
              </Field>
              <Field label={t("newEndDate")}>
                <input
                  type="date"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="w-full rounded-[12px] border border-line px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                />
              </Field>
            </div>
          )}
        </div>
      </Modal>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedUserId={data.hostId}
        reportedUserNickname={data.hostNickname}
        companionId={data.companionId}
      />
    </div>
  );
}

function HostActions({
  status,
  busy,
  companionId,
  onClose,
  onDecision,
  onStart,
  onComplete,
  onCancel,
  onBoost,
}: {
  status: string;
  busy: boolean;
  companionId: string;
  onClose: () => void;
  onDecision: () => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onBoost: () => void;
}) {
  const t = useTranslations("companions");
  return (
    <>
      <Link href={`/companions/${companionId}/applicants`} className="block">
        <Button className="w-full">{t("manageApplicants")}</Button>
      </Link>
      <Link href={`/companions/${companionId}/chat`} className="block">
        <Button variant="outline" className="w-full">
          {t("groupChat")}
        </Button>
      </Link>

      {status === "RECRUITING" && (
        <>
          <Button variant="outline" className="w-full" loading={busy} onClick={onClose}>
            {t("closeRecruiting")}
          </Button>
          <Button variant="secondary" className="w-full" loading={busy} onClick={onBoost}>
            {t("boost")}
          </Button>
        </>
      )}
      {status === "UNDER_MINIMUM" && (
        <Button variant="outline" className="w-full" onClick={onDecision}>
          {t("decideUnderMinimum")}
        </Button>
      )}
      {status === "CONFIRMED" && (
        <Button variant="outline" className="w-full" loading={busy} onClick={onStart}>
          {t("startTrip")}
        </Button>
      )}
      {status === "IN_PROGRESS" && (
        <Button variant="outline" className="w-full" loading={busy} onClick={onComplete}>
          {t("completeTrip")}
        </Button>
      )}
      {status !== "COMPLETED" && status !== "CANCELED" && (
        <Button variant="ghost" className="w-full" loading={busy} onClick={onCancel}>
          {t("cancelCompanion")}
        </Button>
      )}
    </>
  );
}
