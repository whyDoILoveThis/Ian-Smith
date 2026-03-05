/* eslint-disable no-undef */
/// Firebase Cloud Messaging Service Worker
///
/// This runs in the background and handles FCM push events when the
/// browser tab is closed or in the background.  It is registered
/// alongside the main sw.js — the browser merges their scopes.

// Firebase SDK (compat build — required for service-worker context)
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js"
);

// Initialize Firebase inside the SW.
// Only apiKey + projectId + messagingSenderId + appId are needed here.
firebase.initializeApp({
  apiKey: "AIzaSyA2iJ7TazN1FHEgiMN9MgcRYJLoeipynWM",
  authDomain: "its-portfolio.firebaseapp.com",
  projectId: "its-portfolio",
  storageBucket: "its-portfolio.appspot.com",
  messagingSenderId: "815909155470",
  appId: "1:815909155470:web:b33ad7ce9a7ab45efbcfdf",
});

const messaging = firebase.messaging();

// ── Background message handler ──────────────────────────────────────
// Called when the page is NOT in the foreground.  FCM delivers the
// message here, and we show a Notification.
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const notification = payload.notification || {};

  const title = notification.title || data.title || "New Message";
  const body = notification.body || data.body || "You have a new message";
  const tag = data.tag || "fcm-msg-" + Date.now();

  const options = {
    body,
    tag,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    vibrate: [100, 50, 100],
    renotify: true,
    data: {
      // The chat lives at /about — the notification click will navigate there.
      url: data.url || "/about",
    },
  };

  // Don't show notification if a client window already has the chat tab focused
  // (deduplication: foreground handler will deal with it instead).
  return self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      const hasFocusedClient = clients.some(
        (c) => c.visibilityState === "visible" && c.focused
      );
      if (hasFocusedClient) return; // foreground handler handles it
      return self.registration.showNotification(title, options);
    });
});

// ── Notification click handler ──────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/about";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus an existing window that's already on the site
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // No existing window — open a new one
        return self.clients.openWindow(url);
      })
  );
});
