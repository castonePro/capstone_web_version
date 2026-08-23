"use client";

/** Flutter features/companion/ui/my_companions_page.dart 대응 */
import Link from "next/link";
import { useState } from "react";
import { companionApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { CompanionCard } from "@/components/cards";

export default function MyCompanionsPage() {
  const [tab, setTab] = useState<"hosting" | "joined">("hosting");
  const hosting = useAsync(() => companionApi.myHosting(), []);
  const joined = useAsync(() => companionApi.myJoined(), []);

  const active = tab === "hosting" ? hosting : joined;

  return (
    <div>
      <PageHeader
        title="내 동행"
        description="내가 연 방과 참여 중인 동행을 한곳에서 관리합니다."
        action={
          <Link href="/companions/new">
            <Button size="sm">동행 모집하기</Button>
          </Link>
        }
      />

      <div className="mb-5 flex gap-2">
        <Chip active={tab === "hosting"} onClick={() => setTab("hosting")}>
          내가 연 방 {hosting.data ? `(${hosting.data.length})` : ""}
        </Chip>
        <Chip active={tab === "joined"} onClick={() => setTab("joined")}>
          참여한 동행 {joined.data ? `(${joined.data.length})` : ""}
        </Chip>
      </div>

      {active.loading ? (
        <LoadingBlock />
      ) : active.error ? (
        <ErrorState message={active.error} onRetry={active.reload} />
      ) : (active.data ?? []).length === 0 ? (
        <EmptyState
          title={tab === "hosting" ? "연 방이 없습니다" : "참여한 동행이 없습니다"}
          description={
            tab === "hosting"
              ? "내 일정으로 동행을 모집해 보세요."
              : "동행 찾기에서 마음에 드는 방에 신청해 보세요."
          }
          action={
            <Link href={tab === "hosting" ? "/companions/new" : "/companions"}>
              <Button size="sm">{tab === "hosting" ? "동행 모집하기" : "동행 찾기"}</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {active.data!.map((c) => (
            <CompanionCard key={c.companionId} companion={c} />
          ))}
        </div>
      )}
    </div>
  );
}
