"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { guideApi } from "@/lib/api/endpoints";
import { GuideProductForm } from "@/components/GuideProductForm";
import { PageHeader } from "@/components/ui";

export default function NewGuideProductPage() {
  const router = useRouter();
  const t = useTranslations("guideProducts");
  return (
    <div>
      <PageHeader title={t("create")} description={t("createDescription")} />
      <GuideProductForm
        submitLabel={t("create")}
        onSubmit={async (body) => {
          await guideApi.create(body);
          router.replace("/guide/products");
        }}
      />
    </div>
  );
}
