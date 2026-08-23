"use client";

/** Flutter features/notification/ui/notification_list_page.dart 대응 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { notificationApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useFormat } from "@/lib/i18n/useFormat";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  cx,
} from "@/components/ui";
import { TranslatableText } from "@/components/TranslatableText";

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const f = useFormat();
  const { data, loading, error, reload, setData } = useAsync(() => notificationApi.list(), []);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const unread = (data ?? []).filter((n) => !n.isRead).length;

  async function markRead(id: string) {
    // 낙관적 업데이트 — 실패하면 서버 상태로 되돌린다
    setData((prev) =>
      (prev ?? []).map((n) => (n.notificationId === id ? { ...n, isRead: true } : n)),
    );
    try {
      await notificationApi.markRead(id);
    } catch (e) {
      setToast(f.apiError(e));
      reload();
    }
  }

  async function markAll() {
    setBusy(true);
    try {
      await notificationApi.markAllRead();
      reload();
    } catch (e) {
      setToast(f.apiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t("title")}
        description={unread > 0 ? t("unreadCount", { count: unread }) : t("allRead")}
        action={
          unread > 0 ? (
            <Button size="sm" variant="outline" loading={busy} onClick={() => void markAll()}>
              {t("markAllRead")}
            </Button>
          ) : undefined
        }
      />

      {toast && (
        <div className="mb-4 rounded-[12px] border border-line bg-sand px-4 py-3 text-[13px] text-ink2">
          {toast}
        </div>
      )}

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <div className="space-y-2">
          {data!.map((n) => (
            <Card
              key={n.notificationId}
              className={cx(
                "transition-colors hover:border-accent",
                !n.isRead && "border-coral-200 bg-coral-50",
              )}
            >
              <button
                type="button"
                onClick={() => !n.isRead && void markRead(n.notificationId)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                      <p className="truncate text-sm font-semibold text-ink">{n.title}</p>
                    </div>
                    {/* 알림 본문은 서버가 한국어로 만들어 저장하므로 번역 버튼을 붙인다 */}
                    <TranslatableText text={n.body} className="mt-1 text-[13px] text-ink2" />
                  </div>
                  <p className="shrink-0 text-[11px] text-muted">{f.relative(n.createdAt)}</p>
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
