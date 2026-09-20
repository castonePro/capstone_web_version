"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  deleteToken,
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
  type MessagePayload,
} from "firebase/messaging";
import { fcmApi } from "@/lib/api/endpoints";
import { API_BASE_URL, AuthStorage } from "@/lib/api/client";
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

/** 이 브라우저에서 발급받아 서버에 등록한 웹 푸시 토큰 (로그아웃 시 서버에서 지우기 위해 보관) */
const WEB_TOKEN_KEY = "fcm_web_token";

/** Firebase 웹 설정값이 채워져 있는지 */
export function isFcmConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && VAPID_KEY);
}

/**
 * 서비스 워커는 번들러를 거치지 않는 정적 파일이라 process.env를 못 읽는다.
 * 그래서 등록 URL의 쿼리로 설정값을 넘기고, SW가 location.search에서 읽어 초기화한다.
 */
function serviceWorkerUrl(): string {
  const qs = new URLSearchParams();
  Object.entries(firebaseConfig).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  return `/firebase-messaging-sw.js?${qs.toString()}`;
}

export type PushStatus = "unsupported" | "unconfigured" | NotificationPermission;

/** 알림 화면의 "푸시 알림 켜기" 버튼 표시용 상태 */
export async function getPushStatus(): Promise<PushStatus> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  const supported = await isSupported().catch(() => false);
  if (!supported) return "unsupported";
  if (!isFcmConfigured()) return "unconfigured";
  return Notification.permission;
}

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
 *
 * - prompt=false(기본, 로그인 직후 자동 호출): 이미 알림을 허용한 브라우저에서만 조용히 토큰을 갱신한다.
 *   버튼 클릭 없이 권한 팝업을 띄우면 Safari/Firefox는 막고 Chrome도 조용히 차단하기 쉬워서다.
 * - prompt=true("푸시 알림 켜기" 버튼): 권한을 요청한 뒤 등록한다.
 */
export async function registerFcmToken({ prompt = false }: { prompt?: boolean } = {}): Promise<string | null> {
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
    let permission = Notification.permission;
    if (permission === "default" && prompt) {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      return null;
    }

    // 서비스 워커 등록 확인
    let swRegistration: ServiceWorkerRegistration | undefined;
    try {
      swRegistration = await navigator.serviceWorker.register(serviceWorkerUrl());
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
      // 백엔드 POST /api/v1/fcm/token 등록 (platform: "web" → 앱 토큰을 덮어쓰지 않는 웹 전용 테이블)
      await fcmApi.registerToken(token, "web");
      try {
        window.localStorage.setItem(WEB_TOKEN_KEY, token);
      } catch {
        /* noop */
      }
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

/**
 * 로그아웃 시 이 브라우저의 웹 푸시 토큰을 서버와 Firebase에서 지운다.
 * 로그아웃 처리(AuthStorage.clear)보다 먼저 호출해야 하므로, 로그인 토큰을 동기적으로 먼저 잡아 둔다.
 * 실패해도 로그아웃은 그대로 진행된다(서버는 만료 토큰을 발송 실패 시 자동 정리한다).
 */
export async function unregisterFcmToken(): Promise<void> {
  if (typeof window === "undefined") return;
  let webToken: string | null = null;
  try {
    webToken = window.localStorage.getItem(WEB_TOKEN_KEY);
    window.localStorage.removeItem(WEB_TOKEN_KEY);
  } catch {
    /* noop */
  }
  if (!webToken) return;
  const jwt = AuthStorage.getToken();

  try {
    if (jwt) {
      await fetch(`${API_BASE_URL}/api/v1/fcm/token`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ token: webToken }),
      });
    }
  } catch (error) {
    console.warn("[FCM] 서버 토큰 삭제 실패:", error);
  }

  try {
    const firebaseApp = getFirebaseApp();
    if (firebaseApp && (await isSupported().catch(() => false))) {
      await deleteToken(messaging ?? getMessaging(firebaseApp));
    }
  } catch (error) {
    console.warn("[FCM] 브라우저 토큰 삭제 실패:", error);
  }
}
