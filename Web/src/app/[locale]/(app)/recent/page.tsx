"use client";

/** Flutter features/recent/recently_viewed_page.dart 대응 — 브라우저 로컬에만 저장 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { recentViews, type RecentViewItem } from "@/lib/storage/recentViews";
import { useFormat } from "@/lib/i18n/useFormat";
import { Badge, Button, Card, Chip, EmptyState, PageHeader } from "@/components/ui";

function hrefFor(item: RecentViewItem) {
  if (item.type === "place") return `/places/${item.id}`;
  if (item.type === "companion") return `/companions/${item.id}`;
  return `/guides/${item.id}`;
}

export default function RecentPage() {
  const t = useTranslations("recent");
  const c = useTranslations("common");
  const f = useFormat();
  const [items, setItems] = useState<RecentViewItem[]>([]);
  const [filter, setFilter] = useState<"all" | RecentViewItem["type"]>("all");

  useEffect(() => {
    setItems(recentViews.getAll());
  }, []);

  const list = filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          items.length > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                recentViews.clear();
                setItems([]);
              }}
            >
              {t("clearAll")}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex gap-2">
        {(["all", "place", "companion", "guide"] as const).map((tab) => (
          <Chip key={tab} active={filter === tab} onClick={() => setFilter(tab)}>
            {tab === "all" ? c("all") : t(`types.${tab}`)}
          </Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Link href="/places">
              <Button size="sm">{t("browsePlaces")}</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {list.map((item) => (
            <Card key={`${item.type}-${item.id}`} className="transition-colors hover:border-accent">
              <div className="flex items-center gap-3">
                <Link href={hrefFor(item)} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-sand">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{t(`types.${item.type}`)}</Badge>
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-muted">
                      {[item.subtitle, f.relative(item.viewedAt)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  aria-label={c("delete")}
                  onClick={() => {
                    recentViews.remove(item.type, item.id);
                    setItems(recentViews.getAll());
                  }}
                  className="shrink-0 rounded-md p-2 text-muted hover:bg-sand"
                >
                  ✕
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
