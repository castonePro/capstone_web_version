"use client";

/** Flutter features/companion/ui/companion_review_page.dart 대응 — 더블 블라인드 상호 평가 */
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
import { TranslatableText } from "@/components/TranslatableText";
import type { ReviewableMember } from "@/lib/api/types";
import { IconBack } from "@/components/layout/icons";

const TAG_KEYS = [
  "punctual",
  "polite",
  "communicative",
  "cheerful",
  "considerate",
  "organized",
  "goodPhotos",
] as const;

export default function CompanionReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("reviews");
  const tc = useTranslations("companions");
  const c = useTranslations("common");
  const f = useFormat();

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
      setToast(t("submitted"));
      members.reload();
      received.reload();
    } catch (e) {
      setToast(f.apiError(e));
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
        {tc("detailTitle")}
      </Link>

      <PageHeader title={t("title")} description={t("description")} />

      {toast && (
        <div className="mb-4 rounded-[12px] border border-line bg-sand px-4 py-3 text-[13px] text-ink2">
          {toast}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base font-semibold">{t("peopleToReview")}</h2>
          {members.loading ? (
            <LoadingBlock />
          ) : members.error ? (
            <ErrorState error={members.error} onRetry={members.reload} />
          ) : (members.data ?? []).length === 0 ? (
            <EmptyState title={t("noTargets")} />
          ) : (
            <div className="space-y-3">
              {members.data!.map((m) => (
                <Card key={m.userId}>
                  <div className="flex items-center gap-3">
                    <Avatar src={m.profileImageUrl} name={m.nickname} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{m.nickname}</p>
                        {m.isHost && <Badge tone="accent">{tc("hostBadge")}</Badge>}
                      </div>
                      <p className="text-[12px] text-muted">
                        {m.alreadyReviewed ? t("alreadyReviewed") : t("notYetReviewed")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={m.alreadyReviewed ? "ghost" : "primary"}
                      disabled={m.alreadyReviewed}
                      onClick={() => openFor(m)}
                    >
                      {m.alreadyReviewed ? c("done") : t("writeReview")}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">
            {t("receivedReviews")}
            {received.data && received.data.pendingCount > 0 && (
              <Badge tone="neutral" className="ml-2">
                {t("pendingCount", { count: received.data.pendingCount })}
              </Badge>
            )}
          </h2>
          {received.loading ? (
            <LoadingBlock />
          ) : received.error ? (
            <ErrorState error={received.error} onRetry={received.reload} />
          ) : (received.data?.reviews ?? []).length === 0 ? (
            <EmptyState title={t("noReceivedTitle")} description={t("noReceivedBody")} />
          ) : (
            <div className="space-y-3">
              {received.data!.reviews.map((r) => (
                <Card key={r.reviewId}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{r.reviewerNickname}</p>
                      <p className="text-[12px] text-muted">{f.dateFull(r.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <Rating value={r.rating} />
                      {r.operationRating != null && (
                        <p className="mt-0.5 text-[12px] text-muted">
                          {t("operationScore", { value: Number(r.operationRating).toFixed(1) })}
                        </p>
                      )}
                    </div>
                  </div>
                  {r.tags && r.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </div>
                  )}
                  {r.comment && (
                    <TranslatableText text={r.comment} className="mt-2 text-[13px] text-ink2" />
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
        title={t("reviewOf", { name: target?.nickname ?? "" })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              {c("cancel")}
            </Button>
            <Button loading={busy} onClick={() => void submit()}>
              {t("submit")}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label={t("overallRating")} required>
            <RatingInput value={rating} onChange={setRating} />
          </Field>

          {target?.isHost && (
            <Field label={t("operationRating")} hint={t("operationRatingHint")}>
              <RatingInput value={operationRating} onChange={setOperationRating} />
            </Field>
          )}

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink2">{t("tags")}</p>
            <div className="flex flex-wrap gap-2">
              {TAG_KEYS.map((k) => {
                const label = t(`tagOptions.${k}`);
                return (
                  <Chip
                    key={k}
                    active={tags.includes(label)}
                    onClick={() =>
                      setTags((prev) =>
                        prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
                      )
                    }
                  >
                    {label}
                  </Chip>
                );
              })}
            </div>
          </div>

          <Field label={t("comment")}>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("commentPlaceholder")}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
