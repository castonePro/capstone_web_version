"use client";

/** Flutter features/guideconversion/ui/guide_conversion_page.dart 대응 — 예비 가이드 → 정식 가이드 전환 */
import Link from "next/link";
import { useState } from "react";
import { guideConversionApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingBlock,
  PageHeader,
  Textarea,
  cx,
} from "@/components/ui";
import { errorMessage, formatDateFull } from "@/lib/utils/format";

function Requirement({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cx(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold",
          ok ? "bg-[#e7f6ec] text-[#136c33]" : "bg-sand text-muted",
        )}
      >
        {ok ? "✓" : "–"}
      </span>
      <div>
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        <p className="text-[12px] text-muted">{detail}</p>
      </div>
    </li>
  );
}

export default function GuideConversionPage() {
  const status = useAsync(() => guideConversionApi.status(), []);
  const applications = useAsync(() => guideConversionApi.myApplications(), []);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function apply() {
    setBusy(true);
    try {
      await guideConversionApi.apply(message.trim() || undefined);
      setMessage("");
      setToast("전환 신청을 접수했습니다. 운영자 심사 후 알림으로 알려드립니다.");
      status.reload();
      applications.reload();
    } catch (e) {
      setToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (status.loading) return <LoadingBlock />;
  if (status.error) return <ErrorState message={status.error} onRetry={status.reload} />;
  const s = status.data;
  if (!s) return null;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="가이드 전환"
        description="동행 이력이 쌓이면 정식 가이드로 전환을 신청할 수 있습니다."
      />

      {toast && (
        <div className="mb-4 rounded-[12px] border border-line bg-sand px-4 py-3 text-[13px] text-ink2">
          {toast}
        </div>
      )}

      {s.alreadyGuide ? (
        <Card className="mb-6 border-[#bfe6cd] bg-[#e7f6ec]">
          <p className="text-sm font-semibold text-[#136c33]">이미 가이드로 등록되어 있습니다</p>
          <p className="mt-1 text-[13px] text-ink2">
            사이드바에서 가이드 모드로 전환해 상품을 관리할 수 있습니다.
          </p>
          <Link href="/guide/products" className="mt-3 inline-block">
            <Button size="sm">상품 관리로</Button>
          </Link>
        </Card>
      ) : (
        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">전환 조건</h2>
            {s.preliminaryGuide && <Badge tone="accent">예비 가이드</Badge>}
          </div>
          <ul className="space-y-3">
            <Requirement
              label="방장 경험 3회 이상"
              ok={s.meetsHostRequirement}
              detail={`현재 ${s.companionHostCount}회`}
            />
            <Requirement
              label="동행 참여 3회 이상"
              ok={s.meetsJoinRequirement}
              detail={`현재 ${s.companionJoinCount}회`}
            />
            <Requirement
              label="일정 운영 평가 4.0 이상"
              ok={s.meetsRatingRequirement}
              detail={
                s.operationAverageRating != null
                  ? `현재 ${Number(s.operationAverageRating).toFixed(1)}점`
                  : "아직 평가 없음"
              }
            />
          </ul>

          <div className="mt-5 border-t border-line pt-4">
            {s.latestApplication?.status === "PENDING" ? (
              <p className="text-[13px] text-ink2">
                이미 심사 대기중인 신청이 있습니다. 결과를 기다려 주세요.
              </p>
            ) : (
              <>
                <Field label="신청 메시지" hint="선택 — 각오나 강점을 적어 주세요.">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="어떤 가이드가 되고 싶은지 적어 주세요."
                    disabled={!s.eligible}
                  />
                </Field>
                <Button className="mt-3" disabled={!s.eligible} loading={busy} onClick={() => void apply()}>
                  {s.eligible ? "정식 가이드 전환 신청" : "조건을 먼저 충족해 주세요"}
                </Button>
              </>
            )}
          </div>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold">신청 이력</h2>
        {applications.loading ? (
          <LoadingBlock />
        ) : (applications.data ?? []).length === 0 ? (
          <EmptyState title="신청 이력이 없습니다" />
        ) : (
          <div className="space-y-3">
            {applications.data!.map((a) => (
              <Card key={a.applicationId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge
                      tone={
                        a.status === "APPROVED"
                          ? "success"
                          : a.status === "REJECTED"
                            ? "danger"
                            : "accent"
                      }
                    >
                      {a.status === "APPROVED"
                        ? "승인"
                        : a.status === "REJECTED"
                          ? "거절"
                          : "심사 대기"}
                    </Badge>
                    <p className="mt-2 text-[13px] text-ink2">{a.message || "메시지 없음"}</p>
                  </div>
                  <p className="shrink-0 text-[12px] text-muted">{formatDateFull(a.appliedAt)}</p>
                </div>
                {a.reviewNote && (
                  <p className="mt-3 rounded-[12px] bg-sand px-3 py-2.5 text-[13px] text-ink2">
                    운영자 메모 · {a.reviewNote}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {s.alreadyGuide === false && s.latestApplication?.status === "APPROVED" && (
        <Card className="mt-6 border-coral-200 bg-coral-50">
          <p className="text-sm font-semibold">전환 승인 완료 — 프로필을 마저 입력하세요</p>
          <p className="mt-1 text-[13px] text-ink2">
            활동 지역·언어·소개를 등록해야 최종적으로 가이드가 됩니다.
          </p>
          <Link href="/guide/register" className="mt-3 inline-block">
            <Button size="sm">가이드 프로필 등록</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
