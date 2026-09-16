"use client";

/** Flutter features/notification/ui/notification_list_page.dart 대응 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useFormat } from "@/lib/i18n/useFormat";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import { getNotificationRoute } from "@/components/notifications/NotificationDrawer";
import type { AppNotification } from "@/lib/api/types";
import {
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  PageHeader,
  cx,
} from "@/components/ui";
import { TranslatableText } from "@/components/TranslatableText";

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const f = useFormat();
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function handleItemClick(n: AppNotification) {
    if (!n.isRead) {
      await markAsRead(n.notificationId);
    }
    const targetUrl = getNotificationRoute(n);
    if (targetUrl !== "/notifications") {
      router.push(targetUrl);
    }
  }

  async function handleMarkAll() {
    setBusy(true);
    try {
      await markAllAsRead();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t("title")}
        description={unreadCount > 0 ? t("unreadCount", { count: unreadCount }) : t("allRead")}
        action={
          unreadCount > 0 ? (
            <Button size="sm" variant="outline" loading={busy} onClick={() => void handleMarkAll()}>
              {t("markAllRead")}
            </Button>
          ) : undefined
        }
      />

      {loading && notifications.length === 0 ? (
        <LoadingBlock />
      ) : notifications.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const isUnread = !n.isRead;
            return (
              <Card
                key={n.notificationId}
                className={cx(
                  "cursor-pointer transition-all hover:border-accent hover:shadow-xs",
                  isUnread
                    ? "border-coral-200 bg-coral-50/70"
                    : "border-line bg-card",
                )}
              >
                <div
                  onClick={() => void handleItemClick(n)}
                  className="w-full text-left"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void handleItemClick(n);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                        <p
                          className={cx(
                            "truncate text-sm text-ink",
                            isUnread ? "font-bold" : "font-semibold",
                          )}
                        >
                          {n.title}
                        </p>
                      </div>
                      {/* 알림 본문은 서버가 한국어로 만들어 저장하므로 번역 컴포넌트 유지 */}
                      <TranslatableText
                        text={n.body}
                        className={cx(
                          "mt-1 text-[13px]",
                          isUnread ? "text-ink font-medium" : "text-ink2",
                        )}
                      />
                    </div>
                    <p className="shrink-0 text-[11px] text-muted whitespace-nowrap">
                      {f.relative(n.createdAt)}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
