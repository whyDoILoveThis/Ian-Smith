"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import { ROOM_PATH } from "../constants";

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

const TOUCH_DURATION = 650; // How long touch indicator stays visible (ms)
const TOUCH_PATH = `${ROOM_PATH}/touches`;
const THROTTLE_MS = 80; // Minimum time between touch events

export function useTouchIndicators(slotId: "1" | "2" | null) {
  const [touches, setTouches] = useState<TouchIndicator[]>([]);
  const lastSendTimeRef = useRef(0);
  const pendingRemovalsRef = useRef<Set<string>>(new Set());

  // Listen to all touches from Firebase
  useEffect(() => {
    const touchesRef = ref(rtdb, TOUCH_PATH);

    const unsubscribe = onValue(touchesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setTouches([]);
        return;
      }

      const now = Date.now();
      const touchList: TouchIndicator[] = [];

      Object.entries(data).forEach(([id, touch]) => {
        const t = touch as TouchIndicator;
        // Only include touches that are still within the display duration
        if (now - t.timestamp < TOUCH_DURATION) {
          touchList.push({ ...t, id });
        } else if (!pendingRemovalsRef.current.has(id)) {
          // Clean up stale touches that weren't removed
          pendingRemovalsRef.current.add(id);
          remove(ref(rtdb, `${TOUCH_PATH}/${id}`)).finally(() => {
            pendingRemovalsRef.current.delete(id);
          });
        }
      });

      setTouches(touchList);
    });

    return () => unsubscribe();
  }, []);

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
    [slotId],
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
    [slotId],
  );

  return {
    touches,
    sendTap,
    sendSwipe,
  };
}
