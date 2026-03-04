"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Message, ThemeColors } from "../types";

// Default slot colors (same as touch indicators)
const DEFAULT_SLOT_COLORS: Record<string, string> = {
  "1": "#ff3d3f", // coral red
  "2": "#9d3dff", // purple
};

/** How long (ms) the user must hold the button to toggle magic-wand mode */
const HOLD_TO_TOGGLE_MS = 5_000;

type ChatInputAreaProps = {
  slotId: "1" | "2" | null;
  messageText: string;
  isSending: boolean;
  replyingTo: Message | null;
  themeColors: ThemeColors;
  handleTypingChange: (value: string) => void;
  handleSendMessage: () => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setReplyingTo: (msg: Message | null) => void;
  onOpenVideoRecorder: () => void;
  chatTheme: string;
  /** Incremented on each local keystroke */
  localPulseKey?: number;
  /** Keystroke pulse timestamps from Firebase { "1"?: number, "2"?: number } */
  keystrokePulse?: { "1"?: number; "2"?: number };
  /** Custom indicator colors per slot (hex strings) */
  indicatorColors?: { "1"?: string; "2"?: string };
  /** All decrypted messages in the room – needed for AI magic-wand replies */
  messages?: Message[];
  /** Current user's screen name – needed for AI magic-wand replies */
  screenName?: string;
};

