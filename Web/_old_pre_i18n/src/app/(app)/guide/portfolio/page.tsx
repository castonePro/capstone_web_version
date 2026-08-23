"use client";

/** Flutter features/guide/ui/portfolio_page.dart 대응 — 게시된 내 상품 + 받은 리뷰 */
import Link from "next/link";
import { guideApi, reviewApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Rating,
} from "@/components/ui";
import { GuideProductCard } from "@/components/cards";
import { formatDateFull } from "@/lib/utils/format";

export default function PortfolioPage() {
  const { userId } = useAuth();
  const products = useAsync(() => guideApi.myPublishedProducts(), []);
  const summary = useAsync(
    () => (userId ? reviewApi.summary(userId) : Promise.resolve(null)),
    [userId],
  );
  const reviews = useAsync(
    () => (userId ? reviewApi.byGuide(userId) : Promise.resolve([])),
    [userId],
  );

  return (
    <div>
      <PageHeader
        title="포트폴리오"
        description="사용자에게 공개되는 내 상품과 받은 리뷰입니다."
        action={
          <Link href="/guide/products">
            <Button size="sm" variant="outline">
              상품 관리
            </Button>
          </Link>
        }
      />

      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[13px] text-muted">게시중 상품</p>
            <p className="mt-1 text-2xl font-semibold">{products.data?.length ?? "-"}</p>
          </div>
          <div>
            <p className="text-[13px] text-muted">평균 평점</p>
            <p className="mt-1 text-2xl font-semibold">
              {summary.data?.averageRating != null
                ? Number(summary.data.averageRating).toFixed(1)
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-[13px] text-muted">리뷰 수</p>
            <p className="mt-1 text-2xl font-semibold">{summary.data?.reviewCount ?? "-"}</p>
          </div>
        </div>
      </Card>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">게시중인 상품</h2>
        {products.loading ? (
          <LoadingBlock />
        ) : products.error ? (
          <ErrorState message={products.error} onRetry={products.reload} />
        ) : (products.data ?? []).length === 0 ? (
          <EmptyState
            title="게시중인 상품이 없습니다"
            description="상품 관리에서 게시하기를 눌러 공개해 보세요."
            action={
              <Link href="/guide/products">
                <Button size="sm">상품 관리로</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {products.data!.map((p) => (
              <GuideProductCard key={p.serviceId} product={p} href={`/guides/${p.serviceId}`} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">받은 리뷰</h2>
        {reviews.loading ? (
          <LoadingBlock />
        ) : (reviews.data ?? []).length === 0 ? (
          <EmptyState title="아직 받은 리뷰가 없습니다" />
        ) : (
          <div className="space-y-3">
            {reviews.data!.map((r) => (
              <Card key={r.reviewId}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={r.userNickname} size={36} />
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
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
