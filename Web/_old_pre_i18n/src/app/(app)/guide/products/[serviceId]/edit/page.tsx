"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import { guideApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { GuideProductForm } from "@/components/GuideProductForm";
import { EmptyState, ErrorState, LoadingBlock, PageHeader } from "@/components/ui";

export default function EditGuideProductPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = use(params);
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => guideApi.myProducts(), []);
  const product = data?.find((p) => p.serviceId === serviceId);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!product) return <EmptyState title="상품을 찾을 수 없습니다" />;

  return (
    <div>
      <PageHeader title="상품 수정" description={product.title} />
      <GuideProductForm
        initial={product}
        submitLabel="수정 저장"
        onSubmit={async (body) => {
          await guideApi.update(serviceId, body);
          router.replace("/guide/products");
        }}
      />
    </div>
  );
}
