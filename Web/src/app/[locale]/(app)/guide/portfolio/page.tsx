"use client";

/** Flutter features/guide/ui/portfolio_page.dart 대응 — 게시된 내 상품 + 받은 리뷰 */
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { guideApi, reviewApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFormat } from "@/lib/i18n/useFormat";
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
import { TranslatableText } from "@/components/TranslatableText";

export default function PortfolioPage() {
  const t = useTranslations("portfolio");
  const tp = useTranslations("guideProducts");
  const f = useFormat();
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
        title={t("title")}
        description={t("description")}
        action={
          <Link href="/guide/products">
            <Button size="sm" variant="outline">
              {tp("title")}
            </Button>
          </Link>
        }
      />

      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[13px] text-muted">{t("publishedCount")}</p>
            <p className="mt-1 text-2xl font-semibold">{products.data?.length ?? "-"}</p>
          </div>
          <div>
            <p className="text-[13px] text-muted">{t("averageRating")}</p>
            <p className="mt-1 text-2xl font-semibold">
              {summary.data?.averageRating != null
                ? Number(summary.data.averageRating).toFixed(1)
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-[13px] text-muted">{t("reviewCount")}</p>
            <p className="mt-1 text-2xl font-semibold">{summary.data?.reviewCount ?? "-"}</p>
          </div>
        </div>
      </Card>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">{t("publishedProducts")}</h2>
        {products.loading ? (
          <LoadingBlock />
        ) : products.error ? (
          <ErrorState error={products.error} onRetry={products.reload} />
        ) : (products.data ?? []).length === 0 ? (
          <EmptyState
            title={t("emptyProductsTitle")}
            description={t("emptyProductsBody")}
            action={
              <Link href="/guide/products">
                <Button size="sm">{tp("title")}</Button>
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
        <h2 className="mb-3 text-base font-semibold">{t("receivedReviews")}</h2>
        {reviews.loading ? (
          <LoadingBlock />
        ) : (reviews.data ?? []).length === 0 ? (
          <EmptyState title={t("noReviews")} />
        ) : (
          <div className="space-y-3">
            {reviews.data!.map((r) => (
              <Card key={r.reviewId}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={r.userNickname} size={36} />
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
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
