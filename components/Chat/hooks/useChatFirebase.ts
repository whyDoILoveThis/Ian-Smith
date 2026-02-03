"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { onValue, ref, set } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import { ROOM_PATH, COMBO_STORAGE_KEY } from "../constants";
import { deriveKeyFromCombo, decryptMessage } from "../crypto";
import type { Slots, Message, TttState, ChatTheme } from "../types";

export function useChatFirebase(
  isUnlocked: boolean,
  combo: [number, number, number, number] | null,
  slotId: "1" | "2" | null,
) {
  const [slots, setSlots] = useState<Slots>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [rawMessages, setRawMessages] = useState<Message[]>([]);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [chatTheme, setChatTheme] = useState<ChatTheme>("emerald");
  const [tttState, setTttState] = useState<TttState | null>(null);

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

    const slotsRef = ref(rtdb, `${ROOM_PATH}/slots`);
    const unsubSlots = onValue(slotsRef, (snap) => {
      const val = (snap.val() || {}) as Slots;
      setSlots(val);
    });

    const messagesRef = ref(rtdb, `${ROOM_PATH}/messages`);
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
  }, [isUnlocked]);

  // Subscribe to typing indicator (needs slotId)
  useEffect(() => {
    if (!isUnlocked || !slotId) {
      setIsOtherTyping(false);
      return;
    }

    const typingRef = ref(rtdb, `${ROOM_PATH}/typing`);
    const unsubTyping = onValue(typingRef, (snap) => {
      const val = (snap.val() || {}) as Record<string, boolean>;
      const otherSlot = slotId === "1" ? "2" : "1";
      setIsOtherTyping(Boolean(val?.[otherSlot]));
    });

    return () => {
      unsubTyping();
    };
  }, [isUnlocked, slotId]);

  // Subscribe to shared theme
  useEffect(() => {
    if (!isUnlocked) return;
    const themeRef = ref(rtdb, `${ROOM_PATH}/theme`);
    const unsub = onValue(themeRef, (snap) => {
      const val = snap.val() as string | null;
      if (val && ["emerald", "blue", "purple", "rose"].includes(val)) {
        setChatTheme(val as ChatTheme);
      }
    });
    return () => unsub();
  }, [isUnlocked]);

  // Subscribe to Tic Tac Toe state
  useEffect(() => {
    if (!isUnlocked) return;
    const tttRef = ref(rtdb, `${ROOM_PATH}/ticTacToe`);
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
  }, [isUnlocked]);

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
              return {
                ...msg,
                decryptedText: msg.text,
                decryptionFailed: true,
              };
            }
          }
          return msg;
        }),
      );
      setMessages(decrypted);
    }
    decryptAll();
  }, [rawMessages, encryptionKey]);

  const handleThemeChange = useCallback(async (newTheme: ChatTheme) => {
    try {
      await set(ref(rtdb, `${ROOM_PATH}/theme`), newTheme);
    } catch {
      // ignore
    }
  }, []);

  return {
    slots,
    messages,
    encryptionKey,
    encryptionKeyRef,
    isOtherTyping,
    chatTheme,
    tttState,
    handleThemeChange,
  };
}
