"use client";

/** Flutter features/recent/recently_viewed_page.dart 대응 — 브라우저 로컬에만 저장 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { recentViews, type RecentViewItem } from "@/lib/storage/recentViews";
import { Badge, Button, Card, Chip, EmptyState, PageHeader } from "@/components/ui";
import { formatRelative } from "@/lib/utils/format";

const TYPE_LABEL = { place: "여행지", companion: "동행", guide: "가이드" } as const;

function hrefFor(item: RecentViewItem) {
  if (item.type === "place") return `/places/${item.id}`;
  if (item.type === "companion") return `/companions/${item.id}`;
  return `/guides/${item.id}`;
}

export default function RecentPage() {
  const [items, setItems] = useState<RecentViewItem[]>([]);
  const [filter, setFilter] = useState<"all" | RecentViewItem["type"]>("all");

  useEffect(() => {
    setItems(recentViews.getAll());
  }, []);

  const list = filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="최근 본"
        description="이 브라우저에만 저장됩니다. 최대 30개까지 보관합니다."
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
              전체 삭제
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex gap-2">
        {(["all", "place", "companion", "guide"] as const).map((t) => (
          <Chip key={t} active={filter === t} onClick={() => setFilter(t)}>
            {t === "all" ? "전체" : TYPE_LABEL[t]}
          </Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="최근 본 항목이 없습니다"
          description="여행지·동행·가이드를 열어 보면 여기에 쌓입니다."
          action={
            <Link href="/places">
              <Button size="sm">여행지 둘러보기</Button>
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
                      <Badge tone="neutral">{TYPE_LABEL[item.type]}</Badge>
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-muted">
                      {item.subtitle} · {formatRelative(item.viewedAt)}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  aria-label="삭제"
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
