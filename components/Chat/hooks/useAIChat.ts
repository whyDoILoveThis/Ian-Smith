"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SECRET_PHRASE } from "../constants";
import type { AIMessage } from "../types";

/**
 * Regex that matches a valid passphrase entry:
 *   <combo digits joined by ->  followed by  <1+ lowercase letters>
 * e.g. "998-234-1000-1000gotoit"
 *
 * Group 1 = the combo prefix (e.g. "998-234-1000-1000")
 * Group 2 = the passphrase tail (e.g. "gotoit")
 */
const PASSPHRASE_RE = /^(\d{1,4}-\d{1,4}-\d{1,4}-\d{1,4})([a-z]+)$/;

export function useAIChat(
  combo: [number, number, number, number] | null,
  setShowRealChat: (show: boolean) => void,
  onPassphraseDetected?: (passphrase: string) => void,
) {
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiBottomRef = useRef<HTMLDivElement>(null);

  // Scroll AI chat to bottom
  useEffect(() => {
    aiBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // Build the legacy secret passphrase from the current combo
  const getSecretPassphrase = useCallback(() => {
    if (!combo) return null;
    return combo.join("-") + SECRET_PHRASE;
  }, [combo]);

  // Handle AI chat send
  const handleAiSend = useCallback(async () => {
    const input = aiInput.trim();
    if (!input || isAiLoading) return;

    // ── 1. Check for legacy secret phrase (exact match) ──────────────
    const secret = getSecretPassphrase();
    if (secret && input === secret) {
      setAiInput("");
      onPassphraseDetected?.(SECRET_PHRASE);
      setShowRealChat(true);
      return;
    }

    // ── 2. Check for *any* valid custom passphrase ───────────────────
    //    Format: <combo digits separated by ->  <lowercase letters>
    //    The combo portion must match the currently-selected combo.
    if (combo) {
      const match = input.match(PASSPHRASE_RE);
      if (match) {
        const inputCombo = match[1]; // e.g. "998-234-1000-1000"
        const phrase = match[2];     // e.g. "gotoit"
        if (inputCombo === combo.join("-")) {
          setAiInput("");
          onPassphraseDetected?.(phrase);
          setShowRealChat(true);
          return;
        }
      }
    }

    // ── 3. Otherwise, send to AI ─────────────────────────────────────
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
  }, [aiInput, aiMessages, combo, getSecretPassphrase, isAiLoading, onPassphraseDetected, setShowRealChat]);

  return {
    aiMessages,
    aiInput,
    setAiInput,
    isAiLoading,
    aiBottomRef,
    handleAiSend,
  };
}
