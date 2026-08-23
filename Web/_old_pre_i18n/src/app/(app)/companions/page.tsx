"use client";

/** Flutter features/companion/ui/companion_explore_page.dart 대응 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { companionApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
} from "@/components/ui";
import { CompanionCard } from "@/components/cards";
import { COMPANION_STATUS_LABEL } from "@/lib/utils/format";
import type { CompanionStatus } from "@/lib/api/types";

const STATUS_FILTERS: (CompanionStatus | "ALL")[] = [
  "ALL",
  "RECRUITING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
];

export default function CompanionExplorePage() {
  const { me } = useAuth();
  const { data, loading, error, reload } = useAsync(() => companionApi.explore(), []);

  const [status, setStatus] = useState<CompanionStatus | "ALL">("RECRUITING");
  const [keyword, setKeyword] = useState("");
  const [myAgeOnly, setMyAgeOnly] = useState(false);
  const [sort, setSort] = useState<"latest" | "startDate" | "spots">("latest");

  const myAge = me?.birth_year ? new Date().getFullYear() - me.birth_year + 1 : null;

  const list = useMemo(() => {
    let arr = data ?? [];
    if (status !== "ALL") arr = arr.filter((c) => c.status === status);
    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase();
      arr = arr.filter((c) =>
        `${c.title} ${c.itineraryTitle} ${c.region ?? ""} ${(c.preferenceTags ?? []).join(" ")}`
          .toLowerCase()
          .includes(k),
      );
    }
    if (myAgeOnly && myAge != null) {
      arr = arr.filter(
        (c) => (c.minAge == null || myAge >= c.minAge) && (c.maxAge == null || myAge <= c.maxAge),
      );
    }
    const sorted = [...arr];
    // 부스트된 모집글은 항상 상단 (백엔드 Phase 7 정책과 동일)
    sorted.sort((a, b) => {
      if (a.boosted !== b.boosted) return a.boosted ? -1 : 1;
      if (sort === "startDate") {
        return (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999");
      }
      if (sort === "spots") {
        return (
          b.maxParticipants - b.approvedCount - (a.maxParticipants - a.approvedCount)
        );
      }
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
    return sorted;
  }, [data, status, keyword, myAgeOnly, myAge, sort]);

  return (
    <div>
      <PageHeader
        title="동행 찾기"
        description="같은 일정으로 떠날 사람을 찾아보세요. 본인 인증을 마친 사용자만 방을 열고 신청할 수 있습니다."
        action={
          <Link href="/companions/new">
            <Button size="sm">동행 모집하기</Button>
          </Link>
        }
      />

      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field label="검색">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="제목·지역·취향 태그"
            />
          </Field>
          <Field label="정렬">
            <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="latest">최신순</option>
              <option value="startDate">출발 임박순</option>
              <option value="spots">남은 자리순</option>
            </Select>
          </Field>
          <label className="mb-1 flex h-11 items-center gap-2 rounded-[12px] border border-line px-3.5 text-[13px] font-medium text-ink2">
            <input
              type="checkbox"
              checked={myAgeOnly}
              disabled={myAge == null}
              onChange={(e) => setMyAgeOnly(e.target.checked)}
              className="accent-[#ff4b26]"
            />
            내 나이대만
          </label>
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {STATUS_FILTERS.map((s) => (
            <Chip key={s} active={s === status} onClick={() => setStatus(s)}>
              {s === "ALL" ? "전체" : COMPANION_STATUS_LABEL[s]}
            </Chip>
          ))}
        </div>
      </Card>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <EmptyState
          title="조건에 맞는 동행이 없습니다"
          description="필터를 넓히거나, 내 일정으로 직접 모집해 보세요."
          action={
            <Link href="/companions/new">
              <Button size="sm">동행 모집하기</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((c) => (
            <CompanionCard key={c.companionId} companion={c} />
          ))}
        </div>
      )}
    </div>
  );
}
