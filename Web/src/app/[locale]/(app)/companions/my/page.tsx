"use client";

/** Flutter features/companion/ui/my_companions_page.dart 대응 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { companionApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { Button, Chip, EmptyState, ErrorState, LoadingBlock, PageHeader } from "@/components/ui";
import { CompanionCard } from "@/components/cards";

export default function MyCompanionsPage() {
  const t = useTranslations("companions");
  const [tab, setTab] = useState<"hosting" | "joined">("hosting");
  const hosting = useAsync(() => companionApi.myHosting(), []);
  const joined = useAsync(() => companionApi.myJoined(), []);

  const active = tab === "hosting" ? hosting : joined;

  return (
    <div>
      <PageHeader
        title={t("myTitle")}
        description={t("myDescription")}
        action={
          <Link href="/companions/new">
            <Button size="sm">{t("create")}</Button>
          </Link>
        }
      />

      <div className="mb-5 flex gap-2">
        <Chip active={tab === "hosting"} onClick={() => setTab("hosting")}>
          {t("tabHosting")} {hosting.data ? `(${hosting.data.length})` : ""}
        </Chip>
        <Chip active={tab === "joined"} onClick={() => setTab("joined")}>
          {t("tabJoined")} {joined.data ? `(${joined.data.length})` : ""}
        </Chip>
      </div>

      {active.loading ? (
        <LoadingBlock />
      ) : active.error ? (
        <ErrorState error={active.error} onRetry={active.reload} />
      ) : (active.data ?? []).length === 0 ? (
        <EmptyState
          title={tab === "hosting" ? t("emptyHostingTitle") : t("emptyJoinedTitle")}
          description={tab === "hosting" ? t("emptyHostingBody") : t("emptyJoinedBody")}
          action={
            <Link href={tab === "hosting" ? "/companions/new" : "/companions"}>
              <Button size="sm">{tab === "hosting" ? t("create") : t("exploreTitle")}</Button>
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
