"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  set,
  serverTimestamp,
} from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import { appwrImgDelete, appwrImgUp } from "@/appwrite/appwrStorage";
import LockBox from "@/components/LockBox/LockBox";

const ROOM_PATH = "twoWayChat";
const STORAGE_KEY = "twoWayChatSession";
const COMBO_STORAGE_KEY = "twoWayChatCombo";
const DERIVATION_SALT = "twoWayChatComboSalt:v1";
const SECRET_PHRASE = "takemetothemagicalplacenow";

type AIMessage = {
  role: "user" | "assistant";
  content: string;
};

// ============== E2E ENCRYPTION UTILITIES ==============

// Encode string to ArrayBuffer for crypto operations
function encodeText(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer as ArrayBuffer;
}

// Decode ArrayBuffer to string
function decodeText(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

// Convert ArrayBuffer to hex
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Convert hex to ArrayBuffer
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

// Convert ArrayBuffer to base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

// Derive an AES key from the LockBox combo
async function deriveKeyFromCombo(
  combo: [number, number, number, number],
): Promise<CryptoKey> {
  const comboString = combo.map((n) => n.toString().padStart(4, "0")).join("-");
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encodeText(comboString),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encodeText(DERIVATION_SALT),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// Encrypt a message using AES-256-GCM
async function encryptMessage(
  plaintext: string,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodeText(plaintext),
  );

  // Format: iv_hex:ciphertext_base64
  return (
    bufferToHex(iv.buffer as ArrayBuffer) + ":" + bufferToBase64(ciphertext)
  );
}

// Decrypt a message using AES-256-GCM
async function decryptMessage(
  encrypted: string,
  key: CryptoKey,
): Promise<string> {
  const [ivHex, ciphertextB64] = encrypted.split(":");
  if (!ivHex || !ciphertextB64) {
    throw new Error("Invalid encrypted format");
  }

  const iv = hexToBuffer(ivHex);
  const ciphertext = base64ToBuffer(ciphertextB64);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return decodeText(plaintext);
}

// ============== END E2E ENCRYPTION UTILITIES ==============

type SlotState = {
  name: string;
  joinedAt: number | object;
};

type Slots = {
  "1"?: SlotState | null;
  "2"?: SlotState | null;
};

type Message = {
  id: string;
  slotId: "1" | "2";
  sender: string;
  text?: string; // Encrypted text from DB
  decryptedText?: string; // Decrypted text for display
  imageUrl?: string;
  imageFileId?: string;
  createdAt?: number | object;
  decryptionFailed?: boolean;
};

export default function AIContentSugestions() {
  const [screenName, setScreenName] = useState("");
  const [slotId, setSlotId] = useState<"1" | "2" | null>(null);
  const [slots, setSlots] = useState<Slots>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isImageConfirmOpen, setIsImageConfirmOpen] = useState(false);
  const [restoreSession, setRestoreSession] = useState<{
    slotId: "1" | "2";
    name: string;
  } | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [combo, setCombo] = useState<[number, number, number, number] | null>(
    null,
  );
  const [rawMessages, setRawMessages] = useState<Message[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  // AI Chat disguise state
  const [showLockBox, setShowLockBox] = useState(false);
  const [showRealChat, setShowRealChat] = useState(false);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiBottomRef = useRef<HTMLDivElement>(null);

  const restoreAttemptedRef = useRef(false);
  const databaseUrl = (
    rtdb as unknown as { app?: { options?: { databaseURL?: string } } }
  )?.app?.options?.databaseURL;

  const bottomRef = useRef<HTMLDivElement>(null);
  const encryptionKeyRef = useRef<CryptoKey | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const ringColors = ["#f97316", "#3b82f6", "#22c55e", "#ec4899"] as const;
  // Store combo locally (user-entered)
  useEffect(() => {
    if (combo) {
      window.localStorage.setItem(COMBO_STORAGE_KEY, JSON.stringify(combo));
    }
  }, [combo]);

  // Scroll AI chat to bottom
  useEffect(() => {
    aiBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // Build the secret passphrase from the current combo
  const getSecretPassphrase = useCallback(() => {
    if (!combo) return null;
    return combo.join("-") + SECRET_PHRASE;
  }, [combo]);

  // Handle AI chat send
  const handleAiSend = useCallback(async () => {
    const input = aiInput.trim();
    if (!input || isAiLoading) return;

    // Check if this is the secret phrase
    const secret = getSecretPassphrase();
    if (secret && input === secret) {
      setAiInput("");
      setShowRealChat(true);
      return;
    }

    // Otherwise, send to AI
    setAiInput("");
    const userMsg: AIMessage = { role: "user", content: input };
    setAiMessages((prev) => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/its-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessages: [...aiMessages, userMsg],
        }),
      });

      const data = await response.json();
      const assistantContent =
        data.reply || data.error || "Sorry, I couldn't process that.";
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantContent },
      ]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again." },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  }, [aiInput, aiMessages, getSecretPassphrase, isAiLoading]);

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
      const selectedCombo = combo;
      if (!selectedCombo) return;
      const key = await deriveKeyFromCombo(selectedCombo);
      setEncryptionKey(key);
      encryptionKeyRef.current = key;
      window.localStorage.setItem(
        COMBO_STORAGE_KEY,
        JSON.stringify(selectedCombo),
      );
    }
    derive();
  }, [combo, isUnlocked]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { slotId: "1" | "2"; name: string };
        if (parsed?.slotId && parsed?.name) {
          setScreenName(parsed.name);
          setRestoreSession(parsed);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    if (!isUnlocked) return;

    const slotsRef = ref(rtdb, `${ROOM_PATH}/slots`);
    const unsubSlots = onValue(slotsRef, (snap) => {
      const val = (snap.val() || {}) as Slots;
      setSlots(val);
    });

    const messagesRef = ref(rtdb, `${ROOM_PATH}/messages`);
    const unsubMessages = onValue(messagesRef, (snap) => {
      const val = (snap.val() || {}) as Record<string, Omit<Message, "id">>;
      const rawMessages = Object.entries(val)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => {
          const aTime = typeof a.createdAt === "number" ? a.createdAt : 0;
          const bTime = typeof b.createdAt === "number" ? b.createdAt : 0;
          return aTime - bTime;
        });
      setRawMessages(rawMessages);
    });

    const typingRef = ref(rtdb, `${ROOM_PATH}/typing`);
    const unsubTyping = onValue(typingRef, (snap) => {
      if (!slotId) {
        setIsOtherTyping(false);
        return;
      }
      const val = (snap.val() || {}) as Record<string, boolean>;
      const otherSlot = slotId === "1" ? "2" : "1";
      setIsOtherTyping(Boolean(val?.[otherSlot]));
    });

    return () => {
      unsubSlots();
      unsubMessages();
      unsubTyping();
    };
  }, [isUnlocked, slotId]);

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

  useEffect(() => {
    const id = window.setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 0);
    return () => window.clearTimeout(id);
  }, [messages, isOtherTyping]);

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
      const slotRef = ref(rtdb, `${ROOM_PATH}/slots/${desiredSlot}`);
      const result = await runTransaction(slotRef, (current) => {
        if (current) return current;
        return {
          name: name.trim(),
          joinedAt: serverTimestamp(),
        };
      });
      return result.committed;
    },
    [],
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

  useEffect(() => {
    if (!restoreSession || slotId || restoreAttemptedRef.current === true)
      return;
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
            window.localStorage.removeItem(STORAGE_KEY);
          }
        })
        .catch((err) => {
          setError(formatJoinError(err));
          setRestoreSession(null);
          window.localStorage.removeItem(STORAGE_KEY);
        })
        .finally(() => setIsJoining(false));
      return;
    }

    setRestoreSession(null);
    window.localStorage.removeItem(STORAGE_KEY);
    restoreAttemptedRef.current = true;
  }, [claimSlot, restoreSession, slotId, slots]);

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

  useEffect(() => {
    if (!slotId) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ slotId, name: screenName.trim() }),
    );
  }, [screenName, slotId]);

  const clearAllMessages = useCallback(async () => {
    const messageSnapshotRef = ref(rtdb, `${ROOM_PATH}/messages`);
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
  }, []);

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

      await remove(ref(rtdb, `${ROOM_PATH}/messages`));
      await remove(ref(rtdb, `${ROOM_PATH}/slots/${slotId}`));
      await set(ref(rtdb, `${ROOM_PATH}/typing/${slotId}`), false);
    } catch (err) {
      setError("Unable to leave cleanly. Try again.");
    } finally {
      setSlotId(null);
      setIsLeaving(false);
      setMessageText("");
      setRestoreSession(null);
      if (pendingImageUrl) {
        URL.revokeObjectURL(pendingImageUrl);
      }
      setPendingImageFile(null);
      setPendingImageUrl(null);
      setIsImageConfirmOpen(false);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [clearAllMessages, isLeaving, pendingImageUrl, slotId]);

  const setTypingState = useCallback(
    async (isTyping: boolean) => {
      if (!slotId) return;
      try {
        await set(ref(rtdb, `${ROOM_PATH}/typing/${slotId}`), isTyping);
      } catch {
        // ignore typing errors
      }
    },
    [slotId],
  );

  const handleSendMessage = useCallback(async () => {
    if (!slotId || !screenName.trim() || !messageText.trim() || !encryptionKey)
      return;
    setIsSending(true);
    setError(null);

    setTypingState(false);

    try {
      // Encrypt the message before sending
      const encryptedText = await encryptMessage(
        messageText.trim(),
        encryptionKey,
      );

      const msgRef = ref(rtdb, `${ROOM_PATH}/messages`);
      await push(msgRef, {
        slotId,
        sender: screenName.trim(),
        text: encryptedText, // Encrypted text goes to DB
        createdAt: serverTimestamp(),
      });
      setMessageText("");
    } catch (err) {
      setError("Message failed to send.");
    } finally {
      setIsSending(false);
    }
  }, [encryptionKey, messageText, screenName, setTypingState, slotId]);

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!slotId || !screenName.trim()) return;
      const file = event.target.files?.[0];
      if (!file) return;

      if (pendingImageUrl) {
        URL.revokeObjectURL(pendingImageUrl);
      }

      const previewUrl = URL.createObjectURL(file);
      setPendingImageFile(file);
      setPendingImageUrl(previewUrl);
      setIsImageConfirmOpen(true);
      event.target.value = "";
    },
    [pendingImageUrl, screenName, slotId],
  );

  const handleConfirmImage = useCallback(async () => {
    if (!pendingImageFile || !slotId || !screenName.trim()) return;
    setIsSending(true);
    setError(null);

    try {
      const upload = await appwrImgUp(pendingImageFile);
      const msgRef = ref(rtdb, `${ROOM_PATH}/messages`);
      await push(msgRef, {
        slotId,
        sender: screenName.trim(),
        imageUrl: upload.url,
        imageFileId: upload.fileId,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      setError("Image failed to send.");
      return;
    } finally {
      setIsSending(false);
    }

    if (pendingImageUrl) {
      URL.revokeObjectURL(pendingImageUrl);
    }
    setPendingImageFile(null);
    setPendingImageUrl(null);
    setIsImageConfirmOpen(false);
  }, [pendingImageFile, pendingImageUrl, screenName, slotId]);

  const handleCancelImage = useCallback(() => {
    if (pendingImageUrl) {
      URL.revokeObjectURL(pendingImageUrl);
    }
    setPendingImageFile(null);
    setPendingImageUrl(null);
    setIsImageConfirmOpen(false);
  }, [pendingImageUrl]);

  useEffect(() => {
    return () => {
      if (slotId) {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ slotId, name: screenName.trim() }),
        );
      }
    };
  }, [screenName, slotId]);

  // LockBox screen - only shown when user clicks the apostrophe
  if (showLockBox) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-black py-10 px-4">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              GPT-4o AI Passkey Generator
            </h1>
            <p className="mt-2 text-neutral-400">Choose any LockBox code.</p>
            <button
              type="button"
              onClick={() => setShowLockBox(false)}
              className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Back to chat
            </button>
          </div>

          <div className="mt-6">
            <LockBox
              onUnlock={(selectedCombo) => {
                setCombo(selectedCombo);
                setIsUnlocked(true);
                setShowLockBox(false);
              }}
            >
              <div />
            </LockBox>
          </div>
        </div>
      </div>
    );
  }

  // AI Chat disguise - looks like a normal AI chatbot
  if (!showRealChat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-black py-10 px-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Ian
              <button
                type="button"
                onClick={() => setShowLockBox(true)}
                className="hover:text-emerald-400 transition-colors"
                title=""
              >
                &apos;
              </button>
              s AI Assistant
            </h1>
            <p className="mt-2 text-neutral-400">
              Ask me anything about web development, my projects, or how I can
              help.
            </p>
          </div>

          <div className="flex min-h-[520px] flex-col rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Chat with AI</h2>
              <p className="text-xs text-neutral-400">
                Powered by Groq • Ask me anything
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              {aiMessages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-neutral-400">
                  Start a conversation. Ask about my skills, projects, or how I
                  can help with yours.
                </div>
              )}
              {aiMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-lg ${
                      msg.role === "user"
                        ? "bg-emerald-400/90 text-black"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-wide opacity-70">
                      {msg.role === "user" ? "You" : "Ian AI"}
                    </p>
                    <p className="mt-1 whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl bg-white/10 px-4 py-3 text-sm text-white shadow-lg">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">
                      Ian AI
                    </p>
                    <p className="mt-1 animate-pulse">Thinking...</p>
                  </div>
                </div>
              )}
              <div ref={aiBottomRef} />
            </div>

            <div className="border-t border-white/10 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAiSend();
                    }
                  }}
                  disabled={isAiLoading}
                  className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-50"
                />
                <button
                  onClick={handleAiSend}
                  disabled={isAiLoading || !aiInput.trim()}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAiLoading ? "..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-black py-10 px-4">
      {isImageConfirmOpen && pendingImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-900/90 p-6 shadow-2xl backdrop-blur">
            <h3 className="text-lg font-semibold text-white">
              Send this image?
            </h3>
            <p className="mt-1 text-sm text-neutral-400">
              Confirm or cancel before sending.
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              <img
                src={pendingImageUrl}
                alt="Preview"
                className="max-h-[320px] w-full object-contain"
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleCancelImage}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImage}
                disabled={isSending}
                className="flex-1 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? "Sending..." : "Send Image"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            AI Answerer
          </h1>
          <p className="mt-2 text-neutral-400">
            Data persists through refresh. The red LEAVE button clears the
            entire room completely.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setShowLockBox(true);
                setShowRealChat(false);
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Change passkey
            </button>
            {combo && (
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
                <span className="text-neutral-400">Passkey:</span>
                {combo.map((value, index) => (
                  <span
                    key={`${value}-${index}`}
                    className="rounded-full border border-white/10 bg-black/40 px-3 py-1"
                    style={{ color: ringColors[index] }}
                  >
                    {value}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">Room Spots</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                <span>Spot 1</span>
                <span
                  className={
                    availability.isSlot1Taken
                      ? "text-amber-300"
                      : "text-emerald-300"
                  }
                >
                  {slots["1"]?.name || "Available"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                <span>Spot 2</span>
                <span
                  className={
                    availability.isSlot2Taken
                      ? "text-amber-300"
                      : "text-emerald-300"
                  }
                >
                  {slots["2"]?.name || "Available"}
                </span>
              </div>
            </div>

            {slotId ? (
              <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
                You are in spot {slotId} as{" "}
                <span className="font-semibold">{screenName}</span>.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <input
                  type="text"
                  placeholder="Your screen name"
                  value={screenName}
                  onChange={(event) => setScreenName(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
                <button
                  onClick={handleJoin}
                  disabled={availability.isFull || isJoining}
                  className="w-full rounded-2xl bg-emerald-400/90 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {availability.isFull
                    ? "Room Full"
                    : isJoining
                      ? "Joining..."
                      : "Join Chat"}
                </button>
              </div>
            )}

            <div className="mt-6 text-xs text-neutral-400">
              <p>Leaving clears all messages and images for both users.</p>
            </div>

            {slotId && (
              <button
                onClick={handleLeave}
                disabled={isLeaving}
                className="mt-5 w-full rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLeaving ? "Leaving..." : "Leave & Clear Room"}
              </button>
            )}

            {error && <p className="mt-4 text-xs text-red-300">{error}</p>}
          </div>

          <div className="flex min-h-[520px] flex-col rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Live Chat</h2>
              <p className="text-xs text-neutral-400">
                🔒 End-to-end encrypted • Firebase Realtime Database
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              {messages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-neutral-400">
                  No messages yet. Say hello!
                </div>
              )}
              {messages.map((msg) => {
                const isMine = slotId === msg.slotId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-lg ${
                        isMine
                          ? "bg-emerald-400/90 text-black"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-wide opacity-70">
                        {msg.sender}
                        {msg.decryptionFailed && (
                          <span className="ml-2 text-amber-400">
                            ⚠️ unencrypted
                          </span>
                        )}
                      </p>
                      {msg.decryptedText && (
                        <p className="mt-1 whitespace-pre-line">
                          {msg.decryptedText}
                        </p>
                      )}
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt="Uploaded"
                          className="mt-2 w-full rounded-xl border border-white/10"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
              {isOtherTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl bg-white/10 px-4 py-3 text-sm text-white shadow-lg">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">
                      Typing
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full bg-white/70 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-2 w-2 rounded-full bg-white/70 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-2 w-2 rounded-full bg-white/70 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-white/10 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  placeholder={slotId ? "Type a message" : "Join to chat"}
                  value={messageText}
                  disabled={!slotId || isSending}
                  onChange={(event) => {
                    setMessageText(event.target.value);
                    if (slotId) {
                      setTypingState(true);
                      if (typingTimeoutRef.current) {
                        window.clearTimeout(typingTimeoutRef.current);
                      }
                      typingTimeoutRef.current = window.setTimeout(() => {
                        setTypingState(false);
                      }, 1200);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!slotId || isSending || !messageText.trim()}
                  className="rounded-2xl bg-white text-sm font-semibold text-black px-5 py-3 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send
                </button>
                <label
                  className={`rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition ${slotId ? "cursor-pointer hover:border-white/30" : "opacity-50"}`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    disabled={!slotId || isSending}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  Image
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
