"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { ref, set, remove, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import type { Message } from "../types";

/**
 * Hook that manages Firebase Cloud Messaging (FCM) for the chat.
 *
 * Responsibilities:
 * 1. Register the FCM service worker on mount.
 * 2. Request notification permission when the user opts in.
 * 3. Obtain the FCM device token and store it under
 *    `{roomPath}/fcmTokens/{slotId}` in the RTDB.
 * 4. Listen for foreground FCM messages and deduplicate against
 *    messages already received via the realtime listener.
 * 5. Clean up the token when the user disables notifications or leaves.
 */

// Lazy-loaded Firebase Messaging instance (avoids importing at module level
// which would crash in SSR because `window` doesn't exist).
let messagingInstance: import("firebase/messaging").Messaging | null = null;

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  const { getMessaging } = await import("firebase/messaging");
  const { initializeApp, getApps } = await import("firebase/app");

  // Re-use the existing Firebase app (already initialised in firebaseConfig.ts).
  // If for some reason it's not present, create one.
  let app = getApps()[0];
  if (!app) {
    app = initializeApp({
      apiKey: "AIzaSyA2iJ7TazN1FHEgiMN9MgcRYJLoeipynWM",
      authDomain: "its-portfolio.firebaseapp.com",
      projectId: "its-portfolio",
      storageBucket: "its-portfolio.appspot.com",
      messagingSenderId: "815909155470",
      appId: "1:815909155470:web:b33ad7ce9a7ab45efbcfdf",
    });
  }

  messagingInstance = getMessaging(app);
  return messagingInstance;
}

async function getFCMToken(vapidKey: string): Promise<string | null> {
  try {
    const messaging = await getMessagingInstance();
    const { getToken } = await import("firebase/messaging");

    // Register the FCM-specific service worker.
    const swReg = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });

    return token || null;
  } catch {
    return null;
  }
}

type UseFCMNotificationsArgs = {
  /** Is the user in the actual chat (not just disguise screen)? */
  isUnlocked: boolean;
  /** The room path currently being viewed */
  roomPath: string;
  /** Which slot the current user occupies */
  slotId: "1" | "2" | null;
  /** Current messages from the realtime listener (for dedup) */
  messages: Message[];
  /** Whether the user has the chat tab active */
  isChatTabActive: boolean;
  /** Callback to show a lightweight in-app toast notification */
  showToast?: (message: string, type?: "error" | "success" | "info") => void;
};

export function useFCMNotifications({
  isUnlocked,
  roomPath,
  slotId,
  messages,
  isChatTabActive,
  showToast,
}: UseFCMNotificationsArgs) {
  const [fcmEnabled, setFcmEnabled] = useState(false);
  const tokenRef = useRef<string | null>(null);

  // Track message IDs from the realtime listener for dedup
  const knownMessageIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    // Keep the known set in sync (only add, never remove — prevents
    // showing a notification for a message that arrives via FCM right
    // before the realtime listener picks it up).
    for (const m of messages) {
      knownMessageIds.current.add(m.id);
    }
  }, [messages]);

  // ── Register token in RTDB ────────────────────────────────────────
  const registerToken = useCallback(
    async (token: string) => {
      if (!roomPath || !slotId) return;
      const tokenDbRef = ref(rtdb, `${roomPath}/fcmTokens/${slotId}`);
      await set(tokenDbRef, token);
      tokenRef.current = token;
    },
    [roomPath, slotId]
  );

  const unregisterToken = useCallback(async () => {
    if (!roomPath || !slotId) return;
    try {
      const tokenDbRef = ref(rtdb, `${roomPath}/fcmTokens/${slotId}`);
      await remove(tokenDbRef);
    } catch {
      /* best effort */
    }
    tokenRef.current = null;
  }, [roomPath, slotId]);

  // ── Enable / disable FCM ──────────────────────────────────────────
  const enableFCM = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
    if (typeof Notification === "undefined") return false;

    // Request permission
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result !== "granted") return false;
    } else if (Notification.permission === "denied") {
      return false;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return false;

    const token = await getFCMToken(vapidKey);
    if (!token) return false;

    await registerToken(token);
    setFcmEnabled(true);
    return true;
  }, [registerToken]);

  const disableFCM = useCallback(async () => {
    await unregisterToken();
    setFcmEnabled(false);
  }, [unregisterToken]);

  // ── Foreground message listener ───────────────────────────────────
  useEffect(() => {
    if (!fcmEnabled || typeof window === "undefined") return;

    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const messaging = await getMessagingInstance();
        const { onMessage } = await import("firebase/messaging");

        unsubscribe = onMessage(messaging, (payload) => {
          const data = payload.data || {};

          // Dedup: if we already have this message from the realtime listener, skip.
          if (data.messageId && knownMessageIds.current.has(data.messageId)) {
            return;
          }

          // If the user is currently viewing the chat tab, don't show a
          // system notification — the realtime listener already shows it inline.
          if (isChatTabActive) {
            // But show a lightweight toast if a callback is provided
            // (e.g. user is on the "room" tab, not "chat" tab)
            if (showToast && data.body) {
              showToast(
                `${data.senderName || "Message"}: ${data.body}`,
                "info"
              );
            }
            return;
          }

          // Not on the chat tab — show a browser notification
          const title = data.title || payload.notification?.title || "New Message";
          const body = data.body || payload.notification?.body || "You have a new message";

          if (Notification.permission === "granted") {
            const options: NotificationOptions = {
              body,
              tag: data.tag || `fcm-${Date.now()}`,
              icon: "/icons/icon-192x192.png",
            };

            if (navigator.serviceWorker?.controller) {
              navigator.serviceWorker.ready
                .then((reg) => reg.showNotification(title, options))
                .catch(() => {
                  try { new Notification(title, options); } catch { /* */ }
                });
            } else {
              try { new Notification(title, options); } catch { /* */ }
            }
          }
        });
      } catch {
        /* FCM not available */
      }
    })();

    return () => {
      unsubscribe?.();
    };
  }, [fcmEnabled, isChatTabActive, showToast]);

  // ── Auto-refresh token when room/slot changes ─────────────────────
  useEffect(() => {
    if (!fcmEnabled || !isUnlocked || !slotId || !roomPath) return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    // Re-register token for the new room
    (async () => {
      const token = await getFCMToken(vapidKey);
      if (token) {
        await registerToken(token);
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomPath, slotId, fcmEnabled, isUnlocked]);

  // ── Clean up token on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      if (tokenRef.current && roomPath && slotId) {
        const tokenDbRef = ref(rtdb, `${roomPath}/fcmTokens/${slotId}`);
        remove(tokenDbRef).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    fcmEnabled,
    enableFCM,
    disableFCM,
  };
}
