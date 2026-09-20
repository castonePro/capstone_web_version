// Firebase Messaging Service Worker for Background Push Notifications
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

// Query params 또는 .env.local 기본 설정으로 Firebase 초기화
const urlParams = new URL(location).searchParams;

const firebaseConfig = {
  apiKey: urlParams.get("apiKey") || "AIzaSyCjRw1pNfayb726v7CYPcvFMUWfMOOE_yY",
  authDomain: urlParams.get("authDomain") || "travelbusan-88ab7.firebaseapp.com",
  projectId: urlParams.get("projectId") || "travelbusan-88ab7",
  storageBucket: urlParams.get("storageBucket") || "travelbusan-88ab7.firebasestorage.app",
  messagingSenderId: urlParams.get("messagingSenderId") || "367800538689",
  appId: urlParams.get("appId") || "1:367800538689:web:3e0ea64ada75773e0458c0",
};

if (firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // 백그라운드 푸시 알림 수신 리스너
  messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] 백그라운드 푸시 수신:", payload);

    const notificationTitle =
      payload.notification?.title || payload.data?.title || "Travel Busan";
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || "",
      icon: "/images/brand/logo.png",
      badge: "/images/brand/logo.png",
      data: payload.data || {},
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// 푸시 알림 클릭 시 해당 페이지로 포커스 또는 새 창 열기
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.click_action || "/notifications";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // 이미 열려 있는 탭이 있으면 포커스
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes("/notifications") && "focus" in client) {
          return client.focus();
        }
      }
      // 없으면 새 창으로 이동
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }),
  );
});
