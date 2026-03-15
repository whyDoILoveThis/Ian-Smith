"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Message, ThemeColors } from "../types";
import { PhoneGalleryPicker } from "./PhoneGalleryPicker";
import { toProxyUrl } from "@/lib/appwriteProxy";

// Default slot colors (same as touch indicators)
const DEFAULT_SLOT_COLORS: Record<string, string> = {
  "1": "#ff3d3f", // coral red
  "2": "#9d3dff", // purple
};

/** How long (ms) the user must hold the button to open the magic menu */
const HOLD_TO_MENU_MS = 1_000;

// ── Magic-menu option definitions ────────────────────────────────────
type MagicOption = {
  id: string;
  label: string;
  icon: string;
  /** Sent to the API as the `mode` field */
  mode: string;
};

type ReplyLength = "short" | "medium" | "long";

const LENGTH_CHIPS: { value: ReplyLength; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

/** Options shown when the input field is empty (generate from scratch) */
const GENERATE_OPTIONS: MagicOption[] = [
  { id: "gen-reply", label: "Generate Reply", icon: "✨", mode: "generate" },
  { id: "gen-funny", label: "Funny Reply", icon: "😂", mode: "generate-funny" },
  {
    id: "gen-flirty",
    label: "Flirty Reply",
    icon: "😏",
    mode: "generate-flirty",
  },
  {
    id: "gen-formal",
    label: "Formal Reply",
    icon: "🎩",
    mode: "generate-formal",
  },
  {
    id: "gen-sarcastic",
    label: "Sarcastic Reply",
    icon: "🙄",
    mode: "generate-sarcastic",
  },
  {
    id: "gen-supportive",
    label: "Supportive Reply",
    icon: "💪",
    mode: "generate-supportive",
  },
  {
    id: "gen-mysterious",
    label: "Mysterious Reply",
    icon: "🔮",
    mode: "generate-mysterious",
  },
  { id: "gen-bold", label: "Bold Reply", icon: "🔥", mode: "generate-bold" },
  {
    id: "gen-poetic",
    label: "Poetic Reply",
    icon: "📝",
    mode: "generate-poetic",
  },
  { id: "gen-genz", label: "Gen-Z Reply", icon: "💀", mode: "generate-genz" },
  {
    id: "gen-sexy",
    label: "Sexy Reply",
    icon: "🥵",
    mode: "generate-sexy",
  },
];

/** Options shown when the input field already has text (rewrite) */
const REWRITE_OPTIONS: MagicOption[] = [
  { id: "rw-improve", label: "Improve Wording", icon: "✨", mode: "rewrite" },
  {
    id: "rw-expand",
    label: "Expand & Deepen",
    icon: "💡",
    mode: "rewrite-expand",
  },
  {
    id: "rw-funny",
    label: "Make It Funnier",
    icon: "😂",
    mode: "rewrite-funny",
  },
  {
    id: "rw-flirty",
    label: "Make It Flirty",
    icon: "😏",
    mode: "rewrite-flirty",
  },
  {
    id: "rw-formal",
    label: "Make It Formal",
    icon: "🎩",
    mode: "rewrite-formal",
  },
  {
    id: "rw-sarcastic",
    label: "Make It Sarcastic",
    icon: "🙄",
    mode: "rewrite-sarcastic",
  },
  {
    id: "rw-supportive",
    label: "Make It Supportive",
    icon: "💪",
    mode: "rewrite-supportive",
  },
  {
    id: "rw-mysterious",
    label: "Make It Mysterious",
    icon: "🔮",
    mode: "rewrite-mysterious",
  },
  { id: "rw-bold", label: "Make It Bolder", icon: "🔥", mode: "rewrite-bold" },
  {
    id: "rw-poetic",
    label: "Make It Poetic",
    icon: "📝",
    mode: "rewrite-poetic",
  },
  { id: "rw-genz", label: "Gen-Z It", icon: "💀", mode: "rewrite-genz" },
  {
    id: "rw-sexy",
    label: "Make It Sexy",
    icon: "🥵",
    mode: "rewrite-sexy",
  },
  {
    id: "rw-shorter",
    label: "Make It Shorter",
    icon: "✂️",
    mode: "rewrite-shorter",
  },
];

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wasSendingRef = useRef(false);

  // ── Image-menu state ───────────────────────────────────────────────
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const imageMenuRef = useRef<HTMLDivElement>(null);

  // Close image menu on outside click
  useEffect(() => {
    if (!showImageMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        imageMenuRef.current &&
        !imageMenuRef.current.contains(e.target as Node)
      ) {
        setShowImageMenu(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showImageMenu]);

  const handleGallerySelect = useCallback(
    (file: File) => {
      setShowGalleryPicker(false);
      const dt = new DataTransfer();
      dt.items.add(file);
      const mockEvent = {
        target: { files: dt.files, value: "" },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleImageUpload(mockEvent);
    },
    [handleImageUpload],
  );

  // ── Magic-menu state ───────────────────────────────────────────────
  const [showMagicMenu, setShowMagicMenu] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [replyLength, setReplyLength] = useState<ReplyLength>("medium");
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  /** Suppress the click that fires on pointer-up after a successful hold */
  const justOpenedMenuRef = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(() => {
    justOpenedMenuRef.current = false;
    setIsHolding(true);
    holdTimerRef.current = setTimeout(() => {
      setShowMagicMenu((prev) => !prev);
      holdTimerRef.current = null;
      setIsHolding(false);
      justOpenedMenuRef.current = true;
    }, HOLD_TO_MENU_MS);
  }, []);

  const onPointerUpOrLeave = useCallback(() => {
    setIsHolding(false);
    clearHoldTimer();
  }, [clearHoldTimer]);

  // Close magic menu when clicking outside
  useEffect(() => {
    if (!showMagicMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMagicMenu(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showMagicMenu]);

  // Clean up on unmount
  useEffect(() => clearHoldTimer, [clearHoldTimer]);

  // ── Build recent messages for AI (with correct sender tagging) ─────
  const getRecentForAI = useCallback(() => {
    return messages
      .filter((m) => !!m.decryptedText)
      .slice(-20)
      .map((m) => ({
        sender: m.sender,
        text: m.decryptedText!,
        isMe: m.slotId === slotId,
      }));
  }, [messages, slotId]);

  // ── Fire a magic-menu action ───────────────────────────────────────
  const handleMagicOption = useCallback(
    async (mode: string) => {
      if (isGenerating) return;

      const recent = getRecentForAI();
      if (recent.length === 0) return;

      setShowMagicMenu(false);
      setIsGenerating(true);
      try {
        const body: Record<string, unknown> = {
          recentMessages: recent,
          myName: screenName,
          mySlotId: slotId,
          mode,
          length: replyLength,
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
    },
    [
      isGenerating,
      getRecentForAI,
      screenName,
      slotId,
      messageText,
      handleTypingChange,
      replyLength,
    ],
  );

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
    <>
      <div className="flex-shrink-0 border-t border-white/10 bg-black/60 px-2 py-2 safe-area-inset-bottom">
        {/* Reply preview bar */}
        {replyingTo && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 text-sm">
            {replyingTo.imageUrl && (
              <img
                src={toProxyUrl(replyingTo.imageUrl)}
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
            style={{
              borderColor: chatTheme,
              opacity: !slotId || isSending ? 0.5 : 0.7,
            }}
            autoFocus
            type="text"
            placeholder={slotId ? "Message" : "Join to chat"}
            value={messageText}
            disabled={!slotId || isSending}
            onChange={(e) => handleTypingChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendAndRefocus();
            }}
            className={`flex-1 rounded-full border  bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none border-opacity-70 disabled:opacity-50`}
          />

          {/* Image picker button + popup menu */}
          <div className="relative">
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              disabled={!slotId || isSending}
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* Image menu popup */}
            {showImageMenu && (
              <div
                ref={imageMenuRef}
                className="absolute bottom-full right-0 mb-2 w-48 rounded-xl border border-white/15 bg-neutral-900/95 shadow-xl shadow-black/50 backdrop-blur-md overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowImageMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white/90 transition hover:bg-white/10"
                >
                  <span className="text-base leading-none">📁</span>
                  <span>Device Picker</span>
                </button>
                <div className="border-t border-white/10" />
                <button
                  type="button"
                  onClick={() => {
                    setShowImageMenu(false);
                    setShowGalleryPicker(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white/90 transition hover:bg-white/10"
                >
                  <span className="text-base leading-none">🖼️</span>
                  <span>Photo Library</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowImageMenu((prev) => !prev)}
              disabled={!slotId || isSending}
              className={`flex-shrink-0 rounded-full border border-${chatTheme}-400 p-2.5 text-white/85 transition ${slotId ? "cursor-pointer hover:bg-white/10" : "opacity-50"} disabled:opacity-50`}
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
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
          {/* Send / Magic button + popup menu */}
          <div className="relative">
            {/* Magic-menu popup (appears above the button) */}
            {showMagicMenu && (
              <div
                ref={menuRef}
                className="absolute bottom-full right-0 mb-2 w-52 rounded-xl border border-white/15 bg-neutral-900/95 shadow-xl shadow-black/50 backdrop-blur-md overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
              >
                {/* Header */}
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                    {messageText.trim()
                      ? "Rewrite with AI"
                      : "Generate with AI"}
                  </p>
                </div>

                {/* Length selector */}
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10">
                  {LENGTH_CHIPS.map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setReplyLength(chip.value)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition ${
                        replyLength === chip.value
                          ? "bg-purple-600 text-white"
                          : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Scrollable options list */}
                <div className="max-h-52 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                  {(messageText.trim()
                    ? REWRITE_OPTIONS
                    : GENERATE_OPTIONS
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleMagicOption(opt.mode)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-white/90 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      <span className="text-base leading-none">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                // Suppress the click that fires after the hold-menu opened
                if (justOpenedMenuRef.current) {
                  justOpenedMenuRef.current = false;
                  return;
                }
                if (!showMagicMenu) sendAndRefocus();
              }}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUpOrLeave}
              onPointerLeave={onPointerUpOrLeave}
              onContextMenu={(e) => e.preventDefault()}
              disabled={
                !slotId ||
                isSending ||
                isGenerating ||
                (!showMagicMenu && !messageText.trim())
              }
              className={`relative flex-shrink-0 rounded-full p-2.5 transition disabled:opacity-50 ${themeColors.btn} ${themeColors.text} hover:opacity-80`}
              title="Send (hold 5s for AI magic menu)"
            >
              {/* Hold-to-open ring animation */}
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
                    stroke="#a855f7"
                    strokeWidth="2.5"
                    strokeDasharray={`${2 * Math.PI * 18}`}
                    strokeDashoffset={`${2 * Math.PI * 18}`}
                    strokeLinecap="round"
                    style={{
                      animation: `magic-ring-fill ${HOLD_TO_MENU_MS}ms linear forwards`,
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
      </div>

      {/**div to h */}

      {/* In-app Photo Gallery Picker */}
      {showGalleryPicker && (
        <PhoneGalleryPicker
          onSelect={handleGallerySelect}
          onClose={() => setShowGalleryPicker(false)}
        />
      )}
    </>
  );
}
