"use client";

/**
 * Flutter features/guide/ui/guide_detail_page.dart 대응.
 * 백엔드에 단건 조회(GET /guide/products/{id})가 없어 목록에서 찾아 쓴다 — 앱과 동일한 방식.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { chatApi, guideApi, reviewApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
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
import { errorMessage, formatDateFull, formatMinutes, formatPrice } from "@/lib/utils/format";
import { IconBack } from "@/components/layout/icons";

export default function GuideDetailPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = use(params);
  const router = useRouter();

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
      setToast(errorMessage(e));
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
      setToast("리뷰를 등록했습니다.");
      reviews.reload();
      summary.reload();
    } catch (e) {
      setToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (products.loading) return <LoadingBlock />;
  if (products.error) return <ErrorState message={products.error} onRetry={products.reload} />;
  if (!product) {
    return (
      <EmptyState
        title="상품을 찾을 수 없습니다"
        description="게시가 취소되었거나 삭제된 상품일 수 있습니다."
        action={
          <Link href="/guides">
            <Button size="sm">가이드 목록으로</Button>
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
        가이드 찾기
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
              {product.hasCar && <Badge tone="teal">차량 보유</Badge>}
            </div>
            <h1 className="mt-2.5 text-2xl font-semibold tracking-tight">{product.title}</h1>
            <p className="mt-1 text-sm text-muted">{product.guideName} 가이드</p>
          </div>

          <Card>
            <h2 className="mb-2 text-base font-semibold">상품 소개</h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-ink2">
              {product.description}
            </p>
          </Card>

          <Card>
            <h2 className="mb-3 text-base font-semibold">만나는 곳</h2>
            <p className="text-sm font-medium">{product.meetingPoint}</p>
            {product.meetingPointDesc && (
              <p className="mt-1 text-[13px] leading-relaxed text-ink2">
                {product.meetingPointDesc}
              </p>
            )}
          </Card>

          {(product.includedItems?.length || product.excludedItems?.length) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {product.includedItems && product.includedItems.length > 0 && (
                <Card>
                  <h3 className="mb-2 text-[13px] font-semibold text-ink2">포함 사항</h3>
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
                  <h3 className="mb-2 text-[13px] font-semibold text-ink2">불포함 사항</h3>
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
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                리뷰{" "}
                {summary.data && (
                  <span className="ml-1 text-[13px] font-normal text-muted">
                    {summary.data.reviewCount}개
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-3">
                {summary.data && <Rating value={summary.data.averageRating} />}
                <Button size="sm" variant="outline" onClick={() => setReviewOpen(true)}>
                  리뷰 쓰기
                </Button>
              </div>
            </div>
            {reviews.loading ? (
              <p className="text-[13px] text-muted">불러오는 중…</p>
            ) : (reviews.data ?? []).length === 0 ? (
              <p className="text-[13px] text-muted">아직 리뷰가 없습니다.</p>
            ) : (
              <ul className="space-y-4">
                {reviews.data!.map((r) => (
                  <li key={r.reviewId} className="border-t border-line pt-4 first:border-0 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.userNickname} size={32} />
                        <div>
                          <p className="text-[13px] font-semibold">{r.userNickname}</p>
                          <p className="text-[11px] text-muted">{formatDateFull(r.createdAt)}</p>
                        </div>
                      </div>
                      <Rating value={r.rating} />
                    </div>
                    {r.content && (
                      <p className="mt-2 text-[13px] leading-relaxed text-ink2">{r.content}</p>
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
            <p className="text-[13px] text-muted">1인 요금</p>
            <p className="mt-1 text-2xl font-semibold">{formatPrice(product.pricePerPerson)}</p>

            <dl className="mt-4 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">소요 시간</dt>
                <dd className="font-medium">{formatMinutes(product.durationMinutes)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">최대 인원</dt>
                <dd className="font-medium">{product.maxCapacity}명</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-muted">가능 언어</dt>
                <dd className="text-right font-medium">
                  {product.availableLanguages?.join(", ") || "-"}
                </dd>
              </div>
            </dl>

            <Button className="mt-4 w-full" loading={busy} onClick={() => void inquire()}>
              가이드에게 문의하기
            </Button>
          </Card>

          {product.relatedMaterials && product.relatedMaterials.length > 0 && (
            <Card>
              <h3 className="mb-2 text-[13px] font-semibold text-ink2">준비물</h3>
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
        title="리뷰 작성"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>
              취소
            </Button>
            <Button loading={busy} onClick={() => void submitReview()}>
              등록
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="평점" required>
            <RatingInput value={rating} onChange={setRating} />
          </Field>
          <Field label="내용">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="가이드와 함께한 경험은 어땠나요?"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
