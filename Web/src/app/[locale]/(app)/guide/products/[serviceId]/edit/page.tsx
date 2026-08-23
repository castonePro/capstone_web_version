"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
  const t = useTranslations("guideProducts");
  const { data, loading, error, reload } = useAsync(() => guideApi.myProducts(), []);
  const product = data?.find((p) => p.serviceId === serviceId);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!product) return <EmptyState title={t("notFound")} />;

  return (
    <div>
      <PageHeader title={t("edit")} description={product.title} />
      <GuideProductForm
        initial={product}
        submitLabel={t("saveEdit")}
        onSubmit={async (body) => {
          await guideApi.update(serviceId, body);
          router.replace("/guide/products");
        }}
      />
    </div>
  );
}
