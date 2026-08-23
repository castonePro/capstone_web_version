"use client";

/** Flutter features/guide/ui/guide_product_page.dart 대응 — 가이드 상품 관리 */
import Link from "next/link";
import { useState } from "react";
import { guideApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  PageHeader,
} from "@/components/ui";
import { GuideProductCard } from "@/components/cards";
import { errorMessage } from "@/lib/utils/format";

export default function GuideProductsPage() {
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
      setToast(errorMessage(e));
    } finally {
      setBusy(null);
      setConfirmDelete(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="상품 관리"
        description="등록한 가이드 상품을 관리합니다. 게시해야 사용자 탐색 화면에 노출됩니다."
        action={
          <Link href="/guide/products/new">
            <Button size="sm">상품 등록</Button>
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
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="등록한 상품이 없습니다"
          description="첫 상품을 등록하고 게시해 보세요."
          action={
            <Link href="/guide/products/new">
              <Button size="sm">상품 등록</Button>
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
                        p.isPublished ? "게시를 중단했습니다." : "상품을 게시했습니다.",
                      )
                    }
                  >
                    {p.isPublished ? "게시 중단" : "게시하기"}
                  </Button>
                  <Link href={`/guide/products/${p.serviceId}/edit`}>
                    <Button size="sm" variant="secondary">
                      수정
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(p.serviceId)}>
                    삭제
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
        title="상품을 삭제할까요?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              취소
            </Button>
            <Button
              variant="danger"
              loading={busy === confirmDelete}
              onClick={() =>
                confirmDelete &&
                void run(
                  confirmDelete,
                  () => guideApi.remove(confirmDelete),
                  "상품을 삭제했습니다.",
                )
              }
            >
              삭제
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink2">삭제한 상품은 되돌릴 수 없습니다.</p>
      </Modal>
    </div>
  );
}
