"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
  type MessagePayload,
} from "firebase/messaging";
import { fcmApi } from "@/lib/api/endpoints";
import { toast } from "sonner";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  // 필수 환경변수가 없으면 초기화 건너뜀
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[FCM] Firebase 환경변수(NEXT_PUBLIC_FIREBASE_API_KEY 등)가 설정되지 않아 FCM을 비활성화합니다.",
      );
    }
    return null;
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  return app;
}

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

    // 서비스 워커 등록 확인
    let swRegistration: ServiceWorkerRegistration | undefined;
    try {
      swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      await navigator.serviceWorker.ready;
    } catch {
      // SW 등록 실패 시 기본 등록으로 폴백
    }

    messaging = getMessaging(firebaseApp);
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

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  try {
    if (!messaging) {
      messaging = getMessaging(firebaseApp);
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.title || "새 알림";
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
