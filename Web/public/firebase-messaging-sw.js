// Firebase Messaging Service Worker for Background Push Notifications
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

// Query params 또는 기본 설정으로 Firebase 초기화
const urlParams = new URL(location).searchParams;
const firebaseConfig = {
  apiKey: urlParams.get("apiKey") || "",
  authDomain: urlParams.get("authDomain") || "",
  projectId: urlParams.get("projectId") || "",
  storageBucket: urlParams.get("storageBucket") || "",
  messagingSenderId: urlParams.get("messagingSenderId") || "",
  appId: urlParams.get("appId") || "",
};

if (firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    // 서버가 notification 형식으로 보내면 Firebase SDK가 알림을 자동으로 띄운다.
    // 여기서 또 띄우면 같은 알림이 두 번 뜨므로, data 전용 메시지일 때만 직접 띄운다.
    if (payload.notification) return;

    const notificationTitle = payload.notification?.title || payload.data?.title || "Travel Busan";
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || "",
      icon: "/images/brand/logo.png",
      data: payload.data || {},
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.click_action || "/notifications";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes("/notifications") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }),
  );
});
