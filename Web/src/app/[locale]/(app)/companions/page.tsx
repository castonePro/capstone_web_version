"use client";

/** Flutter features/companion/ui/companion_explore_page.dart 대응 */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { companionApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFormat } from "@/lib/i18n/useFormat";
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
import type { CompanionStatus } from "@/lib/api/types";

const STATUS_FILTERS: (CompanionStatus | "ALL")[] = [
  "ALL",
  "RECRUITING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
];

export default function CompanionExplorePage() {
  const t = useTranslations("companions");
  const c = useTranslations("common");
  const f = useFormat();
  const { me } = useAuth();
  const { data, loading, error, reload } = useAsync(() => companionApi.explore(), []);

  const [status, setStatus] = useState<CompanionStatus | "ALL">("RECRUITING");
  const [keyword, setKeyword] = useState("");
  const [myAgeOnly, setMyAgeOnly] = useState(false);
  const [sort, setSort] = useState<"latest" | "startDate" | "spots">("latest");

  const myAge = me?.birth_year ? new Date().getFullYear() - me.birth_year + 1 : null;

  const list = useMemo(() => {
    let arr = data ?? [];
    if (status !== "ALL") arr = arr.filter((x) => x.status === status);
    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase();
      arr = arr.filter((x) =>
        `${x.title} ${x.itineraryTitle} ${x.region ?? ""} ${(x.preferenceTags ?? []).join(" ")}`
          .toLowerCase()
          .includes(k),
      );
    }
    if (myAgeOnly && myAge != null) {
      arr = arr.filter(
        (x) => (x.minAge == null || myAge >= x.minAge) && (x.maxAge == null || myAge <= x.maxAge),
      );
    }
    const sorted = [...arr];
    // 부스트된 모집글은 항상 상단 (백엔드 Phase 7 정책과 동일)
    sorted.sort((a, b) => {
      if (a.boosted !== b.boosted) return a.boosted ? -1 : 1;
      if (sort === "startDate") return (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999");
      if (sort === "spots") {
        return b.maxParticipants - b.approvedCount - (a.maxParticipants - a.approvedCount);
      }
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
    return sorted;
  }, [data, status, keyword, myAgeOnly, myAge, sort]);

  return (
    <div>
      <PageHeader
        title={t("exploreTitle")}
        description={t("exploreDescription")}
        action={
          <Link href="/companions/new">
            <Button size="sm">{t("create")}</Button>
          </Link>
        }
      />

      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field label={c("search")}>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </Field>
          <Field label={c("sort")}>
            <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="latest">{t("sortLatest")}</option>
              <option value="startDate">{t("sortStartDate")}</option>
              <option value="spots">{t("sortSpots")}</option>
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
            {t("myAgeOnly")}
          </label>
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {STATUS_FILTERS.map((s) => (
            <Chip key={s} active={s === status} onClick={() => setStatus(s)}>
              {s === "ALL" ? c("all") : f.companionStatus(s)}
            </Chip>
          ))}
        </div>
      </Card>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Link href="/companions/new">
              <Button size="sm">{t("create")}</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((x) => (
            <CompanionCard key={x.companionId} companion={x} />
          ))}
        </div>
      )}
    </div>
  );
}
