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
  const [gradientColors, setGradientColors] = useState<string[]>([]);
  const [useFallbackBucket, setUseFallbackBucket] = useState(false);
  const [tttState, setTttState] = useState<TttState | null>(null);
  const [presence, setPresence] = useState<{ "1"?: boolean; "2"?: boolean }>({});
  const [lastSeen, setLastSeen] = useState<{ "1"?: number; "2"?: number }>({});
  const [indicatorColors, setIndicatorColors] = useState<{ "1"?: string; "2"?: string }>({});
  const [keystrokePulse, setKeystrokePulse] = useState<{ "1"?: number; "2"?: number }>({});
  const [backspacePulse, setBackspacePulse] = useState<{ "1"?: number; "2"?: number }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasMoreOnServer, setHasMoreOnServer] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [loadAllProgress, setLoadAllProgress] = useState(0);

  const encryptionKeyRef = useRef<CryptoKey | null>(null);

  // Older messages loaded on-demand via get() — keyed by message ID
  const olderMsgsRef = useRef<Map<string, Message>>(new Map());

  // Structural digest — tracks message IDs + text to detect metadata-only updates
  const prevDigestRef = useRef("");

  // Pre-sorted array of older msgs — avoids re-sorting the full set on each live update
  const sortedOlderArrayRef = useRef<Message[]>([]);

  // Track the oldest key we hold so loadOlderFromServer doesn't need to sort all IDs
  const oldestKeyRef = useRef<string | null>(null);

  // Version counter for older messages — bumped each time loadOlderFromServer adds data
  // so onValue knows when to rebuild the full array vs. only process the live tail.
  const olderVersionRef = useRef(0);
  const prevOlderVersionRef = useRef(0);

  // Cache the last merged array from onValue to avoid recreating it if only live tail changed
  const prevMergedRef = useRef<Message[]>([]);

  // Track the current roomPath in a ref so async work can detect stale rooms
  const roomPathRef = useRef(roomPath);
  roomPathRef.current = roomPath;

  // Reset all room-specific state whenever the room path changes
  // (e.g. same combo but different passphrase → different room)
  useEffect(() => {
    setMessages([]);
    setRawMessages([]);
    setSlots({});
    setChatTheme("emerald");
    setPresence({});
    setLastSeen({});
    setIndicatorColors({});
    setKeystrokePulse({});
    setBackspacePulse({});
    setIsOtherTyping(false);
    setTttState(null);
    olderMsgsRef.current.clear();
    sortedOlderArrayRef.current = [];
    oldestKeyRef.current = null;
    olderVersionRef.current = 0;
    prevOlderVersionRef.current = 0;
    prevMergedRef.current = [];
    setHasMoreOnServer(true);
    prevDigestRef.current = "";
    prevDecryptedRef.current = new Map();
    setConnectionError(null);
  }, [roomPath]);

  // Derive encryption key from combo
  useEffect(() => {
    if (!isUnlocked || !combo) {
      setEncryptionKey(null);
      encryptionKeyRef.current = null;
      setMessages([]);
      setRawMessages([]);
      olderMsgsRef.current.clear();
      sortedOlderArrayRef.current = [];
      oldestKeyRef.current = null;
      olderVersionRef.current = 0;
      prevOlderVersionRef.current = 0;
      prevMergedRef.current = [];
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

      // Sort only the live tail (at most SERVER_PAGE = 200, always fast).
      liveMsgs.sort((a, b) => {
        const aTime = typeof a.createdAt === "number" ? a.createdAt : 0;
        const bTime = typeof b.createdAt === "number" ? b.createdAt : 0;
        return aTime - bTime;
      });

      // Update oldestKeyRef from live tail if it's the very first load
      if (!oldestKeyRef.current && liveMsgs.length > 0) {
        const sortedLiveIds = liveMsgs.map((m) => m.id).sort();
        oldestKeyRef.current = sortedLiveIds[0];
      }

      // Digest only over the live tail (max 200 msgs — always fast).
      // The older portion is immutable between loadOlderFromServer calls,
      // so we track its version separately.
      let textHash = 0;
      for (let i = 0; i < liveMsgs.length; i++) {
        textHash = ((textHash << 5) - textHash + (liveMsgs[i].text?.length ?? 0)) | 0;
      }
      const curOlderVer = olderVersionRef.current;
      const digest = `${curOlderVer}:${liveMsgs.length}:${liveMsgs[0]?.id ?? ""}:${liveMsgs[liveMsgs.length - 1]?.id ?? ""}:${textHash}`;

      if (digest === prevDigestRef.current && prevMergedRef.current.length > 0) {
        // Metadata-only update — patch metadata fields only in the live tail.
        const freshMap = new Map(liveMsgs.map((m) => [m.id, m]));
        setMessages((prev) => {
          // Live msgs are at the end of the array. Only scan the tail.
          const tailStart = Math.max(0, prev.length - liveMsgs.length);
          let changed = false;
          let patchedTail: Message[] | null = null;
          for (let i = tailStart; i < prev.length; i++) {
            const existing = prev[i];
            const fresh = freshMap.get(existing.id);
            if (fresh && (
              existing.readBy !== fresh.readBy ||
              existing.seenReceiptBy !== fresh.seenReceiptBy ||
              existing.reactions !== fresh.reactions ||
              existing.viewedBy !== fresh.viewedBy ||
              existing.disappearedFor !== fresh.disappearedFor ||
              existing.bgColor !== fresh.bgColor ||
              existing.bgEmojis !== fresh.bgEmojis ||
              existing.ephemeralExpired !== fresh.ephemeralExpired ||
              existing.imageUrl !== fresh.imageUrl ||
              existing.videoUrl !== fresh.videoUrl ||
              existing.screenshotSeenBy !== fresh.screenshotSeenBy
            )) {
              if (!patchedTail) {
                // Lazily copy just the tail
                patchedTail = prev.slice(tailStart);
              }
              patchedTail[i - tailStart] = {
                ...existing,
                readBy: fresh.readBy,
                seenReceiptBy: fresh.seenReceiptBy,
                reactions: fresh.reactions,
                viewedBy: fresh.viewedBy,
                disappearedFor: fresh.disappearedFor,
                bgColor: fresh.bgColor,
                bgEmojis: fresh.bgEmojis,
                ephemeralExpired: fresh.ephemeralExpired,
                imageUrl: fresh.imageUrl,
                imageFileId: fresh.imageFileId,
                videoUrl: fresh.videoUrl,
                videoFileId: fresh.videoFileId,
                screenshotSeenBy: fresh.screenshotSeenBy,
              };
              changed = true;
            }
          }
          if (!changed || !patchedTail) return prev;
          // Splice the patched tail back onto the unchanged older portion
          const olderPortion = prev.slice(0, tailStart);
          return [...olderPortion, ...patchedTail];
        });
        messagesLoaded = true;
        checkLoaded();
        return;
      }

      prevDigestRef.current = digest;

      // Build the merged array. If olderVersion hasn't changed, reuse
      // the older portion from prevMergedRef to avoid re-iterating 4k msgs.
      let msgs: Message[];
      const olderArr = sortedOlderArrayRef.current;

      if (curOlderVer === prevOlderVersionRef.current && prevMergedRef.current.length > 0 && olderArr.length > 0) {
        // Older portion unchanged — just replace the live tail at the end.
        // The older portion in prevMergedRef is everything up to the live tail.
        const olderCount = prevMergedRef.current.length - liveMsgs.length;
        // Safeguard: if counts don't line up (shouldn't happen), fall back to full rebuild
        if (olderCount >= 0 && olderCount <= prevMergedRef.current.length) {
          const olderSlice = prevMergedRef.current.slice(0, olderCount);
          msgs = [...olderSlice, ...liveMsgs];
        } else {
          // Fallback: full rebuild
          const liveIdSet = new Set(liveMsgs.map((m) => m.id));
          const filteredOlder = olderArr.filter((m) => !liveIdSet.has(m.id));
          msgs = [...filteredOlder, ...liveMsgs];
        }
      } else if (olderArr.length > 0) {
        // Older version changed (new page loaded) — rebuild once
        const liveIdSet = new Set(liveMsgs.map((m) => m.id));
        const filteredOlder = olderArr.filter((m) => !liveIdSet.has(m.id));
        msgs = [...filteredOlder, ...liveMsgs];
        prevOlderVersionRef.current = curOlderVer;
      } else {
        // No older messages — just live tail
        msgs = liveMsgs;
      }

      prevMergedRef.current = msgs;
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

  // Subscribe to keystroke pulses
  useEffect(() => {
    if (!isUnlocked) return;

    const pulseRef = ref(rtdb, `${roomPath}/keystrokePulse`);
    const unsub = onValue(pulseRef, (snap) => {
      const val = (snap.val() || {}) as { "1"?: number; "2"?: number };
      setKeystrokePulse(val);
    });

    return () => unsub();
  }, [isUnlocked, roomPath]);

  // Subscribe to backspace pulses
  useEffect(() => {
    if (!isUnlocked) return;

    const bpRef = ref(rtdb, `${roomPath}/backspacePulse`);
    const unsub = onValue(bpRef, (snap) => {
      const val = (snap.val() || {}) as { "1"?: number; "2"?: number };
      setBackspacePulse(val);
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
          "gradient",
        ].includes(val)
      ) {
        setChatTheme(val as ChatTheme);
      }
    });
    return () => unsub();
  }, [isUnlocked, roomPath]);

  // Subscribe to shared gradient colors
  useEffect(() => {
    if (!isUnlocked) return;
    const gcRef = ref(rtdb, `${roomPath}/gradientColors`);
    const unsub = onValue(gcRef, (snap) => {
      const val = snap.val();
      if (Array.isArray(val) && val.length >= 2 && val.length <= 10 && val.every((v: unknown) => typeof v === "string")) {
        setGradientColors(val as string[]);
      }
    });
    return () => unsub();
  }, [isUnlocked, roomPath]);

  // Subscribe to room-wide fallback-bucket toggle
  useEffect(() => {
    if (!isUnlocked) return;
    const bucketRef = ref(rtdb, `${roomPath}/useFallbackBucket`);
    const unsub = onValue(bucketRef, (snap) => {
      setUseFallbackBucket(snap.val() === true);
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
    // Capture the roomPath at effect start so we can detect stale writes
    const effectRoomPath = roomPath;

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
        if (!cancelled && roomPathRef.current === effectRoomPath) setMessages(result);
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
        if (!cancelled && roomPathRef.current === effectRoomPath) {
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
        if (cancelled || roomPathRef.current !== effectRoomPath) return;
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
          if (!cancelled && roomPathRef.current === effectRoomPath) {
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

      if (cancelled || roomPathRef.current !== effectRoomPath) return;

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
  }, [rawMessages, encryptionKey, encryptionKeyRef, roomPath]);

  // Load older messages on-demand via a one-shot get().
  // Uses orderByKey + endBefore (push keys are chronological).
  const loadOlderFromServer = useCallback(async () => {
    if (!isUnlocked || isLoadingOlder || !hasMoreOnServer) return;

    // Use the tracked oldest key — no need to sort all IDs
    const oldestKey = oldestKeyRef.current;
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

      // Only stop pagination when we get zero results — that means
      // we've truly reached the very first message in the DB.
      if (fetched.length === 0) {
        setHasMoreOnServer(false);
      }

      if (fetched.length > 0) {
        // Sort the freshly fetched page (at most SERVER_PAGE = 200, fast)
        fetched.sort((a, b) => {
          const aTime = typeof a.createdAt === "number" ? a.createdAt : 0;
          const bTime = typeof b.createdAt === "number" ? b.createdAt : 0;
          return aTime - bTime;
        });

        // Add to the older-messages Map (for dedup in onValue)
        for (const msg of fetched) {
          olderMsgsRef.current.set(msg.id, msg);
        }

        // Prepend to the pre-sorted older array
        sortedOlderArrayRef.current = [...fetched, ...sortedOlderArrayRef.current];

        // Update oldest key ref
        const fetchedIds = fetched.map((m) => m.id).sort();
        oldestKeyRef.current = fetchedIds[0];

        // Bump older version so onValue knows to rebuild the merged array
        olderVersionRef.current++;

        // Re-merge with live tail. Extract live portion from current rawMessages
        // (messages not in olderMsgsRef are the live tail).
        const livePortion: Message[] = [];
        for (const msg of rawMessages) {
          if (!olderMsgsRef.current.has(msg.id)) livePortion.push(msg);
        }
        const sorted = [...sortedOlderArrayRef.current, ...livePortion];
        prevMergedRef.current = sorted;

        prevDigestRef.current = ""; // force full pipeline on next merge
        setRawMessages(sorted);
      }
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isUnlocked, isLoadingOlder, hasMoreOnServer, rawMessages, roomPath]);

  // Load ALL older messages by repeatedly calling loadOlderFromServer
  const loadAllFromServer = useCallback(async () => {
    if (isLoadingAll || !hasMoreOnServer) return;
    setIsLoadingAll(true);
    setLoadAllProgress(0);
    let totalLoaded = 0;
    try {
      // Keep loading pages until there are no more
      let guard = 500; // safety limit
      while (guard-- > 0) {
        // Check current state via refs since state won't update mid-loop
        const oldestKey = oldestKeyRef.current;
        if (!oldestKey) break;

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

        if (fetched.length === 0) {
          setHasMoreOnServer(false);
          break;
        }

        totalLoaded += fetched.length;
        setLoadAllProgress(totalLoaded);

        fetched.sort((a, b) => {
          const aTime = typeof a.createdAt === "number" ? a.createdAt : 0;
          const bTime = typeof b.createdAt === "number" ? b.createdAt : 0;
          return aTime - bTime;
        });

        for (const msg of fetched) {
          olderMsgsRef.current.set(msg.id, msg);
        }

        sortedOlderArrayRef.current = [...fetched, ...sortedOlderArrayRef.current];

        const fetchedIds = fetched.map((m) => m.id).sort();
        oldestKeyRef.current = fetchedIds[0];
        olderVersionRef.current++;

        // Yield to the event loop so React can process
        await new Promise((r) => setTimeout(r, 0));
      }

      // Final merge
      const livePortion: Message[] = [];
      for (const msg of rawMessages) {
        if (!olderMsgsRef.current.has(msg.id)) livePortion.push(msg);
      }
      const sorted = [...sortedOlderArrayRef.current, ...livePortion];
      prevMergedRef.current = sorted;
      prevDigestRef.current = "";
      setRawMessages(sorted);
    } catch (err) {
      console.error("Failed to load all messages:", err);
    } finally {
      setIsLoadingAll(false);
    }
  }, [isLoadingAll, hasMoreOnServer, rawMessages, roomPath]);

  const handleThemeChange = useCallback(
    (theme: ChatTheme) => {
      if (!isUnlocked) return;
      const themeRef = ref(rtdb, `${roomPath}/theme`);
      set(themeRef, theme);
      setChatTheme(theme);
    },
    [isUnlocked, roomPath]
  );

  const handleGradientColorsChange = useCallback(
    (colors: string[]) => {
      if (!isUnlocked) return;
      const gcRef = ref(rtdb, `${roomPath}/gradientColors`);
      set(gcRef, colors);
      setGradientColors(colors);
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

  const handleUseFallbackBucketChange = useCallback(
    (useFallback: boolean) => {
      if (!isUnlocked) return;
      const bucketRef = ref(rtdb, `${roomPath}/useFallbackBucket`);
      set(bucketRef, useFallback);
      setUseFallbackBucket(useFallback);
    },
    [isUnlocked, roomPath]
  );

  return {
    slots,
    messages,
    encryptionKey,
    encryptionKeyRef,
    isOtherTyping,
    chatTheme,
    gradientColors,
    tttState,
    presence,
    lastSeen,
    indicatorColors,
    keystrokePulse,
    backspacePulse,
    isLoading,
    connectionError,
    hasMoreOnServer,
    isLoadingOlder,
    isLoadingAll,
    loadAllProgress,
    loadOlderFromServer,
    loadAllFromServer,
    handleThemeChange,
    handleGradientColorsChange,
    handleIndicatorColorChange,
    useFallbackBucket,
    handleUseFallbackBucketChange,
  };
}