export function ChatInputArea({
  slotId,
  messageText,
  isSending,
  replyingTo,
  themeColors,
  handleTypingChange,
  handleSendMessage,
  handleImageUpload,
  setReplyingTo,
  onOpenVideoRecorder,
  chatTheme,
  localPulseKey = 0,
  keystrokePulse,
  indicatorColors,
  messages = [],
  screenName = "",
}: ChatInputAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wasSendingRef = useRef(false);

  // ── Magic-wand mode state ──────────────────────────────────────────
  const [isMagicMode, setIsMagicMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True while the user is holding the button (for the ring animation) */
  const [isHolding, setIsHolding] = useState(false);
  /** Suppress the click that fires on pointer-up after a successful hold-toggle */
  const justToggledRef = useRef(false);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(() => {
    justToggledRef.current = false;
    setIsHolding(true);
    holdTimerRef.current = setTimeout(() => {
      setIsMagicMode((prev) => !prev);
      holdTimerRef.current = null;
      setIsHolding(false);
      justToggledRef.current = true;
    }, HOLD_TO_TOGGLE_MS);
  }, []);

  const onPointerUpOrLeave = useCallback(() => {
    setIsHolding(false);
    clearHoldTimer();
  }, [clearHoldTimer]);

  // Clean up on unmount
  useEffect(() => clearHoldTimer, [clearHoldTimer]);

  // ── Magic-wand action ──────────────────────────────────────────────
  const handleMagicWand = useCallback(async () => {
    if (isGenerating) return;

    const recent = messages
      .filter((m) => !!m.decryptedText)
      .slice(-20)
      .map((m) => ({ sender: m.sender, text: m.decryptedText! }));

    if (recent.length === 0) return;

    setIsGenerating(true);
    try {
      const body: Record<string, unknown> = {
        recentMessages: recent,
        myName: screenName,
      };
      const currentText = messageText.trim();
      if (currentText.length > 0) body.currentText = currentText;

      const res = await fetch("/api/chat-magic-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.reply) handleTypingChange(data.reply);
    } catch {
      // silently fail
    } finally {
      setIsGenerating(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isGenerating, messages, screenName, messageText, handleTypingChange]);

  // Track remote pulse from the OTHER slot
  const otherSlot = slotId === "1" ? "2" : "1";
  const otherPulseAt = keystrokePulse?.[otherSlot];
  const [remotePulseKey, setRemotePulseKey] = useState(0);

  // When remote keystroke pulse timestamp changes, bump the remote pulse key
  useEffect(() => {
    if (otherPulseAt) {
      setRemotePulseKey((k) => k + 1);
    }
  }, [otherPulseAt]);

  // Resolve colors for each slot (custom → default)
  const myColor = slotId
    ? indicatorColors?.[slotId] || DEFAULT_SLOT_COLORS[slotId]
    : DEFAULT_SLOT_COLORS["1"];
  const otherColor =
    indicatorColors?.[otherSlot] || DEFAULT_SLOT_COLORS[otherSlot];

  // Re-focus input once isSending flips back to false (send complete)
  useEffect(() => {
    if (wasSendingRef.current && !isSending) {
      // Use rAF + setTimeout to wait until the input is re-enabled in the DOM
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
    wasSendingRef.current = isSending;
  }, [isSending]);

  // Focus input when a message is selected for replying
  useEffect(() => {
    if (replyingTo) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [replyingTo]);

  const sendAndRefocus = () => {
    handleSendMessage();
    // Immediate refocus attempts for fast sends
    setTimeout(() => inputRef.current?.focus(), 0);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="flex-shrink-0 border-t border-white/10 bg-black/60 px-2 py-2 safe-area-inset-bottom">
      {/* Reply preview bar */}
      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 text-sm">
          {replyingTo.imageUrl && (
            <img
              src={replyingTo.imageUrl}
              alt="Reply"
              className="w-10 h-10 rounded object-cover border border-white/10 flex-shrink-0"
            />
          )}
          <div className={`flex-1 border-l-2 border-${chatTheme}-400 pl-2`}>
            <p className={`text-[10px] text-${chatTheme}-400 font-semibold`}>
              Replying to {replyingTo.sender}
            </p>
            <p className="text-[10px] text-neutral-400 truncate">
              {replyingTo.decryptedText?.slice(0, 40) ||
                (replyingTo.imageUrl ? "📷 Image" : "") ||
                (replyingTo.drawingData?.length ? "🎨 Drawing" : "") ||
                (replyingTo.videoUrl ? "📹 Video" : "")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}
      <div className="relative flex items-center gap-2">
        {/* Local keystroke pulse glow */}
        {localPulseKey > 0 && (
          <div
            key={`local-${localPulseKey}`}
            className="keystroke-pulse-glow absolute inset-0 rounded-full"
            style={{
              boxShadow: `0 0 14px 3px ${myColor}, inset 0 0 6px 1px ${myColor}40`,
            }}
          />
        )}
        {/* Remote keystroke pulse glow */}
        {remotePulseKey > 0 && (
          <div
            key={`remote-${remotePulseKey}`}
            className="keystroke-pulse-glow absolute inset-0 rounded-full"
            style={{
              boxShadow: `0 0 14px 3px ${otherColor}, inset 0 0 6px 1px ${otherColor}40`,
            }}
          />
        )}
        <input
          ref={inputRef}
          autoFocus
          type="text"
          placeholder={slotId ? "Message" : "Join to chat"}
          value={messageText}
          disabled={!slotId || isSending}
          onChange={(e) => handleTypingChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendAndRefocus();
          }}
          className={`flex-1 rounded-full border  bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none border-${chatTheme}-400 border-opacity-70 disabled:opacity-50`}
        />
        <label
          className={`flex-shrink-0 rounded-full border border-${chatTheme}-400 p-2.5 text-white/85 transition ${slotId ? "cursor-pointer hover:bg-white/10" : "opacity-50"}`}
        >
          <input
            type="file"
            accept="image/*,video/*"
            disabled={!slotId || isSending}
            onChange={handleImageUpload}
            className="hidden"
          />
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </label>
        {/* Ephemeral video record button */}
        <button
          type="button"
          onClick={onOpenVideoRecorder}
          disabled={!slotId || isSending}
          className={`flex-shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-400 transition ${slotId ? "hover:bg-amber-500/20" : "opacity-50"} disabled:opacity-50`}
          title="Record ephemeral video"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
        <button
          onClick={() => {
            // Suppress the click that fires after a hold-toggle completed
            if (justToggledRef.current) {
              justToggledRef.current = false;
              return;
            }
            if (isMagicMode) {
              handleMagicWand();
            } else {
              sendAndRefocus();
            }
          }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUpOrLeave}
          onPointerLeave={onPointerUpOrLeave}
          onContextMenu={(e) => e.preventDefault()}
          disabled={
            !slotId ||
            (isMagicMode ? isGenerating : isSending || !messageText.trim())
          }
          className={`relative flex-shrink-0 rounded-full p-2.5 transition disabled:opacity-50 ${
            isMagicMode
              ? "bg-purple-600 text-white hover:bg-purple-500"
              : `${themeColors.btn} ${themeColors.text}`
          } hover:opacity-80`}
          title={
            isMagicMode
              ? messageText.trim()
                ? "Reword with AI (hold 5s to switch back)"
                : "Generate AI reply (hold 5s to switch back)"
              : "Send (hold 5s for magic wand)"
          }
        >
          {/* Hold-to-toggle ring animation */}
          {isHolding && (
            <svg
              className="absolute inset-0 h-full w-full -rotate-90 pointer-events-none"
              viewBox="0 0 40 40"
            >
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke={isMagicMode ? "#a855f7" : "#6366f1"}
                strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18}`}
                strokeLinecap="round"
                style={{
                  animation: `magic-ring-fill ${HOLD_TO_TOGGLE_MS}ms linear forwards`,
                }}
              />
            </svg>
          )}
          {isSending || isGenerating ? (
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : isMagicMode ? (
            /* Magic wand icon */
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
