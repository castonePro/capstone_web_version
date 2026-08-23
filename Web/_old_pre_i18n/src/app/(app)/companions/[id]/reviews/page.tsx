"use client";

/** Flutter features/companion/ui/companion_review_page.dart 대응 — 더블 블라인드 상호 평가 */
import Link from "next/link";
import { use, useState } from "react";
import { companionApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  LoadingBlock,
  Modal,
  PageHeader,
  Rating,
  RatingInput,
  Tag,
  Textarea,
} from "@/components/ui";
import { errorMessage, formatDateFull } from "@/lib/utils/format";
import type { ReviewableMember } from "@/lib/api/types";
import { IconBack } from "@/components/layout/icons";

const TAG_OPTIONS = [
  "시간 약속",
  "매너 좋음",
  "소통 원활",
  "유쾌함",
  "배려심",
  "일정 잘 챙김",
  "사진 잘 찍어줌",
];

export default function CompanionReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const members = useAsync(() => companionApi.reviewableMembers(id), [id]);
  const received = useAsync(() => companionApi.receivedReviews(id), [id]);

  const [target, setTarget] = useState<ReviewableMember | null>(null);
  const [rating, setRating] = useState(5);
  const [operationRating, setOperationRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function openFor(m: ReviewableMember) {
    setTarget(m);
    setRating(5);
    setOperationRating(5);
    setTags([]);
    setComment("");
  }

  async function submit() {
    if (!target) return;
    setBusy(true);
    try {
      await companionApi.submitReview(id, {
        revieweeId: target.userId,
        rating,
        tags: tags.length ? tags : undefined,
        comment: comment.trim() || undefined,
        ...(target.isHost ? { operationRating } : {}),
      });
      setTarget(null);
      setToast("평가를 제출했습니다. 상대도 평가를 남기거나 7일이 지나면 공개됩니다.");
      members.reload();
      received.reload();
    } catch (e) {
      setToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

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
        title="동행 평가"
        description="더블 블라인드 — 상대도 평가를 제출했거나 여행 완료 후 7일이 지나면 서로에게 공개됩니다."
      />

      {toast && (
        <div className="mb-4 rounded-[12px] border border-line bg-sand px-4 py-3 text-[13px] text-ink2">
          {toast}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base font-semibold">평가할 사람</h2>
          {members.loading ? (
            <LoadingBlock />
          ) : members.error ? (
            <ErrorState message={members.error} onRetry={members.reload} />
          ) : (members.data ?? []).length === 0 ? (
            <EmptyState title="평가할 대상이 없습니다" />
          ) : (
            <div className="space-y-3">
              {members.data!.map((m) => (
                <Card key={m.userId}>
                  <div className="flex items-center gap-3">
                    <Avatar src={m.profileImageUrl} name={m.nickname} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{m.nickname}</p>
                        {m.isHost && <Badge tone="accent">방장</Badge>}
                      </div>
                      <p className="text-[12px] text-muted">
                        {m.alreadyReviewed ? "평가 완료" : "아직 평가하지 않음"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={m.alreadyReviewed ? "ghost" : "primary"}
                      disabled={m.alreadyReviewed}
                      onClick={() => openFor(m)}
                    >
                      {m.alreadyReviewed ? "완료" : "평가하기"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">
            내가 받은 평가
            {received.data && received.data.pendingCount > 0 && (
              <Badge tone="neutral" className="ml-2">
                공개 대기 {received.data.pendingCount}건
              </Badge>
            )}
          </h2>
          {received.loading ? (
            <LoadingBlock />
          ) : received.error ? (
            <ErrorState message={received.error} onRetry={received.reload} />
          ) : (received.data?.reviews ?? []).length === 0 ? (
            <EmptyState
              title="공개된 평가가 없습니다"
              description="상대가 평가를 제출하거나 완료 후 7일이 지나면 볼 수 있습니다."
            />
          ) : (
            <div className="space-y-3">
              {received.data!.reviews.map((r) => (
                <Card key={r.reviewId}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{r.reviewerNickname}</p>
                      <p className="text-[12px] text-muted">{formatDateFull(r.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <Rating value={r.rating} />
                      {r.operationRating != null && (
                        <p className="mt-0.5 text-[12px] text-muted">
                          운영 {Number(r.operationRating).toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>
                  {r.tags && r.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.tags.map((t) => (
                        <Tag key={t}>{t}</Tag>
                      ))}
                    </div>
                  )}
                  {r.comment && (
                    <p className="mt-2 text-[13px] leading-relaxed text-ink2">{r.comment}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={`${target?.nickname ?? ""} 님 평가`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              취소
            </Button>
            <Button loading={busy} onClick={() => void submit()}>
              평가 제출
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="전체 평점" required>
            <RatingInput value={rating} onChange={setRating} />
          </Field>

          {target?.isHost && (
            <Field label="일정 운영 평가" hint="방장이 일정을 얼마나 잘 이끌었는지">
              <RatingInput value={operationRating} onChange={setOperationRating} />
            </Field>
          )}

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink2">태그</p>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => (
                <Chip
                  key={t}
                  active={tags.includes(t)}
                  onClick={() =>
                    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
                  }
                >
                  {t}
                </Chip>
              ))}
            </div>
          </div>

          <Field label="한마디">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="함께한 여행은 어땠나요?"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
