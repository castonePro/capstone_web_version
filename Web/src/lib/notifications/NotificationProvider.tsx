"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { notificationApi } from "@/lib/api/endpoints";
import type { AppNotification } from "@/lib/api/types";
import { registerFcmToken, setupFcmForegroundListener } from "@/lib/firebase/client";

interface NotificationContextValue {
  unreadCount: number;
  notifications: AppNotification[];
  loading: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  refreshUnread: () => Promise<number>;
  loadNotifications: () => Promise<AppNotification[]>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, ready } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  const refreshUnread = useCallback(async () => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      return 0;
    }
    try {
      const count = await notificationApi.unreadCount();
      setUnreadCount(Number(count) || 0);
      return Number(count) || 0;
    } catch {
      return 0;
    }
  }, [isLoggedIn]);

  const loadNotifications = useCallback(async () => {
    if (!isLoggedIn) return [];
    setLoading(true);
    try {
      const list = await notificationApi.list();
      setNotifications(list ?? []);
      return list ?? [];
    } catch (e) {
      console.warn("[Notification] 알림 목록 로드 실패:", e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      // 낙관적 업데이트
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === notificationId ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await notificationApi.markRead(notificationId);
      } catch (e) {
        console.warn("[Notification] 알림 읽음 처리 실패:", e);
        // 실패 시 복원 위해 다시 조회
        void refreshUnread();
        void loadNotifications();
      }
    },
    [refreshUnread, loadNotifications],
  );

  const markAllAsRead = useCallback(async () => {
    // 낙관적 업데이트
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await notificationApi.markAllRead();
    } catch (e) {
      console.warn("[Notification] 전체 알림 읽음 처리 실패:", e);
      void refreshUnread();
      void loadNotifications();
    }
  }, [refreshUnread, loadNotifications]);

  // 로그인 시 초기화: FCM 토큰 등록, 안 읽은 개수 조회, 포그라운드 리스너 등록
  useEffect(() => {
    if (!ready || !isLoggedIn) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    // 1. 초기 unread count 조회
    void refreshUnread();

    // 2. FCM 토큰 발급 및 백엔드 등록
    void registerFcmToken();

    // 3. 포그라운드 푸시 수신 리스너 등록
    let unsubPromise = setupFcmForegroundListener(() => {
      void refreshUnread();
      // 알림 서랍이나 목록이 열려있는 경우 목록도 자동 갱신
      void loadNotifications();
    });

    // 4. 60초 폴링
    const interval = setInterval(() => {
      void refreshUnread();
    }, 60_000);

    // 5. 윈도우 포커스 시 갱신
    const handleFocus = () => {
      void refreshUnread();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      void unsubPromise.then((unsub) => unsub?.());
    };
  }, [ready, isLoggedIn, refreshUnread, loadNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        loading,
        drawerOpen,
        setDrawerOpen,
        refreshUnread,
        loadNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}
