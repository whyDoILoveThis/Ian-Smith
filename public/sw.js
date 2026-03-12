/* eslint-disable no-undef */
/// Service Worker for PWA offline shell, Web Push (VAPID), and FCM
///
/// IMPORTANT: This is the ONLY service worker registered at scope "/".
/// Firebase Cloud Messaging is integrated here — do NOT register a
/// separate firebase-messaging-sw.js (that would replace this SW).

// ── Firebase Cloud Messaging (compat SDK for SW context) ─────────────
// Must come FIRST so the SDK can intercept FCM push events before our
// generic `push` listener runs.
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyA2iJ7TazN1FHEgiMN9MgcRYJLoeipynWM",
  authDomain: "its-portfolio.firebaseapp.com",
  projectId: "its-portfolio",
  storageBucket: "its-portfolio.appspot.com",
  messagingSenderId: "815909155470",
  appId: "1:815909155470:web:b33ad7ce9a7ab45efbcfdf",
});

const messaging = firebase.messaging();

// FCM background handler — called when the page is NOT in the foreground
// and the message is a data-only message (no `notification` payload) or
// when FCM delivers a push that the SDK intercepts.
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] FCM onBackgroundMessage:", payload);

  const data = payload.data || {};
  const notification = payload.notification || {};

  const title = notification.title || data.title || "New Message";
  const body = notification.body || data.body || "You have a new message";
  const tag = data.tag || "fcm-msg-" + Date.now();

  return self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      const hasFocusedClient = clients.some(
        (c) => c.visibilityState === "visible" && c.focused
      );
      if (hasFocusedClient) return; // foreground handler handles it
      // Mark tag so the VAPID push handler won't show a duplicate
      recentNotifTags[tag] = true;
      setTimeout(function() { delete recentNotifTags[tag]; }, 10000);
      return self.registration.showNotification(title, {
        body,
        tag,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        vibrate: [100, 50, 100],
        renotify: true,
        data: { url: data.url || "/about" },
      });
    });
});

// ── PWA Caching ──────────────────────────────────────────────────────

const CACHE_NAME = "pwa-cache-v4"; // bumped to install notification dedup fix
const OFFLINE_URLS = ["/"];

// Install — cache the offline shell
self.addEventListener("install", (event) => {
  console.log("[SW] Installing merged SW (PWA + WebPush + FCM)");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches & take control immediately
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating merged SW");
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch — network-first with offline fallback
self.addEventListener("fetch", (event) => {
  // Only handle GET requests and same-origin
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for offline use
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline — try cache
        return caches.match(event.request).then((cached) => {
          return cached || caches.match("/");
        });
      })
  );
});

// ── Web Push (VAPID) handler ─────────────────────────────────────────
// Handles non-FCM push events (from the web-push npm package).
// FCM push events are intercepted by the Firebase SDK above and do NOT
// reach this listener — but as a safety net we track recently shown
// notification tags to suppress duplicates.
var recentNotifTags = {};

self.addEventListener("push", (event) => {
  console.log("[SW] VAPID push event received");
  var data = { title: "New Message", body: "You have a new message", tag: "msg" };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    // use defaults
  }

  var tag = data.tag || "msg-" + Date.now();

  // Dedup: if FCM's onBackgroundMessage already showed a notification
  // with this tag, skip it to avoid duplicate notifications.
  if (recentNotifTags[tag]) {
    console.log("[SW] Skipping duplicate VAPID push (tag already shown by FCM):", tag);
    return;
  }

  var options = {
    body: data.body || "New message",
    tag: tag,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/about",
    },
    renotify: true,
  };

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function(clients) {
        var hasFocused = clients.some(
          function(c) { return c.visibilityState === "visible" && c.focused; }
        );
        if (hasFocused) return; // app is in foreground, skip push notif
        recentNotifTags[tag] = true;
        setTimeout(function() { delete recentNotifTags[tag]; }, 10000);
        return self.registration.showNotification(
          data.title || "New Message",
          options
        );
      })
  );
});

// ── Notification click — focus or open the app ───────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/about";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus existing window if available
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        return self.clients.openWindow(url);
      })
  );
});
