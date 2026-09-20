"use client";

import {
  getToken,
  onMessage,
  isSupported,
  type MessagePayload,
} from "firebase/messaging";
import {
  firebaseConfig,
  getFirebaseApp,
  getFirebaseMessaging,
  VAPID_KEY,
} from "./firebase";
import { fcmApi } from "@/lib/api/endpoints";
import { toast } from "sonner";

export type FcmMessageHandler = (payload: MessagePayload) => void;

/**
 * FCM 디바이스 토큰 발급 및 백엔드 등록 함수.
 * 사용자가 로그인되었을 때 호출되어 권한 요청 및 백엔드 등록을 수행합니다.
 */
export async function registerFcmToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return null;
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return null;
  }

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return null;
    }

    // 서비스 워커 등록 (환경변수를 쿼리스트링으로 전달)
    let swRegistration: ServiceWorkerRegistration | undefined;
    try {
      const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(
        firebaseConfig.apiKey || "",
      )}&authDomain=${encodeURIComponent(
        firebaseConfig.authDomain || "",
      )}&projectId=${encodeURIComponent(
        firebaseConfig.projectId || "",
      )}&storageBucket=${encodeURIComponent(
        firebaseConfig.storageBucket || "",
      )}&messagingSenderId=${encodeURIComponent(
        firebaseConfig.messagingSenderId || "",
      )}&appId=${encodeURIComponent(firebaseConfig.appId || "")}`;

      swRegistration = await navigator.serviceWorker.register(swUrl);
      await navigator.serviceWorker.ready;
    } catch (e) {
      console.warn("[FCM] 서비스 워커 등록 오류:", e);
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      // 백엔드 POST /api/v1/fcm/token 등록
      await fcmApi.registerToken(token);
      return token;
    }
  } catch (error) {
    console.warn("[FCM] 디바이스 토큰 등록 중 오류:", error);
  }

  return null;
}

/**
 * 포그라운드(Foreground) 푸시 알림 수신 리스너 등록.
 * 푸시 수신 시 상단 인앱 토스트 알림을 띄우고, 안 읽은 알림 수를 새로고침하도록 콜백을 실행합니다.
 */
export async function setupFcmForegroundListener(
  onForegroundMessage?: FcmMessageHandler,
): Promise<(() => void) | null> {
  if (typeof window === "undefined") return null;

  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  try {
    const unsubscribe = onMessage(messaging, (payload) => {
      const title =
        payload.notification?.title || payload.data?.title || "새 알림";
      const body = payload.notification?.body || payload.data?.body || "";

      // 상단 인앱 토스트 표시
      toast(title, {
        description: body,
        duration: 5000,
        action: {
          label: "확인",
          onClick: () => {
            if (typeof window !== "undefined") {
              window.location.href = "/notifications";
            }
          },
        },
      });

      // 콜백 실행 (안 읽은 개수 refetch 등)
      if (onForegroundMessage) {
        onForegroundMessage(payload);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.warn("[FCM] 포그라운드 메시지 리스너 설정 실패:", error);
    return null;
  }
}
