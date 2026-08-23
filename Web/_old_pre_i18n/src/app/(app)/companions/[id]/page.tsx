"use client";

/** Flutter features/companion/ui/companion_detail_page.dart 대응 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { companionApi, plannerApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useAuth } from "@/lib/auth/AuthProvider";
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
import {
  errorMessage,
  formatAgeBand,
  formatDateFull,
  formatGender,
  formatMinutes,
  formatPeriod,
  formatTime,
} from "@/lib/utils/format";
import { IconBack } from "@/components/layout/icons";

export default function CompanionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
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
      subtitle: `${data.region ?? "부산"} · ${formatPeriod(data.startDate, data.endDate)}`,
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
      setToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitApply() {
    setBusy(true);
    try {
      await companionApi.apply(id, introduction.trim());
      setApplyOpen(false);
      setToast("참여 신청을 보냈습니다. 방장이 승인하면 알림으로 알려드릴게요.");
      reload();
    } catch (e) {
      setToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const full = data.approvedCount >= data.maxParticipants;
  const canApply =
    !isHost && data.status === "RECRUITING" && !full && !!me?.phone_verified && !me?.sanction_level
      ? true
      : !isHost && data.status === "RECRUITING" && !full;

  return (
    <div>
      <Link
        href="/companions"
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-accent-text"
      >
        <IconBack width={18} height={18} />
        동행 찾기
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
              {data.boosted && <Badge tone="accent">부스트</Badge>}
              {(data.minAge != null || data.maxAge != null) && (
                <Badge tone="neutral">
                  {data.minAge ?? "제한 없음"} ~ {data.maxAge ?? "제한 없음"}세
                </Badge>
              )}
            </div>
            <h1 className="mt-2.5 text-2xl font-semibold tracking-tight">{data.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {data.region ?? "부산"} · {formatPeriod(data.startDate, data.endDate)}
            </p>
            {data.preferenceTags && data.preferenceTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {data.preferenceTags.map((t) => (
                  <Tag key={t}>#{t}</Tag>
                ))}
              </div>
            )}
          </div>

          {data.description && (
            <Card>
              <h2 className="mb-2 text-base font-semibold">소개</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-ink2">
                {data.description}
              </p>
            </Card>
          )}

          {data.costSharingNote && (
            <Card>
              <h2 className="mb-2 text-base font-semibold">비용 분담</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-ink2">
                {data.costSharingNote}
              </p>
            </Card>
          )}

          {/* 일정 코스 */}
          <Card>
            <h2 className="mb-3 text-base font-semibold">
              여행 일정
              <span className="ml-2 text-[13px] font-normal text-muted">
                {data.itineraryTitle}
              </span>
            </h2>
            {itinerary.loading ? (
              <p className="text-[13px] text-muted">일정을 불러오는 중…</p>
            ) : itinerary.data ? (
              <div className="space-y-4">
                {[...new Set(itinerary.data.details.map((d) => d.dayNumber))]
                  .sort((a, b) => a - b)
                  .map((day) => (
                    <div key={day}>
                      <p className="mb-1.5 text-[13px] font-semibold text-accent-text">DAY {day}</p>
                      <ol className="space-y-1.5 border-l border-line pl-4">
                        {itinerary.data!.details
                          .filter((d) => d.dayNumber === day)
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((d) => (
                            <li key={d.detailId} className="relative text-[13px]">
                              <span className="absolute -left-[21px] top-2 h-1.5 w-1.5 rounded-full bg-accent" />
                              <span className="font-semibold tabular-nums">
                                {formatTime(d.startTime) || "--:--"}
                              </span>{" "}
                              <span className="font-medium">{d.placeName}</span>{" "}
                              <span className="text-muted">
                                {formatMinutes(d.durationMinutes)}
                              </span>
                            </li>
                          ))}
                      </ol>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">
                일정 상세는 방장 또는 승인된 참여자만 볼 수 있습니다.
              </p>
            )}
          </Card>
        </div>

        {/* ─── 사이드 ─── */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <p className="text-[13px] text-muted">참여 인원</p>
            <p className="mt-1 text-2xl font-semibold">
              {data.approvedCount}
              <span className="text-base font-normal text-muted"> / {data.maxParticipants}명</span>
            </p>
            <p className="mt-0.5 text-[12px] text-muted">최소 {data.minParticipants}명 필요</p>
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
                  onClose={() => run(() => companionApi.close(id), "모집을 마감했습니다.")}
                  onDecision={() => setDecisionOpen(true)}
                  onStart={() => run(() => companionApi.start(id), "여행을 시작했습니다.")}
                  onComplete={() =>
                    run(() => companionApi.complete(id), "여행을 완료 처리했습니다.")
                  }
                  onCancel={() => run(() => companionApi.cancel(id), "동행을 취소했습니다.")}
                  onBoost={() =>
                    run(
                      () => companionApi.boost(id),
                      "부스트 결제가 생성되었습니다. 결제 내역에서 결제를 완료해 주세요.",
                    )
                  }
                  companionId={id}
                />
              ) : (
                <>
                  <Button
                    className="w-full"
                    disabled={!canApply}
                    onClick={() => setApplyOpen(true)}
                  >
                    {data.status !== "RECRUITING"
                      ? "모집이 끝났습니다"
                      : full
                        ? "정원이 찼습니다"
                        : "참여 신청하기"}
                  </Button>
                  {me && !me.phone_verified && (
                    <Link href="/verify-phone" className="block">
                      <Button variant="outline" className="w-full">
                        본인 인증 후 신청 가능
                      </Button>
                    </Link>
                  )}
                  <Link href={`/companions/${id}/chat`} className="block">
                    <Button variant="outline" className="w-full">
                      그룹 채팅
                    </Button>
                  </Link>
                </>
              )}

              {data.status === "COMPLETED" && (
                <Link href={`/companions/${id}/reviews`} className="block">
                  <Button variant="secondary" className="w-full">
                    동행 평가하기
                  </Button>
                </Link>
              )}
            </div>
          </Card>

          <Card>
            <p className="mb-3 text-[13px] font-semibold text-ink2">방장</p>
            <div className="flex items-center gap-3">
              <Avatar src={data.hostProfileImageUrl} name={data.hostNickname} size={44} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{data.hostNickname}</p>
                <p className="truncate text-[12px] text-muted">
                  {[formatAgeBand(data.hostBirthYear), formatGender(data.hostGender)]
                    .filter(Boolean)
                    .join(" · ") || "정보 비공개"}
                </p>
              </div>
              {data.hostPhoneVerified && <Badge tone="teal">인증</Badge>}
            </div>
            {data.snsHandle && (
              <p className="mt-3 text-[13px] text-ink2">SNS · {data.snsHandle}</p>
            )}
            <p className="mt-3 text-[12px] text-muted">개설 {formatDateFull(data.createdAt)}</p>
            {!isHost && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="mt-3 text-[12px] font-medium text-muted hover:text-[#b21232]"
              >
                신고하기
              </button>
            )}
          </Card>
        </div>
      </div>

      {/* ─── 참여 신청 모달 ─── */}
      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="참여 신청"
        footer={
          <>
            <Button variant="ghost" onClick={() => setApplyOpen(false)}>
              취소
            </Button>
            <Button loading={busy} onClick={() => void submitApply()}>
              신청 보내기
            </Button>
          </>
        }
      >
        <Field label="자기소개" hint="방장이 승인 여부를 판단할 때 참고합니다.">
          <Textarea
            value={introduction}
            onChange={(e) => setIntroduction(e.target.value)}
            placeholder="어떤 여행을 좋아하는지, 왜 이 동행에 참여하고 싶은지 적어 주세요."
          />
        </Field>
      </Modal>

      {/* ─── 인원 미달 결정 모달 ─── */}
      <Modal
        open={decisionOpen}
        onClose={() => setDecisionOpen(false)}
        title="최소 인원 미달 — 어떻게 할까요?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecisionOpen(false)}>
              닫기
            </Button>
            <Button
              loading={busy}
              onClick={() => {
                setDecisionOpen(false);
                void run(
                  () =>
                    companionApi.decide(
                      id,
                      decision,
                      newStart || undefined,
                      newEnd || undefined,
                    ),
                  "결정을 반영했습니다.",
                );
              }}
            >
              적용
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="결정">
            <Select value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)}>
              <option value="CONTINUE">소규모로 그대로 진행 (확정)</option>
              <option value="POSTPONE">일정을 연기하고 다시 모집</option>
              <option value="CANCEL">동행 취소</option>
            </Select>
          </Field>
          {decision === "POSTPONE" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="새 출발일">
                <input
                  type="date"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full rounded-[12px] border border-line px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                />
              </Field>
              <Field label="새 종료일">
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
  return (
    <>
      <Link href={`/companions/${companionId}/applicants`} className="block">
        <Button className="w-full">신청자 관리</Button>
      </Link>
      <Link href={`/companions/${companionId}/chat`} className="block">
        <Button variant="outline" className="w-full">
          그룹 채팅
        </Button>
      </Link>

      {status === "RECRUITING" && (
        <>
          <Button variant="outline" className="w-full" loading={busy} onClick={onClose}>
            모집 마감
          </Button>
          <Button variant="secondary" className="w-full" loading={busy} onClick={onBoost}>
            모집글 부스트
          </Button>
        </>
      )}
      {status === "UNDER_MINIMUM" && (
        <Button variant="outline" className="w-full" onClick={onDecision}>
          인원 미달 — 결정하기
        </Button>
      )}
      {status === "CONFIRMED" && (
        <Button variant="outline" className="w-full" loading={busy} onClick={onStart}>
          여행 시작
        </Button>
      )}
      {status === "IN_PROGRESS" && (
        <Button variant="outline" className="w-full" loading={busy} onClick={onComplete}>
          여행 완료
        </Button>
      )}
      {status !== "COMPLETED" && status !== "CANCELED" && (
        <Button variant="ghost" className="w-full" loading={busy} onClick={onCancel}>
          동행 취소
        </Button>
      )}
    </>
  );
}
