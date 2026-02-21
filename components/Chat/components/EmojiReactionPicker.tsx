"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

// ── Text Reaction helpers ──────────────────────────────────────────
// Key format:  txt_RRGGBB_<encoded text>
// Firebase RTDB keys cannot contain . $ # [ ] /

const FB_UNSAFE = /[.\$#\[\]\/\%]/g;

function encodeForFirebaseKey(text: string): string {
  return text.replace(
    FB_UNSAFE,
    (ch) => "%" + ch.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase(),
  );
}

function decodeFromFirebaseKey(encoded: string): string {
  return encoded.replace(/%([0-9A-Fa-f]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

export function encodeTextReaction(text: string, hexColor: string): string {
  const color = hexColor.replace("#", "");
  return `txt_${color}_${encodeForFirebaseKey(text)}`;
}

export function decodeTextReaction(
  key: string,
): { text: string; color: string } | null {
  if (!key.startsWith("txt_") || key.length < 12) return null;
  const color = "#" + key.slice(4, 10);
  const text = decodeFromFirebaseKey(key.slice(11));
  return { color, text };
}

export function isTextReaction(key: string): boolean {
  return key.startsWith("txt_") && key.length >= 12;
}

const TEXT_REACTION_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ffffff", // white
];

const QUICK_EMOJIS = [
  "❤️",
  "💘",
  "😍",
  "🥰",
  "😘",
  "😂",
  "🤣",
  "😆",
  "😁",
  "😢",
  "🤦‍♂️",
  "🙆‍♂️",
  "🔥",
  "💯",
  "👍",
  "🖕",
  "💩",
];

// Full emoji grid organized by category
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "🤣",
      "😂",
      "🙂",
      "😊",
      "😇",
      "🥰",
      "😍",
      "🤩",
      "😘",
      "😗",
      "😚",
      "😙",
      "🥲",
      "😋",
      "😛",
      "😜",
      "🤪",
      "😝",
      "🤑",
      "🤗",
      "🤭",
      "🫢",
      "🫣",
      "🤫",
      "🤔",
      "🫡",
      "🤐",
      "🤨",
      "😐",
      "😑",
      "😶",
      "🫥",
      "😏",
      "😒",
      "🙄",
      "😬",
      "🤥",
      "😌",
      "😔",
      "😪",
      "🤤",
      "😴",
      "😷",
      "🤒",
      "🤕",
      "🤢",
      "🤮",
      "🥵",
      "🥶",
      "🥴",
      "😵",
      "🤯",
      "🤠",
      "🥳",
      "🥸",
      "😎",
      "🤓",
      "🧐",
    ],
  },
  {
    label: "Emotions",
    emojis: [
      "😟",
      "🙁",
      "☹️",
      "😮",
      "😯",
      "😲",
      "😳",
      "🥺",
      "🥹",
      "😦",
      "😧",
      "😨",
      "😰",
      "😥",
      "😢",
      "😭",
      "😱",
      "😖",
      "😣",
      "😞",
      "😓",
      "😩",
      "😫",
      "🥱",
      "😤",
      "😡",
      "😠",
      "🤬",
      "😈",
      "👿",
      "💀",
      "☠️",
      "🙊",
      "🙉",
      "🙈",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👍",
      "👎",
      "👊",
      "✊",
      "🤛",
      "🤜",
      "👏",
      "🙌",
      "🫶",
      "👐",
      "🤲",
      "🤝",
      "🙏",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👋",
      "🤚",
      "🖐️",
      "✋",
      "🖖",
      "👌",
      "🤌",
      "🤏",
      "✍️",
      "🫰",
      "💪",
      "🫵",
      "☝️",
      "👆",
    ],
  },
  {
    label: "Hearts",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💔",
      "❤️‍🔥",
      "❤️‍🩹",
      "❤️+🔥",
      "❤️+🩹",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "💟",
      "♥️",
      "🫀",
      "💋",
      "💯",
    ],
  },
  {
    label: "Things",
    emojis: [
      "🔥",
      "⭐",
      "🌟",
      "✨",
      "💫",
      "🎉",
      "🎊",
      "🎁",
      "🏆",
      "🥇",
      "🥈",
      "🥉",
      "🎯",
      "🎮",
      "🎵",
      "🎶",
      "💡",
      "📌",
      "🚀",
      "💎",
      "🍕",
      "🍔",
      "🍟",
      "☕",
      "🍺",
      "🍷",
      "🧁",
      "🎂",
      "🌹",
      "🌻",
      "🍀",
      "🌈",
    ],
  },
  {
    label: "People",
    emojis: [
      "🤦‍♂️",
      "🤦‍♀️",
      "🤦",
      "🙆‍♂️",
      "🙆‍♀️",
      "🤷‍♂️",
      "🤷‍♀️",
      "🤷",
      "🙅‍♂️",
      "🙅‍♀️",
      "🙋‍♂️",
      "🙋‍♀️",
      "🤙",
      "🤳",
      "💁‍♂️",
      "💁‍♀️",
      "🙇‍♂️",
      "🙇‍♀️",
      "🤴",
      "👸",
      "🧔",
      "👨‍💻",
      "👩‍💻",
      "🧑‍💻",
      "👨‍🍳",
      "🕵️‍♂️",
      "🦸‍♂️",
      "🦹‍♂️",
      "🧟‍♂️",
      "🧛‍♂️",
      "👻",
      "🤡",
      "💅",
      "🏃‍♂️",
      "🏃‍♀️",
      "🚶‍♂️",
      "🧎‍♂️",
      "🫠",
      "🫃",
      "🤰",
    ],
  },
  {
    label: "Animals",
    emojis: [
      "🐶",
      "🐱",
      "🐭",
      "🐹",
      "🐰",
      "🦊",
      "🐻",
      "🐼",
      "🐨",
      "🐯",
      "🦁",
      "🐮",
      "🐷",
      "🐸",
      "🐵",
      "🦄",
      "🐝",
      "🦋",
      "🐍",
      "🐢",
      "🐠",
      "🐬",
      "🦈",
      "🐙",
    ],
  },
  {
    label: "Reactions",
    emojis: [
      "❗",
      "❓",
      "‼️",
      "⁉️",
      "✅",
      "❌",
      "💤",
      "💢",
      "💬",
      "💭",
      "👀",
      "🫡",
      "🚩",
      "⚠️",
      "🚫",
      "💀",
      "☠️",
      "🤝",
      "🙏",
      "🫶",
    ],
  },
];

