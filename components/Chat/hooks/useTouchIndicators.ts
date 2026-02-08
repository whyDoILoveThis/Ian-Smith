"use client";

import { useCallback, useEffect, useState } from "react";
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

const TOUCH_DURATION = 800; // How long touch indicator stays visible (ms)
const TOUCH_PATH = `${ROOM_PATH}/touches`;

export function useTouchIndicators(slotId: "1" | "2" | null) {
  const [touches, setTouches] = useState<TouchIndicator[]>([]);

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
        }
      });

      setTouches(touchList);
    });

    return () => unsubscribe();
  }, []);

  // Send a tap event to Firebase
  const sendTap = useCallback(
    async (x: number, y: number, inputType: "touch" | "mouse" = "touch") => {
      if (!slotId) return;

      const touchId = `${slotId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const touchRef = ref(rtdb, `${TOUCH_PATH}/${touchId}`);

      const touchData: TouchIndicator = {
        id: touchId,
        x,
        y,
        slotId,
        timestamp: Date.now(),
        type: "tap",
        inputType,
      };

      try {
        await set(touchRef, touchData);

        // Auto-remove after duration
        setTimeout(async () => {
          try {
            await remove(touchRef);
          } catch {
            // Ignore removal errors
          }
        }, TOUCH_DURATION);
      } catch (err) {
        console.error("Failed to send tap:", err);
      }
    },
    [slotId],
  );

  // Send a swipe event to Firebase
  const sendSwipe = useCallback(
    async (startX: number, startY: number, endX: number, endY: number, inputType: "touch" | "mouse" = "touch") => {
      if (!slotId) return;

      const touchId = `${slotId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const touchRef = ref(rtdb, `${TOUCH_PATH}/${touchId}`);

      const touchData: TouchIndicator = {
        id: touchId,
        x: startX,
        y: startY,
        endX,
        endY,
        slotId,
        timestamp: Date.now(),
        type: "swipe",
        inputType,
      };

      try {
        await set(touchRef, touchData);

        // Auto-remove after duration
        setTimeout(async () => {
          try {
            await remove(touchRef);
          } catch {
            // Ignore removal errors
          }
        }, TOUCH_DURATION);
      } catch (err) {
        console.error("Failed to send swipe:", err);
      }
    },
    [slotId],
  );

  return {
    touches,
    sendTap,
    sendSwipe,
  };
}
