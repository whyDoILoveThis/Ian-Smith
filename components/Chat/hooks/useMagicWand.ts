"use client";

import { useCallback, useRef, useState } from "react";
import type { Message } from "../types";

const HOLD_DURATION_MS = 5_000; // 5 seconds to toggle mode
const RECENT_MSG_COUNT = 20;

type UseMagicWandOptions = {
  /** Current text in the input field */
  messageText: string;
  /** Setter to update the input field text */
  setMessageText: (text: string) => void;
  /** The current user's screen name */
  screenName: string;
  /** All chat messages (decrypted) available in the room */
  messages: Message[];
};

export function useMagicWand({
  messageText,
  setMessageText,
  screenName,
  messages,
}: UseMagicWandOptions) {
  const [isMagicMode, setIsMagicMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Hold-to-toggle refs
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartRef = useRef<number>(0);

  // --- Long-press handlers (start / end / cancel) ---

  const onHoldStart = useCallback(() => {
    holdStartRef.current = Date.now();
    holdTimerRef.current = setTimeout(() => {
      setIsMagicMode((prev) => !prev);
      holdTimerRef.current = null;
    }, HOLD_DURATION_MS);
  }, []);

  const onHoldEnd = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  // --- Get the last N messages with decrypted text ---
  const getRecentMessages = useCallback(() => {
    return messages
      .filter((m) => !!m.decryptedText)
      .slice(-RECENT_MSG_COUNT)
      .map((m) => ({
        sender: m.sender,
        text: m.decryptedText!,
      }));
  }, [messages]);

  // --- Fire the magic wand action ---
  const handleMagicWand = useCallback(async () => {
    if (isGenerating) return;

    const recent = getRecentMessages();
    if (recent.length === 0) return; // nothing to work with

    setIsGenerating(true);
    try {
      const body: Record<string, unknown> = {
        recentMessages: recent,
        myName: screenName,
      };

      const currentText = messageText.trim();
      if (currentText.length > 0) {
        body.currentText = currentText;
      }

      const res = await fetch("/api/chat-magic-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.reply) {
        setMessageText(data.reply);
      }
    } catch {
      // silently fail – user can just try again
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, getRecentMessages, screenName, messageText, setMessageText]);

  /** Progress fraction (0-1) for the hold indicator – driven externally via CSS animation */
  const holdDurationMs = HOLD_DURATION_MS;

  return {
    isMagicMode,
    isGenerating,
    holdDurationMs,
    onHoldStart,
    onHoldEnd,
    handleMagicWand,
  };
}
