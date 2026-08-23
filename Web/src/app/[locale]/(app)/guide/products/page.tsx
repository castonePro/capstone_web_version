"use client";

/** Flutter features/guide/ui/guide_product_page.dart 대응 — 가이드 상품 관리 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { guideApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useFormat } from "@/lib/i18n/useFormat";
import { Button, EmptyState, ErrorState, LoadingBlock, Modal, PageHeader } from "@/components/ui";
import { GuideProductCard } from "@/components/cards";

export default function GuideProductsPage() {
  const t = useTranslations("guideProducts");
  const c = useTranslations("common");
  const f = useFormat();
  const { data, loading, error, reload } = useAsync(() => guideApi.myProducts(), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<unknown>, message: string) {
    setBusy(id);
    try {
      await fn();
      setToast(message);
      reload();
    } catch (e) {
      setToast(f.apiError(e));
    } finally {
      setBusy(null);
      setConfirmDelete(null);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Link href="/guide/products/new">
            <Button size="sm">{t("create")}</Button>
          </Link>
        }
      />

      {toast && (
        <div className="mb-4 rounded-[12px] border border-line bg-sand px-4 py-3 text-[13px] text-ink2">
          {toast}
        </div>
      )}

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Link href="/guide/products/new">
              <Button size="sm">{t("create")}</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data!.map((p) => (
            <GuideProductCard
              key={p.serviceId}
              product={p}
              footer={
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={p.isPublished ? "outline" : "primary"}
                    loading={busy === p.serviceId}
                    onClick={() =>
                      void run(
                        p.serviceId,
                        () => guideApi.togglePublish(p.serviceId),
                        p.isPublished ? t("toastUnpublished") : t("toastPublished"),
                      )
                    }
                  >
                    {p.isPublished ? t("unpublish") : t("publish")}
                  </Button>
                  <Link href={`/guide/products/${p.serviceId}/edit`}>
                    <Button size="sm" variant="secondary">
                      {c("edit")}
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(p.serviceId)}>
                    {c("delete")}
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={t("deleteConfirmTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              {c("cancel")}
            </Button>
            <Button
              variant="danger"
              loading={busy === confirmDelete}
              onClick={() =>
                confirmDelete &&
                void run(confirmDelete, () => guideApi.remove(confirmDelete), t("toastDeleted"))
              }
            >
              {c("delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink2">{t("deleteConfirmBody")}</p>
      </Modal>
    </div>
  );
}
