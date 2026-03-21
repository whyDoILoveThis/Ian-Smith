"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { ref, onValue, set, remove, update } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";

export type TouchIndicator = {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  slotId: "1" | "2";
  timestamp: number;
  type: "tap" | "swipe";
  inputType: "touch" | "mouse";
  // For swipes
  endX?: number;
  endY?: number;
};

const TOUCH_DURATION = 1400; // How long touch indicator stays visible (ms)
const THROTTLE_MS = 100; // Minimum time between touch events

export function useTouchIndicators(slotId: "1" | "2" | null, roomPath: string) {
  const TOUCH_PATH = `${roomPath}/touches`;
  const [touches, setTouches] = useState<TouchIndicator[]>([]);
  const lastSendTimeRef = useRef(0);

  // Listen to all touches from Firebase (only when we have a slot)
  useEffect(() => {
    if (!slotId) {
      setTouches([]);
      return;
    }

    const touchesRef = ref(rtdb, TOUCH_PATH);

    const unsubscribe = onValue(touchesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setTouches([]);
        return;
      }

      const now = Date.now();
      const touchList: TouchIndicator[] = [];
      const staleIds: string[] = [];

      Object.entries(data).forEach(([id, touch]) => {
        const t = touch as TouchIndicator;
        // Only include touches that are still within the display duration
        if (now - t.timestamp < TOUCH_DURATION) {
          touchList.push({ ...t, id });
        } else {
          staleIds.push(id);
        }
      });

      setTouches(touchList);

      // Batch-remove all stale touches in a single write (avoids cascading
      // onValue callbacks that individual remove() calls would trigger).
      if (staleIds.length > 0) {
        const updates: Record<string, null> = {};
        for (const id of staleIds) {
          updates[`${TOUCH_PATH}/${id}`] = null;
        }
        update(ref(rtdb), updates).catch(() => {});
      }
    });

    return () => unsubscribe();
  }, [slotId, TOUCH_PATH]);

  // Send a tap event to Firebase with throttling
  const sendTap = useCallback(
    (x: number, y: number, inputType: "touch" | "mouse" = "touch") => {
      if (!slotId) return;

      const now = Date.now();
      
      // Throttle to prevent spam
      if (now - lastSendTimeRef.current < THROTTLE_MS) return;
      lastSendTimeRef.current = now;

      const touchId = `${slotId}_${now}_${Math.random().toString(36).substr(2, 9)}`;
      const touchRef = ref(rtdb, `${TOUCH_PATH}/${touchId}`);

      const touchData: Omit<TouchIndicator, 'id'> = {
        x,
        y,
        slotId,
        timestamp: now,
        type: "tap",
        inputType,
      };

      // Optimistic local update
      setTouches(prev => [...prev, { ...touchData, id: touchId }]);

      // Fire and forget - don't await
      set(touchRef, touchData).catch(() => {
        // Silent fail - touch will just not show on other side
      });

      // Schedule removal
      setTimeout(() => {
        remove(touchRef).catch(() => {});
      }, TOUCH_DURATION);
    },
    [slotId, TOUCH_PATH],
  );

  // Send a swipe event to Firebase with throttling
  const sendSwipe = useCallback(
    (startX: number, startY: number, endX: number, endY: number, inputType: "touch" | "mouse" = "touch") => {
      if (!slotId) return;

      const now = Date.now();
      
      // Throttle to prevent spam
      if (now - lastSendTimeRef.current < THROTTLE_MS) return;
      lastSendTimeRef.current = now;

      const touchId = `${slotId}_${now}_${Math.random().toString(36).substr(2, 9)}`;
      const touchRef = ref(rtdb, `${TOUCH_PATH}/${touchId}`);

      const touchData: Omit<TouchIndicator, 'id'> = {
        x: startX,
        y: startY,
        endX,
        endY,
        slotId,
        timestamp: now,
        type: "swipe",
        inputType,
      };

      // Optimistic local update
      setTouches(prev => [...prev, { ...touchData, id: touchId }]);

      // Fire and forget - don't await
      set(touchRef, touchData).catch(() => {
        // Silent fail
      });

      // Schedule removal
      setTimeout(() => {
        remove(touchRef).catch(() => {});
      }, TOUCH_DURATION);
    },
    [slotId, TOUCH_PATH],
  );

  return {
    touches,
    sendTap,
    sendSwipe,
  };
}
