"use client";

import { useRouter } from "next/navigation";
import { guideApi } from "@/lib/api/endpoints";
import { GuideProductForm } from "@/components/GuideProductForm";
import { PageHeader } from "@/components/ui";

export default function NewGuideProductPage() {
  const router = useRouter();
  return (
    <div>
      <PageHeader
        title="상품 등록"
        description="등록 후 '게시하기'를 눌러야 사용자 탐색 화면에 노출됩니다."
      />
      <GuideProductForm
        submitLabel="상품 등록"
        onSubmit={async (body) => {
          await guideApi.create(body);
          router.replace("/guide/products");
        }}
      />
    </div>
  );
}
