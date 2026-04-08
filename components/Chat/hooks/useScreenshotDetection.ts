"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ref, push, onValue, set } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";

/**
 * Detects screenshots via the visibilitychange API (brief hide when
 * a screenshot is captured on mobile) and pushes a system message.
 *
 * Spot 2 is always detected. Spot 1 is only detected when the
 * `screenshotDetectSpot1` room setting is enabled.
 *
 * `getCenterMessageId` is called at detection time to record which
 * message was in the center of the viewport.
 */
export function useScreenshotDetection(
  slotId: "1" | "2" | null,
  roomPath: string,
  getCenterMessageId?: () => string | null,
) {
  const [spot1Enabled, setSpot1Enabled] = useState(false);
  const spot1EnabledRef = useRef(false);
  const cooldownRef = useRef(false);

  // Listen for the spot1 screenshot detection setting
  useEffect(() => {
    if (!roomPath) return;
    const settingRef = ref(rtdb, `${roomPath}/settings/screenshotDetectSpot1`);
    const unsub = onValue(settingRef, (snap) => {
      const val = snap.val() === true;
      spot1EnabledRef.current = val;
      setSpot1Enabled(val);
    });
    return unsub;
  }, [roomPath]);

  const sendScreenshotEvent = useCallback(
    (nearMessageId?: string | null) => {
      if (!slotId || !roomPath) return;
      if (slotId === "1" && !spot1EnabledRef.current) return;
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      setTimeout(() => {
        cooldownRef.current = false;
      }, 3000);

      const msgData: Record<string, unknown> = {
        slotId,
        sender: "",
        screenshotEvent: slotId,
        createdAt: { ".sv": "timestamp" },
      };
      if (nearMessageId) {
        msgData.screenshotNearMessageId = nearMessageId;
      }

      const msgRef = ref(rtdb, `${roomPath}/messages`);
      push(msgRef, msgData);
    },
    [slotId, roomPath],
  );

  // --- visibilitychange detection ---
  // On most mobile devices, taking a screenshot briefly hides the page.
  // We track the hidden timestamp and fire if it returns within a short window.
  useEffect(() => {
    if (!slotId) return;

    let hiddenAt = 0;

    const handleVisChange = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt > 0) {
        const elapsed = Date.now() - hiddenAt;
        hiddenAt = 0;
        // Screenshot typically hides for < 1s
        if (elapsed < 1000) {
          const centerId = getCenterMessageId?.() ?? null;
          sendScreenshotEvent(centerId);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisChange);
    };
  }, [slotId, sendScreenshotEvent, getCenterMessageId]);

  // --- blur/focus pattern detection ---
  // Some devices briefly blur the window during a screenshot even if the
  // page stays visible (no visibilitychange). Detect blur→focus < 2s.
  useEffect(() => {
    if (!slotId) return;

    let blurAt = 0;

    const handleBlur = () => {
      blurAt = Date.now();
    };

    const handleFocus = () => {
      if (blurAt > 0) {
        const elapsed = Date.now() - blurAt;
        blurAt = 0;
        if (elapsed < 2000) {
          const centerId = getCenterMessageId?.() ?? null;
          sendScreenshotEvent(centerId);
        }
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [slotId, sendScreenshotEvent, getCenterMessageId]);

  // --- Keyboard fallback (desktop / some Android) ---
  useEffect(() => {
    if (!slotId) return;

    const pressed = new Set<string>();
    let volumeDownAt = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      pressed.add(e.key);
      if (e.key === "PrintScreen") {
        const centerId = getCenterMessageId?.() ?? null;
        sendScreenshotEvent(centerId);
      }
      if (
        (pressed.has("AudioVolumeDown") || pressed.has("AudioVolumeUp")) &&
        pressed.has("Power")
      ) {
        const centerId = getCenterMessageId?.() ?? null;
        sendScreenshotEvent(centerId);
      }
      // Track volume-down press time for brief-press detection.
      // On some Android devices Chrome fires volume key events;
      // a quick tap (<300ms) that's part of a screenshot combo
      // is shorter than a deliberate volume hold.
      if (e.key === "AudioVolumeDown" && !e.repeat) {
        volumeDownAt = Date.now();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressed.delete(e.key);
      if (e.key === "AudioVolumeDown" && volumeDownAt > 0) {
        const elapsed = Date.now() - volumeDownAt;
        volumeDownAt = 0;
        if (elapsed < 300) {
          const centerId = getCenterMessageId?.() ?? null;
          sendScreenshotEvent(centerId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [slotId, sendScreenshotEvent, getCenterMessageId]);

  // --- Timer heartbeat detection ---
  // Monitors for unexpected pauses in the JS event loop that might
  // coincide with screenshot capture. A setInterval fires every 150ms;
  // if a tick is delayed >300ms after a period of stable ticks, and
  // the user isn't actively interacting, it may indicate a system-level
  // capture event (screenshot flash, compositor freeze, etc.).
  useEffect(() => {
    if (!slotId) return;

    let lastTick = performance.now();
    let stableCount = 0;
    let recentInteraction = false;
    let interactionTimer: ReturnType<typeof setTimeout>;

    const markInteraction = () => {
      recentInteraction = true;
      clearTimeout(interactionTimer);
      interactionTimer = setTimeout(() => {
        recentInteraction = false;
      }, 1000);
    };

    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastTick;
      lastTick = now;

      if (elapsed < 250) {
        // Normal tick – build up stable baseline
        stableCount++;
      } else if (
        elapsed >= 300 &&
        elapsed <= 2000 &&
        stableCount >= 5 &&
        !document.hidden &&
        !recentInteraction
      ) {
        // Suspicious gap after stable period while page is visible
        stableCount = 0;
        const centerId = getCenterMessageId?.() ?? null;
        sendScreenshotEvent(centerId);
      } else {
        stableCount = 0;
      }
    }, 150);

    window.addEventListener("touchstart", markInteraction, { passive: true });
    window.addEventListener("touchmove", markInteraction, { passive: true });
    window.addEventListener("scroll", markInteraction, { passive: true });

    return () => {
      clearInterval(interval);
      clearTimeout(interactionTimer);
      window.removeEventListener("touchstart", markInteraction);
      window.removeEventListener("touchmove", markInteraction);
      window.removeEventListener("scroll", markInteraction);
    };
  }, [slotId, sendScreenshotEvent, getCenterMessageId]);

  // Toggle spot1 setting
  const setSpot1Detection = useCallback(
    (enabled: boolean) => {
      if (!roomPath) return;
      const settingRef = ref(
        rtdb,
        `${roomPath}/settings/screenshotDetectSpot1`,
      );
      set(settingRef, enabled);
    },
    [roomPath],
  );

  return { spot1Enabled, setSpot1Detection, sendScreenshotEvent };
}
