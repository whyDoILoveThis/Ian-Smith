"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { ref, set, remove } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import type { Message } from "../types";

/**
 * Hook that manages Firebase Cloud Messaging (FCM) for the chat.
 *
 * Responsibilities:
 * 1. Obtain the FCM device token via the **main** service worker (sw.js).
 *    → The merged SW already includes Firebase Messaging — do NOT register
 *      a separate firebase-messaging-sw.js.
 * 2. Store the token under `{roomPath}/fcmTokens/{slotId}` in the RTDB.
 *    → The token is **NOT** removed on unmount so that background delivery
 *      works even after the user closes the tab.
 * 3. Listen for foreground FCM messages and deduplicate against messages
 *    already received via the realtime listener.
 * 4. Auto-re-enable FCM on mount when permission was previously granted.
 */

// ── Lazy-loaded Firebase Messaging instance (avoids SSR crash) ───────

let messagingInstance: import("firebase/messaging").Messaging | null = null;

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  const { getMessaging } = await import("firebase/messaging");
  const { getApps, initializeApp } = await import("firebase/app");

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

// ── Get FCM token using the MAIN sw.js registration ──────────────────

async function getFCMToken(vapidKey: string): Promise<string | null> {
  try {
    const messaging = await getMessagingInstance();
    const { getToken } = await import("firebase/messaging");

    // Wait for the main sw.js (which includes Firebase Messaging) to activate.
    // Do NOT register a separate SW — that would replace sw.js.
    const swReg = await navigator.serviceWorker.ready;

    console.log("[FCM] Getting token with SW scope:", swReg.scope);

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });

    if (token) {
      console.log("[FCM] Token obtained:", token.slice(0, 20) + "…");
    } else {
      console.warn("[FCM] getToken returned null — check VAPID key import in Firebase Console");
    }

    return token || null;
  } catch (err) {
    console.error("[FCM] getToken failed:", err);
    return null;
  }
}

// ── localStorage key for FCM-enabled state ───────────────────────────
const FCM_ENABLED_KEY = "chat-fcm-enabled";

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
    for (const m of messages) {
      knownMessageIds.current.add(m.id);
    }
  }, [messages]);

  // ── Register / unregister token in RTDB ────────────────────────────

  const registerToken = useCallback(
    async (token: string) => {
      if (!roomPath || !slotId) return;
      const tokenDbRef = ref(rtdb, `${roomPath}/fcmTokens/${slotId}`);
      await set(tokenDbRef, token);
      tokenRef.current = token;
      console.log("[FCM] Token registered in RTDB for slot", slotId);
    },
    [roomPath, slotId]
  );

  const unregisterToken = useCallback(async () => {
    if (!roomPath || !slotId) return;
    try {
      const tokenDbRef = ref(rtdb, `${roomPath}/fcmTokens/${slotId}`);
      await remove(tokenDbRef);
      console.log("[FCM] Token removed from RTDB for slot", slotId);
    } catch {
      /* best effort */
    }
    tokenRef.current = null;
  }, [roomPath, slotId]);

  // ── Enable FCM (called when user toggles notifications ON) ─────────

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
    if (!vapidKey) {
      console.error("[FCM] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
      return false;
    }

    const token = await getFCMToken(vapidKey);
    if (!token) return false;

    await registerToken(token);
    setFcmEnabled(true);
    try { localStorage.setItem(FCM_ENABLED_KEY, "true"); } catch { /* */ }
    return true;
  }, [registerToken]);

  // ── Disable FCM (called when user toggles notifications OFF) ───────

  const disableFCM = useCallback(async () => {
    await unregisterToken();
    setFcmEnabled(false);
    try { localStorage.setItem(FCM_ENABLED_KEY, "false"); } catch { /* */ }
  }, [unregisterToken]);

  // ── Auto re-enable on mount ────────────────────────────────────────
  // If the user previously enabled FCM and notification permission is
  // still granted, re-register the token automatically.  This is what
  // makes background notifications survive page reloads / app restarts.
  useEffect(() => {
    if (!isUnlocked || !slotId || !roomPath) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let wasPreviouslyEnabled = false;
    try { wasPreviouslyEnabled = localStorage.getItem(FCM_ENABLED_KEY) === "true"; } catch { /* */ }

    if (!wasPreviouslyEnabled) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    console.log("[FCM] Auto re-enabling (permission already granted, was previously enabled)");

    (async () => {
      const token = await getFCMToken(vapidKey);
      if (token) {
        await registerToken(token);
        setFcmEnabled(true);
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, slotId, roomPath]);

  // ── Foreground message listener ────────────────────────────────────

  useEffect(() => {
    if (!fcmEnabled || typeof window === "undefined") return;

    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const messaging = await getMessagingInstance();
        const { onMessage } = await import("firebase/messaging");

        unsubscribe = onMessage(messaging, (payload) => {
          console.log("[FCM] Foreground message:", payload);
          const data = payload.data || {};

          // Dedup: if we already have this message from the realtime listener, skip.
          if (data.messageId && knownMessageIds.current.has(data.messageId)) {
            return;
          }

          // If the user is currently viewing the chat tab, don't show a
          // system notification — the realtime listener already shows it inline.
          if (isChatTabActive) {
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

  // ── Refresh token when room/slot changes ───────────────────────────

  useEffect(() => {
    if (!fcmEnabled || !isUnlocked || !slotId || !roomPath) return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    (async () => {
      const token = await getFCMToken(vapidKey);
      if (token) {
        await registerToken(token);
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomPath, slotId, fcmEnabled, isUnlocked]);

  // ── NO unmount cleanup ─────────────────────────────────────────────
  // Intentionally NOT removing the token on unmount.  The FCM token must
  // persist in RTDB so that the other user can send pushes even after
  // this user closes the tab/browser.  Stale tokens are cleaned up
  // server-side in /api/fcm-send when FCM returns UNREGISTERED / 404.

  return {
    fcmEnabled,
    enableFCM,
    disableFCM,
  };
}
