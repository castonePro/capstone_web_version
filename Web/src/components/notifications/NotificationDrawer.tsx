"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useFormat } from "@/lib/i18n/useFormat";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import type { AppNotification } from "@/lib/api/types";
import { Button, LoadingBlock, cx } from "@/components/ui";
import { TranslatableText } from "@/components/TranslatableText";

/**
 * 알림 제목 및 본문을 기반으로 적절한 이동 대상 URL을 유추합니다.
 */
export function getNotificationRoute(item: AppNotification): string {
  const text = `${item.title} ${item.body}`.toLowerCase();

  // 1. 동행 신청자 ("새 동행 신청", "참여를 신청", "신청자")
  if (
    text.includes("동행 신청") ||
    text.includes("참여를 신청") ||
    text.includes("신청자") ||
    text.includes("applicant")
  ) {
    return "/companions/my";
  }

  // 2. 동행 확정/수락/반려/출발
  if (
    text.includes("수락") ||
    text.includes("승인") ||
    text.includes("거절") ||
    text.includes("반려") ||
    text.includes("모집 마감") ||
    text.includes("출발") ||
    text.includes("동행")
  ) {
    return "/companions/my";
  }

  // 3. 채팅
  if (text.includes("채팅") || text.includes("메시지") || text.includes("대화") || text.includes("chat")) {
    return "/chat";
  }

  // 4. 입찰 / 역제안
  if (text.includes("입찰") || text.includes("제안") || text.includes("bid")) {
    return "/me/bids";
  }

  // 5. 결제
  if (text.includes("결제") || text.includes("payment")) {
    return "/payments";
  }

  // 6. 가이드 등록/전환
  if (text.includes("가이드 전환") || text.includes("가이드 심사")) {
    return "/guide-conversion";
  }

  return "/notifications";
}

export function NotificationDrawer() {
  const t = useTranslations("notifications");
  const c = useTranslations("common");
  const f = useFormat();
  const router = useRouter();
  const {
    drawerOpen,
    setDrawerOpen,
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  useEffect(() => {
    if (drawerOpen) {
      void loadNotifications();
    }
  }, [drawerOpen, loadNotifications]);

  if (!drawerOpen) return null;

  const handleClickItem = async (n: AppNotification) => {
    if (!n.isRead) {
      await markAsRead(n.notificationId);
    }
    setDrawerOpen(false);
    const targetUrl = getNotificationRoute(n);
    router.push(targetUrl);
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* 백드롭 */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => setDrawerOpen(false)}
      />

      {/* 우측 슬라이드 드로어 */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <aside className="w-screen max-w-md border-l border-line bg-card shadow-2xl flex flex-col">
          {/* 드로어 헤더 */}
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink">{t("title")}</h2>
              {unreadCount > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="text-xs font-semibold text-accent-text hover:underline"
                >
                  {t("markAllRead")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={c("close")}
                className="rounded-md p-1.5 text-muted hover:bg-sand hover:text-ink"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 알림 목록 */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {loading && notifications.length === 0 ? (
              <LoadingBlock />
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm font-semibold text-ink">{t("emptyTitle")}</p>
                <p className="mt-1 text-xs text-muted">{t("emptyBody")}</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.isRead;
                return (
                  <div
                    key={n.notificationId}
                    onClick={() => void handleClickItem(n)}
                    className={cx(
                      "group cursor-pointer rounded-[12px] border p-3.5 transition-all",
                      isUnread
                        ? "border-coral-200 bg-coral-50/70 hover:border-coral-300 hover:bg-coral-50"
                        : "border-line bg-card hover:border-accent hover:bg-sand/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {isUnread && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                          )}
                          <p
                            className={cx(
                              "truncate text-sm text-ink",
                              isUnread ? "font-bold" : "font-semibold",
                            )}
                          >
                            {n.title}
                          </p>
                        </div>
                        <TranslatableText
                          text={n.body}
                          className={cx(
                            "mt-1 text-xs line-clamp-2",
                            isUnread ? "text-ink font-medium" : "text-ink2",
                          )}
                        />
                      </div>
                      <span className="shrink-0 text-[11px] text-muted whitespace-nowrap">
                        {f.relative(n.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 드로어 푸터 */}
          <div className="border-t border-line px-5 py-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setDrawerOpen(false);
                router.push("/notifications");
              }}
            >
              {t("title")} 전체 보기
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
