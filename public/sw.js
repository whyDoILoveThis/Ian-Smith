/// Service Worker for Push Notifications & PWA offline shell

const CACHE_NAME = "pwa-cache-v1";
const OFFLINE_URLS = ["/"];

// Install — cache the offline shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
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

// Push — show notification when push message arrives
self.addEventListener("push", (event) => {
  let data = { title: "New Message", body: "You have a new message", tag: "msg" };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    // use defaults
  }

  const options = {
    body: data.body || "New message",
    tag: data.tag || "msg-" + Date.now(),
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
    },
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title || "New Message", options));
});

// Notification click — focus or open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

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
