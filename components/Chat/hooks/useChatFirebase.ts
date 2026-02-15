"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  onValue,
  ref,
  set,
  get,
  onDisconnect,
  query,
  orderByKey,
  limitToLast,
  endBefore,
} from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import { COMBO_STORAGE_KEY } from "../constants";
import { deriveKeyFromCombo, decryptMessage } from "../crypto";
import type { Slots, Message, TttState, ChatTheme } from "../types";

// Module-level decryption cache: encrypted text → decrypted text
// Shared across all hook instances so work is never duplicated.
const decryptionCache = new Map<string, string>();

// How many messages to keep in the real-time Firebase listener.
// Only the latest SERVER_PAGE messages travel over the wire on connect.
const SERVER_PAGE = 200;

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
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasMoreOnServer, setHasMoreOnServer] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const encryptionKeyRef = useRef<CryptoKey | null>(null);

  // Older messages loaded on-demand via get() — keyed by message ID
  const olderMsgsRef = useRef<Map<string, Message>>(new Map());

  // Structural digest — tracks message IDs + text to detect metadata-only updates
  const prevDigestRef = useRef("");

  // Derive encryption key from combo
  useEffect(() => {
    if (!isUnlocked || !combo) {
      setEncryptionKey(null);
      encryptionKeyRef.current = null;
      setMessages([]);
      setRawMessages([]);
      olderMsgsRef.current.clear();
      setHasMoreOnServer(true);
      prevDigestRef.current = "";
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

    setIsLoading(true);
    setConnectionError(null);
    let slotsLoaded = false;
    let messagesLoaded = false;
    const checkLoaded = () => {
      if (slotsLoaded && messagesLoaded) setIsLoading(false);
    };

    const slotsRef = ref(rtdb, `${roomPath}/slots`);
    const unsubSlots = onValue(slotsRef, (snap) => {
      const val = (snap.val() || {}) as Slots;
      setSlots(val);
      slotsLoaded = true;
      checkLoaded();
    }, (err) => {
      setConnectionError(`Failed to load room: ${err.message}`);
      setIsLoading(false);
    });

    // --- Server-side pagination ---
    // Only subscribe to the latest SERVER_PAGE messages over the wire.
    // Older messages are fetched on-demand via loadOlderFromServer().
    const messagesRef = ref(rtdb, `${roomPath}/messages`);
    const liveTailQuery = query(messagesRef, orderByKey(), limitToLast(SERVER_PAGE));
    const unsubMessages = onValue(liveTailQuery, (snap) => {
      const val = (snap.val() || {}) as Record<string, Omit<Message, "id">>;
      const liveMsgs = Object.entries(val)
        .map(([id, data]) => ({ id, ...data }));

      // If the live tail returned fewer than SERVER_PAGE, there are no older messages
      if (liveMsgs.length < SERVER_PAGE) {
        setHasMoreOnServer(false);
      }

      // Merge with on-demand older pages (older pages keyed by ID in ref)
      const merged = new Map<string, Message>();
      olderMsgsRef.current.forEach((msg, id) => merged.set(id, msg));
      for (const msg of liveMsgs) merged.set(msg.id, msg); // live overrides stale

      const msgs = Array.from(merged.values()).sort((a, b) => {
        const aTime = typeof a.createdAt === "number" ? a.createdAt : 0;
        const bTime = typeof b.createdAt === "number" ? b.createdAt : 0;
        return aTime - bTime;
      });

      // Build a lightweight digest of message IDs + text lengths.
      // When only metadata changes (readBy, reactions, seenReceiptBy),
      // the digest stays the same and we can skip the full decrypt pipeline.
      const digest =
        msgs.length +
        ":" +
        msgs.map((m) => m.id + ":" + (m.text?.length ?? 0)).join(",");

      if (digest === prevDigestRef.current && msgs.length > 0) {
        // Metadata-only update — merge directly into decrypted messages
        const freshMap = new Map(msgs.map((m) => [m.id, m]));
        setMessages((prev) =>
          prev.map((existing) => {
            const fresh = freshMap.get(existing.id);
            if (!fresh) return existing;
            return {
              ...existing,
              readBy: fresh.readBy,
              seenReceiptBy: fresh.seenReceiptBy,
              reactions: fresh.reactions,
              viewedBy: fresh.viewedBy,
              disappearedFor: fresh.disappearedFor,
            };
          }),
        );
        messagesLoaded = true;
        checkLoaded();
        return;
      }

      prevDigestRef.current = digest;
      setRawMessages(msgs);
      messagesLoaded = true;
      checkLoaded();
    }, (err) => {
      setConnectionError(`Failed to load messages: ${err.message}`);
      setIsLoading(false);
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

  // Decrypt messages incrementally — only decrypt messages we haven't seen before.
  // A module-level cache (decryptionCache) stores encrypted→decrypted mappings
  // so even across re-renders / hook instances, the same ciphertext is never
  // decrypted twice via the expensive crypto.subtle.decrypt call.
  const prevDecryptedRef = useRef<Map<string, Message>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function decryptIncremental() {
      const key = encryptionKeyRef.current;
      const prev = prevDecryptedRef.current;
      const isInitialLoad = prev.size === 0 && rawMessages.length > 0;

      // Fast path: no key — just pass through raw text
      if (!key) {
        const result = rawMessages.map((msg) => ({
          ...msg,
          decryptedText: msg.text,
        }));
        if (!cancelled) setMessages(result);
        return;
      }

      // Build result, reusing previously decrypted messages where possible
      const needsDecryption: { index: number; msg: Message }[] = [];
      const result: Message[] = new Array(rawMessages.length);

      for (let i = 0; i < rawMessages.length; i++) {
        const msg = rawMessages[i];

        // If the message hasn't changed (same id + same text), reuse previous
        const cached = prev.get(msg.id);
        if (cached && cached.text === msg.text) {
          // Merge updated non-text fields (readBy, reactions, etc.) but keep decryptedText
          result[i] = { ...msg, decryptedText: cached.decryptedText };
          continue;
        }

        // If we've already decrypted this exact ciphertext before, use the cache
        if (msg.text && decryptionCache.has(msg.text)) {
          result[i] = { ...msg, decryptedText: decryptionCache.get(msg.text)! };
          continue;
        }

        // Needs actual decryption
        if (msg.text) {
          needsDecryption.push({ index: i, msg });
        } else {
          result[i] = { ...msg, decryptedText: msg.text };
        }
      }

      // Nothing to decrypt — publish immediately
      if (needsDecryption.length === 0) {
        if (!cancelled) {
          const newPrev = new Map<string, Message>();
          for (const msg of result) newPrev.set(msg.id, msg);
          prevDecryptedRef.current = newPrev;
          setMessages(result);
        }
        return;
      }

      // For initial load: process newest messages first (user sees those)
      // and push progressive partial renders so the UI isn't frozen.
      const BATCH_SIZE = 200;
      const processingOrder = isInitialLoad
        ? [...needsDecryption].reverse()
        : needsDecryption;

      for (let b = 0; b < processingOrder.length; b += BATCH_SIZE) {
        if (cancelled) return;
        const batch = processingOrder.slice(b, b + BATCH_SIZE);
        const decryptedBatch = await Promise.all(
          batch.map(async ({ msg }) => {
            try {
              const decryptedText = await decryptMessage(msg.text!, key);
              decryptionCache.set(msg.text!, decryptedText);
              return decryptedText;
            } catch {
              return msg.text!;
            }
          }),
        );
        for (let j = 0; j < batch.length; j++) {
          result[batch[j].index] = {
            ...batch[j].msg,
            decryptedText: decryptedBatch[j],
          };
        }

        // During initial load with many messages, push partial updates
        // so the user sees newest messages while older ones decrypt.
        if (isInitialLoad && b + BATCH_SIZE < processingOrder.length) {
          if (!cancelled) {
            const partial = result.map(
              (m, idx) =>
                m ?? { ...rawMessages[idx], decryptedText: "\u2026" },
            );
            setMessages(partial);
          }
          // Yield to the main thread
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      if (cancelled) return;

      // Update the prev map for next run
      const newPrev = new Map<string, Message>();
      for (const msg of result) {
        newPrev.set(msg.id, msg);
      }
      prevDecryptedRef.current = newPrev;

      setMessages(result);
    }

    decryptIncremental();
    return () => {
      cancelled = true;
    };
    // encryptionKey (state) is included so this re-runs once the
    // async key derivation completes — encryptionKeyRef alone is a stable
    // ref and would never retrigger this effect.
  }, [rawMessages, encryptionKey, encryptionKeyRef]);

  // Load older messages on-demand via a one-shot get().
  // Uses orderByKey + endBefore (push keys are chronological).
  const loadOlderFromServer = useCallback(async () => {
    if (!isUnlocked || isLoadingOlder || !hasMoreOnServer) return;

    // Find the oldest message key we currently hold
    const allIds = [
      ...Array.from(olderMsgsRef.current.keys()),
      ...rawMessages.map((m) => m.id),
    ].sort();
    const oldestKey = allIds[0];
    if (!oldestKey) return;

    setIsLoadingOlder(true);
    try {
      const messagesRef = ref(rtdb, `${roomPath}/messages`);
      const olderQuery = query(
        messagesRef,
        orderByKey(),
        endBefore(oldestKey),
        limitToLast(SERVER_PAGE),
      );
      const snap = await get(olderQuery);
      const val = (snap.val() || {}) as Record<string, Omit<Message, "id">>;
      const fetched = Object.entries(val).map(([id, data]) => ({ id, ...data }));

      if (fetched.length < SERVER_PAGE) {
        setHasMoreOnServer(false);
      }

      if (fetched.length > 0) {
        // Add to the older-messages ref
        for (const msg of fetched) {
          olderMsgsRef.current.set(msg.id, msg);
        }

        // Re-merge everything and push through the pipeline
        const merged = new Map<string, Message>();
        olderMsgsRef.current.forEach((msg, id) => merged.set(id, msg));
        for (const msg of rawMessages) merged.set(msg.id, msg);

        const sorted = Array.from(merged.values()).sort((a, b) => {
          const aTime = typeof a.createdAt === "number" ? a.createdAt : 0;
          const bTime = typeof b.createdAt === "number" ? b.createdAt : 0;
          return aTime - bTime;
        });

        prevDigestRef.current = ""; // force full pipeline on next merge
        setRawMessages(sorted);
      }
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isUnlocked, isLoadingOlder, hasMoreOnServer, rawMessages, roomPath]);

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
    isLoading,
    connectionError,
    hasMoreOnServer,
    isLoadingOlder,
    loadOlderFromServer,
    handleThemeChange,
    handleIndicatorColorChange,
  };
}
