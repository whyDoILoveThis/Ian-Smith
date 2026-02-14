"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import type { Slots } from "../types";

/**
 * Lightweight hook that subscribes only to the slots node.
 * Used to break the circular dependency:
 *   slots → useChatSession → slotId → useChatFirebase
 * without duplicating all the heavy Firebase/decryption work.
 */
export function useSlots(isUnlocked: boolean, roomPath: string): Slots {
  const [slots, setSlots] = useState<Slots>({});

  useEffect(() => {
    if (!isUnlocked) {
      setSlots({});
      return;
    }
    const slotsRef = ref(rtdb, `${roomPath}/slots`);
    const unsub = onValue(slotsRef, (snap) => {
      setSlots((snap.val() || {}) as Slots);
    });
    return () => unsub();
  }, [isUnlocked, roomPath]);

  return slots;
}