type EmojiReactionPickerProps = {
  messageId: string;
  isMine: boolean;
  currentReactions?: Record<string, { "1"?: boolean; "2"?: boolean }>;
  slotId: "1" | "2" | null;
  onReact: (messageId: string, emoji: string) => void;
};

export function EmojiReactionPicker({
  messageId,
  isMine,
  currentReactions,
  slotId,
  onReact,
}: EmojiReactionPickerProps) {
  const [showQuickBar, setShowQuickBar] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textReactionValue, setTextReactionValue] = useState("");
  const [textReactionColor, setTextReactionColor] = useState(
    TEXT_REACTION_COLORS[0],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);
  const quickBarRef = useRef<HTMLDivElement>(null);
  const fullPickerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const textPanelRef = useRef<HTMLDivElement>(null);

  // Nudge a popup element so it stays fully inside the viewport
  const clampToViewport = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    // Reset prior shifts
    el.style.transform = "";
    const rect = el.getBoundingClientRect();
    const pad = 8;
    // Find the chat header's bottom edge so we don't overlap it
    const header = document.querySelector(".safe-area-inset-top");
    const topBound = header ? header.getBoundingClientRect().bottom + pad : pad;
    let shiftX = 0;
    let shiftY = 0;
    // Horizontal clamping
    if (rect.left < pad) {
      shiftX = pad - rect.left;
    } else if (rect.right > window.innerWidth - pad) {
      shiftX = window.innerWidth - pad - rect.right;
    }
    // Vertical clamping — keep below the header
    if (rect.top < topBound) {
      shiftY = topBound - rect.top;
    }
    if (shiftX !== 0 || shiftY !== 0) {
      el.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
    }
  }, []);

  useLayoutEffect(() => {
    if (showQuickBar && !showFullPicker && !showTextInput) {
      clampToViewport(quickBarRef.current);
    }
  }, [showQuickBar, showFullPicker, showTextInput, clampToViewport]);

  useLayoutEffect(() => {
    if (showFullPicker) {
      clampToViewport(fullPickerRef.current);
    }
  }, [showFullPicker, clampToViewport]);

  useLayoutEffect(() => {
    if (showTextInput) {
      clampToViewport(textPanelRef.current);
      // Auto-focus the input
      setTimeout(() => textInputRef.current?.focus(), 50);
    }
  }, [showTextInput, clampToViewport]);

  // Close on click outside
  useEffect(() => {
    if (!showQuickBar && !showFullPicker && !showTextInput) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowQuickBar(false);
        setShowFullPicker(false);
        setShowTextInput(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showQuickBar, showFullPicker, showTextInput]);

  const handleEmojiClick = useCallback(
    (emoji: string) => {
      onReact(messageId, emoji);
      setShowQuickBar(false);
      setShowFullPicker(false);
    },
    [messageId, onReact],
  );

  const handleTextReactionSubmit = useCallback(() => {
    const trimmed = textReactionValue.trim();
    if (!trimmed) return;
    const key = encodeTextReaction(trimmed, textReactionColor);
    onReact(messageId, key);
    setTextReactionValue("");
    setShowTextInput(false);
    setShowQuickBar(false);
  }, [textReactionValue, textReactionColor, messageId, onReact]);

  const handleTriggerClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (showFullPicker || showTextInput) {
        setShowFullPicker(false);
        setShowTextInput(false);
        setShowQuickBar(false);
      } else {
        setShowQuickBar((prev) => !prev);
      }
    },
    [showFullPicker, showTextInput],
  );

  // Check if current user already reacted with an emoji
  const hasReacted = useCallback(
    (emoji: string) => {
      if (!slotId || !currentReactions) return false;
      return !!currentReactions[emoji]?.[slotId];
    },
    [slotId, currentReactions],
  );

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {/* Smiley trigger button - inside bottom corner */}
      <button
        ref={triggerBtnRef}
        type="button"
        onClick={handleTriggerClick}
        className={`pointer-events-auto absolute bottom-1.5 opacity-0 group-hover:opacity-100 transition-all duration-150 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 text-neutral-400/50 hover:text-neutral-300 hover:scale-110 ${
          isMine ? "left-1.5" : "right-1.5"
        } ${showQuickBar || showFullPicker || showTextInput ? "!opacity-100 text-neutral-300" : ""}`}
        title="React"
      >
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line
            x1="9"
            y1="9"
            x2="9.01"
            y2="9"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <line
            x1="15"
            y1="9"
            x2="15.01"
            y2="9"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Quick reaction bar */}
      {showQuickBar && !showFullPicker && !showTextInput && (
        <div
          ref={quickBarRef}
          className={`pointer-events-auto absolute z-50 bottom-8 w-72 flex flex-wrap items-center gap-2 rounded-3xl bg-neutral-900/95 backdrop-blur-md border border-white/10 px-1.5 py-1 shadow-lg shadow-black/40 ${
            isMine ? "left-0" : "right-0"
          }`}
          style={{ whiteSpace: "nowrap" }}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEmojiClick(emoji);
              }}
              className={`emoji w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 hover:scale-125 transition-all duration-150 text-base ${
                hasReacted(emoji) ? "bg-white/15 scale-110" : ""
              }`}
            >
              {emoji}
            </button>
          ))}
          {/* T button to open text reaction input */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowTextInput(true);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/15 transition-all text-neutral-400 hover:text-white border border-white/10 ml-0.5"
            title="Text reaction"
          >
            <span
              className="text-xs font-bold leading-none"
              style={{ fontFamily: "serif" }}
            >
              T
            </span>
          </button>
          {/* Plus button to open full picker */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowFullPicker(true);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/15 transition-all text-neutral-400 hover:text-white border border-white/10 ml-0.5"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      )}

      {/* Text reaction input panel */}
      {showTextInput && (
        <div
          ref={textPanelRef}
          className={`pointer-events-auto absolute z-50 bottom-8 w-64 rounded-xl bg-neutral-900/95 backdrop-blur-md border border-white/10 shadow-xl shadow-black/50 ${
            isMine ? "left-0" : "right-0"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTextInput(false);
              }}
              className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
            <span className="text-xs text-neutral-500">Text Reaction</span>
          </div>

          <div className="p-3 flex flex-col gap-3">
            {/* Text input */}
            <input
              ref={textInputRef}
              type="text"
              maxLength={20}
              value={textReactionValue}
              onChange={(e) => setTextReactionValue(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") handleTextReactionSubmit();
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Type something…"
              className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-white/25 transition-colors"
            />

            {/* Color picker row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {TEXT_REACTION_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTextReactionColor(color);
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                    textReactionColor === color
                      ? "border-white scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Preview + Send */}
            <div className="flex items-center justify-between">
              {/* Live preview pill */}
              <div className="flex items-center gap-2">
                {textReactionValue.trim() && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      backgroundColor: textReactionColor + "30",
                      color: textReactionColor,
                      border: `1px solid ${textReactionColor}50`,
                    }}
                  >
                    {textReactionValue.trim()}
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={!textReactionValue.trim()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTextReactionSubmit();
                }}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full emoji picker */}
      {showFullPicker && (
        <div
          ref={fullPickerRef}
          className={`pointer-events-auto absolute z-50 bottom-8 w-72 max-h-64 overflow-y-auto rounded-xl bg-neutral-900/95 backdrop-blur-md border border-white/10 shadow-xl shadow-black/50 ${
            isMine ? "left-0" : "right-0"
          }`}
        >
          {/* Back to quick bar */}
          <div className="sticky top-0 z-10 bg-neutral-900/95 backdrop-blur-md border-b border-white/10 px-3 py-2 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFullPicker(false);
              }}
              className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
            <span className="text-xs text-neutral-500">All Emojis</span>
          </div>

          <div className="p-2">
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.label} className="mb-2">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1 px-1">
                  {cat.label}
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {cat.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEmojiClick(emoji);
                      }}
                      className={`emoji w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 hover:scale-110 transition-all text-base ${
                        hasReacted(emoji) ? "bg-white/15" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EmojiReactionsDisplay({
  reactions,
  slotId,
  onReact,
  messageId,
}: {
  reactions: Record<string, { "1"?: boolean; "2"?: boolean }>;
  slotId: "1" | "2" | null;
  onReact: (messageId: string, emoji: string) => void;
  messageId: string;
}) {
  // Collect all reactions with counts
  const reactionEntries = Object.entries(reactions)
    .map(([key, users]) => {
      const count = (users["1"] ? 1 : 0) + (users["2"] ? 1 : 0);
      const iReacted = slotId ? !!users[slotId] : false;
      const textData = isTextReaction(key) ? decodeTextReaction(key) : null;
      return { key, count, iReacted, textData };
    })
    .filter((r) => r.count > 0);

  if (reactionEntries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1 max-w-[85vw] sm:max-w-[75vw] min-w-0">
      {reactionEntries.map(({ key, count, iReacted, textData }) => {
        // ── Text reaction pill ──
        if (textData) {
          return (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReact(messageId, key);
              }}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-150 hover:scale-105 border ${
                iReacted ? "ring-1 ring-white/40" : ""
              }`}
              style={{
                backgroundColor: textData.color + "30",
                color: textData.color,
                borderColor: textData.color + "50",
              }}
            >
              <span className="leading-none">{textData.text}</span>
              {count > 1 && (
                <span className="text-[10px] leading-none opacity-80">
                  {count}
                </span>
              )}
            </button>
          );
        }

        // ── Emoji reaction (original) ──
        return (
          <button
            key={key}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReact(messageId, key);
            }}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all duration-150 hover:scale-105 ${
              iReacted
                ? "bg-blue-500/25 border border-blue-400/40 text-white"
                : "bg-white/8 border border-white/10 text-neutral-300 hover:bg-white/15"
            }`}
          >
            <span className="emoji text-sm leading-none">{key}</span>
            {count > 1 && (
              <span className="text-[10px] leading-none opacity-80">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
