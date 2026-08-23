"use client";

/**
 * Flutter features/guide/ui/guide_detail_page.dart 대응.
 * 백엔드에 단건 조회(GET /guide/products/{id})가 없어 목록에서 찾아 쓴다 — 앱과 동일한 방식.
 */
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { chatApi, guideApi, reviewApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useFormat } from "@/lib/i18n/useFormat";
import { recentViews } from "@/lib/storage/recentViews";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingBlock,
  Modal,
  Rating,
  RatingInput,
  Tag,
  Textarea,
} from "@/components/ui";
import { TranslatableText } from "@/components/TranslatableText";
import { IconBack } from "@/components/layout/icons";

export default function GuideDetailPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = use(params);
  const router = useRouter();
  const t = useTranslations("guides");
  const c = useTranslations("common");
  const f = useFormat();

  const products = useAsync(() => guideApi.products(), []);
  const product = products.data?.find((p) => p.serviceId === serviceId) ?? null;

  const reviews = useAsync(
    () => (product ? reviewApi.byGuide(product.guideUserId) : Promise.resolve([])),
    [product?.guideUserId],
  );
  const summary = useAsync(
    () => (product ? reviewApi.summary(product.guideUserId) : Promise.resolve(null)),
    [product?.guideUserId],
  );

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!product) return;
    recentViews.record({
      type: "guide",
      id: product.serviceId,
      title: product.title,
      subtitle: `${product.region} · ${product.guideName}`,
      imageUrl: "",
    });
  }, [product]);

  async function inquire() {
    if (!product) return;
    setBusy(true);
    try {
      const room = await chatApi.createDirect(product.guideUserId);
      router.push(`/chat/${room.roomId}`);
    } catch (e) {
      setToast(f.apiError(e));
      setBusy(false);
    }
  }

  async function submitReview() {
    if (!product) return;
    setBusy(true);
    try {
      await reviewApi.create({
        guideId: product.guideUserId,
        serviceId: product.serviceId,
        rating,
        content: content.trim() || undefined,
      });
      setReviewOpen(false);
      setContent("");
      setToast(t("reviewPosted"));
      reviews.reload();
      summary.reload();
    } catch (e) {
      setToast(f.apiError(e));
    } finally {
      setBusy(false);
    }
  }

  if (products.loading) return <LoadingBlock />;
  if (products.error) return <ErrorState error={products.error} onRetry={products.reload} />;
  if (!product) {
    return (
      <EmptyState
        title={t("notFoundTitle")}
        description={t("notFoundBody")}
        action={
          <Link href="/guides">
            <Button size="sm">{t("backToList")}</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <Link
        href="/guides"
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
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="accent">{product.region}</Badge>
              {product.hasCar && <Badge tone="teal">{t("hasCar")}</Badge>}
            </div>
            <h1 className="mt-2.5 text-2xl font-semibold tracking-tight">{product.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {t("guideName", { name: product.guideName })}
            </p>
          </div>

          <Card>
            <h2 className="mb-2 text-base font-semibold">{t("about")}</h2>
            <TranslatableText text={product.description} className="text-sm text-ink2" />
          </Card>

          <Card>
            <h2 className="mb-3 text-base font-semibold">{t("meetingPoint")}</h2>
            <p className="text-sm font-medium">{product.meetingPoint}</p>
            {product.meetingPointDesc && (
              <TranslatableText
                text={product.meetingPointDesc}
                className="mt-1 text-[13px] text-ink2"
              />
            )}
          </Card>

          {(product.includedItems?.length || product.excludedItems?.length) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {product.includedItems && product.includedItems.length > 0 && (
                <Card>
                  <h3 className="mb-2 text-[13px] font-semibold text-ink2">{t("included")}</h3>
                  <ul className="space-y-1 text-[13px] text-ink2">
                    {product.includedItems.map((i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-[#25a35a]">✓</span>
                        {i}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {product.excludedItems && product.excludedItems.length > 0 && (
                <Card>
                  <h3 className="mb-2 text-[13px] font-semibold text-ink2">{t("excluded")}</h3>
                  <ul className="space-y-1 text-[13px] text-ink2">
                    {product.excludedItems.map((i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted">✕</span>
                        {i}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}

          {/* 리뷰 */}
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                {t("reviews")}{" "}
                {summary.data && (
                  <span className="ml-1 text-[13px] font-normal text-muted">
                    {summary.data.reviewCount}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-3">
                {summary.data && <Rating value={summary.data.averageRating} />}
                <Button size="sm" variant="outline" onClick={() => setReviewOpen(true)}>
                  {t("writeReview")}
                </Button>
              </div>
            </div>
            {reviews.loading ? (
              <p className="text-[13px] text-muted">{c("loading")}</p>
            ) : (reviews.data ?? []).length === 0 ? (
              <p className="text-[13px] text-muted">{t("noReviews")}</p>
            ) : (
              <ul className="space-y-4">
                {reviews.data!.map((r) => (
                  <li
                    key={r.reviewId}
                    className="border-t border-line pt-4 first:border-0 first:pt-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.userNickname} size={32} />
                        <div>
                          <p className="text-[13px] font-semibold">{r.userNickname}</p>
                          <p className="text-[11px] text-muted">{f.dateFull(r.createdAt)}</p>
                        </div>
                      </div>
                      <Rating value={r.rating} />
                    </div>
                    {r.content && (
                      <TranslatableText text={r.content} className="mt-2 text-[13px] text-ink2" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* 사이드 */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <p className="text-[13px] text-muted">{t("pricePerPerson")}</p>
            <p className="mt-1 text-2xl font-semibold">{f.price(product.pricePerPerson)}</p>

            <dl className="mt-4 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">{t("duration")}</dt>
                <dd className="font-medium">{f.minutes(product.durationMinutes)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{t("capacity")}</dt>
                <dd className="font-medium">{product.maxCapacity}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-muted">{t("languages")}</dt>
                <dd className="text-right font-medium">
                  {product.availableLanguages?.join(", ") || "-"}
                </dd>
              </div>
            </dl>

            <Button className="mt-4 w-full" loading={busy} onClick={() => void inquire()}>
              {t("inquire")}
            </Button>
          </Card>

          {product.relatedMaterials && product.relatedMaterials.length > 0 && (
            <Card>
              <h3 className="mb-2 text-[13px] font-semibold text-ink2">{t("whatToBring")}</h3>
              <div className="flex flex-wrap gap-1.5">
                {product.relatedMaterials.map((m) => (
                  <Tag key={m}>{m}</Tag>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title={t("writeReview")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>
              {c("cancel")}
            </Button>
            <Button loading={busy} onClick={() => void submitReview()}>
              {c("submit")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t("rating")} required>
            <RatingInput value={rating} onChange={setRating} />
          </Field>
          <Field label={t("reviewContent")}>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("reviewPlaceholder")}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
