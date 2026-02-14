"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { onValue, ref, set, onDisconnect } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import { COMBO_STORAGE_KEY } from "../constants";
import { deriveKeyFromCombo, decryptMessage } from "../crypto";
import type { Slots, Message, TttState, ChatTheme } from "../types";

export function useChatFirebase(
  isUnlocked: boolean,
  combo: [number, number, number, number] | null,
  slotId: "1" | "2" | null,
  roomPath: string,
) {
  const [slots, setSlots] = useState<Slots>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [rawMessages, setRawMessages] = useState<Message[]>([]);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [chatTheme, setChatTheme] = useState<ChatTheme>("emerald");
  const [tttState, setTttState] = useState<TttState | null>(null);
  const [presence, setPresence] = useState<{ "1"?: boolean; "2"?: boolean }>({});
  const [lastSeen, setLastSeen] = useState<{ "1"?: number; "2"?: number }>({});
  const [indicatorColors, setIndicatorColors] = useState<{ "1"?: string; "2"?: string }>({});

  const encryptionKeyRef = useRef<CryptoKey | null>(null);

  // Derive encryption key from combo
  useEffect(() => {
    if (!isUnlocked || !combo) {
      setEncryptionKey(null);
      encryptionKeyRef.current = null;
      setMessages([]);
      setRawMessages([]);
      return;
    }

    async function derive() {
      if (!combo) return;
      const key = await deriveKeyFromCombo(combo);
      setEncryptionKey(key);
      encryptionKeyRef.current = key;
      window.localStorage.setItem(COMBO_STORAGE_KEY, JSON.stringify(combo));
    }
    derive();
  }, [combo, isUnlocked]);

  // Subscribe to slots and messages
  useEffect(() => {
    if (!isUnlocked) return;

    const slotsRef = ref(rtdb, `${roomPath}/slots`);
    const unsubSlots = onValue(slotsRef, (snap) => {
      const val = (snap.val() || {}) as Slots;
      setSlots(val);
    });

    const messagesRef = ref(rtdb, `${roomPath}/messages`);
    const unsubMessages = onValue(messagesRef, (snap) => {
      const val = (snap.val() || {}) as Record<string, Omit<Message, "id">>;
      const msgs = Object.entries(val)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => {
          const aTime = typeof a.createdAt === "number" ? a.createdAt : 0;
          const bTime = typeof b.createdAt === "number" ? b.createdAt : 0;
          return aTime - bTime;
        });
      setRawMessages(msgs);
    });

    return () => {
      unsubSlots();
      unsubMessages();
    };
  }, [isUnlocked, roomPath]);

  // Subscribe to presence
  useEffect(() => {
    if (!isUnlocked) return;

    const presenceRef = ref(rtdb, `${roomPath}/presence`);
    const unsub = onValue(presenceRef, (snap) => {
      const val = (snap.val() || {}) as { "1"?: boolean; "2"?: boolean };
      setPresence(val);
    });

    return () => unsub();
  }, [isUnlocked, roomPath]);

  // Subscribe to lastSeen timestamps
  useEffect(() => {
    if (!isUnlocked) return;

    const lastSeenRef = ref(rtdb, `${roomPath}/lastSeen`);
    const unsub = onValue(lastSeenRef, (snap) => {
      const val = (snap.val() || {}) as { "1"?: number; "2"?: number };
      setLastSeen(val);
    });

    return () => unsub();
  }, [isUnlocked, roomPath]);

  // Subscribe to indicator colors
  useEffect(() => {
    if (!isUnlocked) return;

    const colorsRef = ref(rtdb, `${roomPath}/indicatorColors`);
    const unsub = onValue(colorsRef, (snap) => {
      const val = (snap.val() || {}) as { "1"?: string; "2"?: string };
      setIndicatorColors(val);
    });

    return () => unsub();
  }, [isUnlocked, roomPath]);

  // Set up presence for this user
  useEffect(() => {
    if (!isUnlocked || !slotId) return;

    const myPresenceRef = ref(rtdb, `${roomPath}/presence/${slotId}`);
    const myLastSeenRef = ref(rtdb, `${roomPath}/lastSeen/${slotId}`);
    const connectedRef = ref(rtdb, ".info/connected");

    const unsub = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // Set up onDisconnect to clear presence and write lastSeen timestamp
        onDisconnect(myPresenceRef).set(false);
        onDisconnect(myLastSeenRef).set({ ".sv": "timestamp" });
        // Set presence to true
        set(myPresenceRef, true);
      }
    });

    return () => {
      unsub();
      // Clear presence when component unmounts and write lastSeen
      set(myPresenceRef, false);
      set(myLastSeenRef, Date.now());
    };
  }, [isUnlocked, slotId, roomPath]);

  // Subscribe to typing indicator (needs slotId)
  useEffect(() => {
    if (!isUnlocked || !slotId) {
      setIsOtherTyping(false);
      return;
    }

    const typingRef = ref(rtdb, `${roomPath}/typing`);
    const unsubTyping = onValue(typingRef, (snap) => {
      const val = (snap.val() || {}) as Record<string, boolean>;
      const otherSlot = slotId === "1" ? "2" : "1";
      setIsOtherTyping(Boolean(val?.[otherSlot]));
    });

    return () => {
      unsubTyping();
    };
  }, [isUnlocked, slotId, roomPath]);

  // Subscribe to shared theme
  useEffect(() => {
    if (!isUnlocked) return;
    const themeRef = ref(rtdb, `${roomPath}/theme`);
    const unsub = onValue(themeRef, (snap) => {
      const val = snap.val() as string | null;
      if (
        val &&
        [
          "red",
          "orange",
          "yellow",
          "green",
          "emerald",
          "cyan",
          "blue",
          "purple",
          "pink",
          "rose",
        ].includes(val)
      ) {
        setChatTheme(val as ChatTheme);
      }
    });
    return () => unsub();
  }, [isUnlocked, roomPath]);

  // Subscribe to Tic Tac Toe state
  useEffect(() => {
    if (!isUnlocked) return;
    const tttRef = ref(rtdb, `${roomPath}/ticTacToe`);
    const unsub = onValue(tttRef, (snap) => {
      const val = snap.val() as {
        board?: Array<"1" | "2" | null>;
        turn?: "1" | "2";
        winner?: "1" | "2" | "draw" | null;
        winningLine?: number[] | null;
        resetVotes?: { "1"?: boolean; "2"?: boolean };
      } | null;

      // Initialize if missing
      if (!val) {
        setTttState({
          board: Array(9).fill(null) as Array<"1" | "2" | null>,
          turn: "1",
          winner: null,
          winningLine: null,
          resetVotes: {},
        });
        return;
      }

      // Handle board - Firebase might store it as object with numeric keys
      let board: Array<"1" | "2" | null>;
      if (Array.isArray(val.board) && val.board.length === 9) {
        board = val.board as Array<"1" | "2" | null>;
      } else if (val.board && typeof val.board === 'object') {
        // Convert object with numeric keys to array
        const boardObj = val.board as unknown as Record<string, unknown>;
        board = Array(9).fill(null).map((_, i) => {
          const v = boardObj[String(i)];
          return v === "1" ? "1" : v === "2" ? "2" : null;
        }) as Array<"1" | "2" | null>;
      } else {
        board = Array(9).fill(null) as Array<"1" | "2" | null>;
      }

      // Handle winningLine - Firebase might store it as object
      let winningLine: number[] | null = null;
      if (Array.isArray(val.winningLine)) {
        winningLine = val.winningLine;
      } else if (val.winningLine && typeof val.winningLine === 'object') {
        const lineObj = val.winningLine as unknown as Record<string, number>;
        winningLine = [lineObj["0"], lineObj["1"], lineObj["2"]];
      }

      setTttState({
        board,
        turn: val.turn === "2" ? "2" : "1",
        winner: val.winner ?? null,
        winningLine,
        resetVotes: val.resetVotes ?? {},
      });
    });
    return () => unsub();
  }, [isUnlocked, roomPath]);

  // Decrypt messages when raw messages or encryption key changes
  useEffect(() => {
    async function decryptAll() {
      const key = encryptionKeyRef.current;
      if (!key) {
        setMessages(
          rawMessages.map((msg) => ({ ...msg, decryptedText: msg.text })),
        );
        return;
      }

      const decrypted = await Promise.all(
        rawMessages.map(async (msg) => {
          if (msg.text) {
            try {
              const decryptedText = await decryptMessage(msg.text, key);
              return { ...msg, decryptedText };
            } catch {
              return { ...msg, decryptedText: msg.text };
            }
          } else {
            return { ...msg, decryptedText: msg.text };
          }
        })
      );
      setMessages(decrypted);
    }
    decryptAll();
    // encryptionKey (state) is included so decryptAll re-runs once the
    // async key derivation completes — encryptionKeyRef alone is a stable
    // ref and would never retrigger this effect.
  }, [rawMessages, encryptionKey, encryptionKeyRef]);

  const handleThemeChange = useCallback(
    (theme: ChatTheme) => {
      if (!isUnlocked) return;
      const themeRef = ref(rtdb, `${roomPath}/theme`);
      set(themeRef, theme);
      setChatTheme(theme);
    },
    [isUnlocked, roomPath]
  );

  const handleIndicatorColorChange = useCallback(
    (color: string) => {
      if (!isUnlocked || !slotId) return;
      const colorRef = ref(rtdb, `${roomPath}/indicatorColors/${slotId}`);
      set(colorRef, color);
    },
    [isUnlocked, slotId, roomPath]
  );

  return {
    slots,
    messages,
    encryptionKey,
    encryptionKeyRef,
    isOtherTyping,
    chatTheme,
    tttState,
    presence,
    lastSeen,
    indicatorColors,
    handleThemeChange,
    handleIndicatorColorChange,
  };
}
