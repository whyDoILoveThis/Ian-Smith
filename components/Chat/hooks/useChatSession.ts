"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  get,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  serverTimestamp,
  update,
} from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import { appwrImgDelete } from "@/appwrite/appwrStorage";
import { comboToRoomPath, roomStorageKey } from "../constants";
import { deriveKeyFromCombo, decryptMessage, encryptMessage } from "../crypto";
import type { Slots, Message } from "../types";

export function useChatSession(
  isUnlocked: boolean,
  slots: Slots,
  roomPath: string,
  combo: [number, number, number, number] | null = null,
) {
  const [screenName, setScreenName] = useState("");
  const [slotId, setSlotId] = useState<"1" | "2" | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreSession, setRestoreSession] = useState<{
    slotId: "1" | "2";
    name: string;
  } | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [pendingIsVideo, setPendingIsVideo] = useState(false);
  const [isImageConfirmOpen, setIsImageConfirmOpen] = useState(false);

  const restoreAttemptedRef = useRef(false);
  // Track which storageKey the current restoreSession was loaded from.
  // This prevents a stale restoreSession (loaded for room A) from being
  // applied when the room switches to B in the same React render cycle.
  const restoreSessionKeyRef = useRef<string | null>(null);

  const storageKey = roomStorageKey(roomPath);

  const databaseUrl = (
    rtdb as unknown as { app?: { options?: { databaseURL?: string } } }
  )?.app?.options?.databaseURL;

  // Load session from localStorage on mount / room change
  useEffect(() => {
    restoreAttemptedRef.current = false;
    setSlotId(null);
    setRestoreSession(null);
    restoreSessionKeyRef.current = null;
    setError(null);

    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { slotId: "1" | "2"; name: string };
        if (parsed?.slotId && parsed?.name) {
          setScreenName(parsed.name);
          setRestoreSession(parsed);
          restoreSessionKeyRef.current = storageKey;
        } else {
          setScreenName("");
        }
      } catch {
        window.localStorage.removeItem(storageKey);
        setScreenName("");
      }
    } else {
      // No saved session for this room – clear screen name so it's fresh
      setScreenName("");
    }
  }, [storageKey]);

  const availability = useMemo(() => {
    const isSlot1Taken = !!slots["1"]?.name;
    const isSlot2Taken = !!slots["2"]?.name;
    return {
      isSlot1Taken,
      isSlot2Taken,
      isFull: isSlot1Taken && isSlot2Taken,
    };
  }, [slots]);

  const claimSlot = useCallback(
    async (desiredSlot: "1" | "2", name: string) => {
      const slotRef = ref(rtdb, `${roomPath}/slots/${desiredSlot}`);
      const result = await runTransaction(slotRef, (current) => {
        if (current) return current;
        return {
          name: name.trim(),
          joinedAt: serverTimestamp(),
        };
      });
      return result.committed;
    },
    [roomPath],
  );

  const formatJoinError = useCallback(
    (err: unknown) => {
      const message = err instanceof Error ? err.message : "";
      if (!databaseUrl) {
        return "Realtime Database URL is missing. Set NEXT_PUBLIC_FIREBASE_DATABASE_URL.";
      }
      if (message.toLowerCase().includes("permission")) {
        return "Permission denied by Realtime Database rules.";
      }
      if (message.toLowerCase().includes("timeout")) {
        return "Join request timed out. Check Realtime Database connectivity.";
      }
      return "Unable to join right now.";
    },
    [databaseUrl],
  );

  // Restore session automatically
  useEffect(() => {
    if (!restoreSession || slotId || restoreAttemptedRef.current === true || !isUnlocked)
      return;
    // Guard: skip if restoreSession is stale (loaded for a different room)
    if (restoreSessionKeyRef.current !== storageKey) return;
    const desiredSlot = restoreSession.slotId;
    const desiredName = restoreSession.name.trim();
    if (!desiredName) return;

    const existing = slots[desiredSlot];
    if (existing?.name === desiredName) {
      setSlotId(desiredSlot);
      restoreAttemptedRef.current = true;
      return;
    }

    if (!existing) {
      restoreAttemptedRef.current = true;
      setIsJoining(true);
      claimSlot(desiredSlot, desiredName)
        .then((committed) => {
          if (committed) {
            setSlotId(desiredSlot);
          } else {
            setRestoreSession(null);
            window.localStorage.removeItem(storageKey);
          }
        })
        .catch((err) => {
          setError(formatJoinError(err));
          setRestoreSession(null);
          window.localStorage.removeItem(storageKey);
        })
        .finally(() => setIsJoining(false));
      return;
    }

    setRestoreSession(null);
    window.localStorage.removeItem(storageKey);
    restoreAttemptedRef.current = true;
  }, [claimSlot, formatJoinError, isUnlocked, restoreSession, slotId, slots, storageKey, roomPath]);

  const handleJoin = useCallback(async () => {
    if (!screenName.trim()) {
      setError("Please enter a screen name.");
      return;
    }
    if (availability.isFull) {
      setError("Both spots are currently occupied.");
      return;
    }

    if (!databaseUrl) {
      setError(
        "Realtime Database URL is missing. Set NEXT_PUBLIC_FIREBASE_DATABASE_URL.",
      );
      return;
    }

    setError(null);
    setIsJoining(true);
    try {
      const timeout = (ms: number) =>
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), ms),
        );
      const attempt = (slot: "1" | "2") =>
        Promise.race([claimSlot(slot, screenName), timeout(6000)]);

      const gotSlot1 = !availability.isSlot1Taken && (await attempt("1"));
      if (gotSlot1) {
        setSlotId("1");
        setIsJoining(false);
        return;
      }
      const gotSlot2 = !availability.isSlot2Taken && (await attempt("2"));
      if (gotSlot2) {
        setSlotId("2");
        setIsJoining(false);
        return;
      }
      setError("Someone joined right before you. Please try again.");
    } catch (err) {
      setError(formatJoinError(err));
    } finally {
      setIsJoining(false);
    }
  }, [
    availability.isFull,
    availability.isSlot1Taken,
    availability.isSlot2Taken,
    claimSlot,
    databaseUrl,
    formatJoinError,
    screenName,
  ]);

  // Save session to localStorage when slotId changes
  useEffect(() => {
    if (!slotId) return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ slotId, name: screenName.trim() }),
    );
  }, [screenName, slotId, storageKey]);

  const clearAllMessages = useCallback(async () => {
    const messageSnapshotRef = ref(rtdb, `${roomPath}/messages`);
    return new Promise<Message[]>((resolve) => {
      onValue(
        messageSnapshotRef,
        (snap) => {
          const val = (snap.val() || {}) as Record<string, Omit<Message, "id">>;
          const list = Object.entries(val).map(([id, data]) => ({
            id,
            ...data,
          }));
          resolve(list);
        },
        { onlyOnce: true },
      );
    });
  }, [roomPath]);

  const handleLeave = useCallback(async () => {
    if (!slotId || isLeaving) return;
    setIsLeaving(true);

    try {
      const messagesList = await clearAllMessages();
      const imageFileIds = messagesList
        .map((msg) => msg.imageFileId)
        .filter((id): id is string => Boolean(id));

      await Promise.all(
        imageFileIds.map((fileId) =>
          appwrImgDelete(fileId).catch(() => undefined),
        ),
      );

      await remove(ref(rtdb, `${roomPath}/messages`));
      await remove(ref(rtdb, `${roomPath}/slots/${slotId}`));
      await set(ref(rtdb, `${roomPath}/typing/${slotId}`), false);
    } catch {
      setError("Unable to leave cleanly. Try again.");
    } finally {
      setSlotId(null);
      setIsLeaving(false);
      setRestoreSession(null);
      if (pendingImageUrl) {
        URL.revokeObjectURL(pendingImageUrl);
      }
      setPendingImageFile(null);
      setPendingImageUrl(null);
      setIsImageConfirmOpen(false);
      window.localStorage.removeItem(storageKey);
    }
  }, [clearAllMessages, isLeaving, pendingImageUrl, slotId, storageKey, roomPath]);

  // ── Set a passkey on a spot ─────────────────────────────────────────
  const setSpotPasskey = useCallback(
    async (targetSlot: "1" | "2", passkey: string) => {
      try {
        await update(ref(rtdb, `${roomPath}/slots/${targetSlot}`), {
          passkey: passkey.trim(),
        });
      } catch {
        setError("Failed to set passkey.");
      }
    },
    [roomPath],
  );

  // ── Kick a user from a spot (verify passkey, clear slot only) ───────
  const kickSpot = useCallback(
    async (targetSlot: "1" | "2", enteredPasskey: string): Promise<boolean> => {
      try {
        const snap = await get(ref(rtdb, `${roomPath}/slots/${targetSlot}`));
        const slotData = snap.val();
        if (!slotData) {
          setError("That spot is already empty.");
          return false;
        }
        if (!slotData.passkey) {
          setError("No passkey has been set for that spot.");
          return false;
        }
        if (slotData.passkey !== enteredPasskey.trim()) {
          setError("Incorrect passkey.");
          return false;
        }
        // Clear the slot (keep messages, games, etc. untouched)
        await remove(ref(rtdb, `${roomPath}/slots/${targetSlot}`));
        // Clear typing indicator for kicked user
        await set(ref(rtdb, `${roomPath}/typing/${targetSlot}`), false);
        // Clear presence for kicked user
        await set(ref(rtdb, `${roomPath}/presence/${targetSlot}`), false);
        // If we just kicked ourselves, also clear local state
        if (targetSlot === slotId) {
          setSlotId(null);
          setRestoreSession(null);
          window.localStorage.removeItem(storageKey);
        }
        return true;
      } catch {
        setError("Failed to kick user.");
        return false;
      }
    },
    [roomPath, slotId, storageKey],
  );

  // ── Migrate all messages to another room (chunk-based) ───────────────
  const MIGRATE_CHUNK_SIZE = 50;

  const migrateConvo = useCallback(
    async (
      destCombo: [number, number, number, number],
      onProgress?: (migrated: number, total: number) => void,
      destPassphrase?: string | null,
    ): Promise<boolean> => {
      try {
        const destRoomPath = comboToRoomPath(destCombo, destPassphrase);
        if (destRoomPath === roomPath) {
          setError("Destination room is the same as the current room.");
          return false;
        }

        // Read all messages from current room
        const snap = await get(ref(rtdb, `${roomPath}/messages`));
        const messagesData = snap.val();
        if (!messagesData || Object.keys(messagesData).length === 0) {
          setError("No messages to migrate.");
          return false;
        }

        const sourceKey = combo ? await deriveKeyFromCombo(combo) : null;
        const destKey = await deriveKeyFromCombo(destCombo);

        const entries = Object.entries(messagesData);
        const total = entries.length;
        let migrated = 0;
        onProgress?.(0, total);

        // Process in chunks
        for (let i = 0; i < total; i += MIGRATE_CHUNK_SIZE) {
          const chunk = entries.slice(i, i + MIGRATE_CHUNK_SIZE);

          // Re-encrypt this chunk
          const chunkData: Record<string, unknown> = {};
          const chunkIds: string[] = [];
          for (const [msgId, msgVal] of chunk) {
            const msg = msgVal as Record<string, unknown>;
            chunkIds.push(msgId);
            if (msg.text && typeof msg.text === "string" && sourceKey && destKey) {
              try {
                const plaintext = await decryptMessage(msg.text as string, sourceKey);
                const newCiphertext = await encryptMessage(plaintext, destKey);
                chunkData[msgId] = { ...msg, text: newCiphertext };
              } catch {
                chunkData[msgId] = msg;
              }
            } else {
              chunkData[msgId] = msg;
            }
          }

          // Write chunk to destination
          await update(ref(rtdb, `${destRoomPath}/messages`), chunkData);

          // Delete chunk from source
          const deleteUpdates: Record<string, null> = {};
          for (const id of chunkIds) {
            deleteUpdates[`${roomPath}/messages/${id}`] = null;
          }
          await update(ref(rtdb), deleteUpdates);

          migrated += chunk.length;
          onProgress?.(migrated, total);
        }

        return true;
      } catch {
        setError("Migration failed — some messages may have already been moved.");
        return false;
      }
    },
    [roomPath, combo],
  );

  // ── Claim a spot on a new device (multi-device same spot) ───────────
  const claimSpot = useCallback(
    async (targetSlot: "1" | "2", enteredPasskey: string): Promise<boolean> => {
      try {
        const snap = await get(ref(rtdb, `${roomPath}/slots/${targetSlot}`));
        const slotData = snap.val();
        if (!slotData) {
          setError("That spot is empty — just join normally.");
          return false;
        }
        if (!slotData.passkey) {
          setError("No passkey has been set for that spot.");
          return false;
        }
        if (slotData.passkey !== enteredPasskey.trim()) {
          setError("Incorrect passkey.");
          return false;
        }
        // Passkey matches — adopt this slot locally
        setSlotId(targetSlot);
        setScreenName(slotData.name || "");
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ slotId: targetSlot, name: slotData.name || "" }),
        );
        return true;
      } catch {
        setError("Failed to claim spot.");
        return false;
      }
    },
    [roomPath, storageKey],
  );

  // Save session on unmount
  useEffect(() => {
    return () => {
      if (slotId) {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ slotId, name: screenName.trim() }),
        );
      }
    };
  }, [screenName, slotId, storageKey]);

  return {
    screenName,
    setScreenName,
    slotId,
    setSlotId,
    isJoining,
    isLeaving,
    error,
    setError,
    availability,
    handleJoin,
    handleLeave,
    pendingImageFile,
    setPendingImageFile,
    pendingImageUrl,
    setPendingImageUrl,
    pendingIsVideo,
    setPendingIsVideo,
    isImageConfirmOpen,
    setIsImageConfirmOpen,
    setSpotPasskey,
    kickSpot,
    migrateConvo,
    claimSpot,
  };
}
