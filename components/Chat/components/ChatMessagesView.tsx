"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MESSAGES_PER_PAGE } from "../constants";
import type {
  Message,
  ThemeColors,
  ChatTheme,
  RecordedDrawingStroke,
} from "../types";
import { EphemeralVideoPlayer } from "./EphemeralVideoPlayer";
import { EphemeralPhotoViewer } from "./EphemeralPhotoViewer";
import { CloudPoofAnimation } from "./CloudPoofAnimation";
import {
  EmojiReactionPicker,
  EmojiReactionsDisplay,
} from "./EmojiReactionPicker";
import Image from "next/image";
import ReplyIcon from "@/components/sub/ReplyIcon";
import { toProxyUrl } from "@/lib/appwriteProxy";
import { DrawingPlayer } from "./DrawingPlayer";
import EmojiText from "@/components/ui/EmojiText";
import { BubbleAnnotationDisplay } from "./BubbleAnnotationDisplay";
import { BubbleAnnotationEditor } from "./BubbleAnnotationEditor";
import type { BubbleAnnotations } from "../types";

/** Returns true when the string contains ONLY emoji (and optional whitespace). */
/** Returns true when the string contains ONLY emoji (and optional whitespace). */
const emojiSegmentRe = new RegExp(
  "^(?:\\p{Emoji_Presentation}|\\p{Emoji}\\uFE0F)(?:\\u200D(?:\\p{Emoji_Presentation}|\\p{Emoji}\\uFE0F))*$",
  "u",
);
const _emojiOnlyCache = new Map<string, boolean>();
const _sharedSegmenter: Intl.Segmenter | null =
  typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter("en", { granularity: "grapheme" })
    : null;

function isEmojiOnly(text: string): boolean {
  const cached = _emojiOnlyCache.get(text);
  if (cached !== undefined) return cached;
  const result = _isEmojiOnlyImpl(text);
  if (_emojiOnlyCache.size > 500) _emojiOnlyCache.clear();
  _emojiOnlyCache.set(text, result);
  return result;
}

function _isEmojiOnlyImpl(text: string): boolean {
  const stripped = text.replace(/\s/g, "");
  if (!stripped) return false;
  // Use Intl.Segmenter to split into grapheme clusters, then check each one.
  if (_sharedSegmenter) {
    for (const { segment } of _sharedSegmenter.segment(stripped)) {
      if (!emojiSegmentRe.test(segment)) return false;
    }
    return true;
  }
  // Fallback: use codepoint iteration to strip known emoji ranges
  const codepoints = Array.from(stripped);
  const remaining = codepoints.filter((ch) => {
    const cp = ch.codePointAt(0)!;
    // Common emoji blocks
    if (cp >= 0x1f600 && cp <= 0x1f64f) return false; // Emoticons
    if (cp >= 0x1f300 && cp <= 0x1f5ff) return false; // Misc Symbols & Pictographs
    if (cp >= 0x1f680 && cp <= 0x1f6ff) return false; // Transport & Map
    if (cp >= 0x1f900 && cp <= 0x1f9ff) return false; // Supplemental Symbols
    if (cp >= 0x1fa00 && cp <= 0x1fa6f) return false; // Chess Symbols
    if (cp >= 0x1fa70 && cp <= 0x1faff) return false; // Symbols Extended-A
    if (cp >= 0x2600 && cp <= 0x26ff) return false; // Misc Symbols
    if (cp >= 0x2700 && cp <= 0x27bf) return false; // Dingbats
    if (cp >= 0xfe00 && cp <= 0xfe0f) return false; // Variation Selectors
    if (cp === 0x200d) return false; // ZWJ
    if (cp === 0x20e3) return false; // Combining Enclosing Keycap
    if (cp >= 0xe0020 && cp <= 0xe007f) return false; // Tags
    if (cp >= 0x1f1e0 && cp <= 0x1f1ff) return false; // Regional Indicators (flags)
    return true;
  });
  return remaining.length === 0;
}

// Simple seeded PRNG (mulberry32) for deterministic emoji placement per message
function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}

/** Canvas-based bg emoji overlay — renders all emojis to a single <canvas> instead of N DOM nodes */
const BgEmojiOverlay = React.memo(function BgEmojiOverlay({
  messageId,
  emojis,
  density,
}: {
  messageId: string;
  emojis: string[];
  density: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const w = parent.offsetWidth;
    const h = parent.offsetHeight;
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 0.6;

    const rand = seededRandom(hashString(messageId));
    for (let i = 0; i < density; i++) {
      const emoji = emojis[Math.floor(rand() * emojis.length)];
      const top = rand() * h;
      const left = rand() * w;
      const size = 10 + rand() * 18;
      const rotation = rand() * 360;

      ctx.save();
      ctx.translate(left, top);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.font = `${size}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, 0, 0);
      ctx.restore();
    }
  }, [messageId, emojis, density]);

  return (
    <EmojiText>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
        style={{ zIndex: 0 }}
      />
    </EmojiText>
  );
});

// ── Memoized per-message component ─────────────────────────────────
type MessageBubbleProps = {
  msg: Message;
  isMine: boolean;
  slotId: "1" | "2" | null;
  themeColors: ThemeColors;
  chatTheme: ChatTheme;
  gradientColors: string[];
  privacyMode: boolean;
  isLockedOut: boolean;
  isHighlighted: boolean;
  isPrivacyHovered: boolean;
  isCopied: boolean;
  isLongPressed: boolean;
  isPoofing: boolean;
  setPrivacyHoveredMsgId: React.Dispatch<React.SetStateAction<string | null>>;
  setCopiedMsgId: React.Dispatch<React.SetStateAction<string | null>>;
  setLongPressedMsgId: React.Dispatch<React.SetStateAction<string | null>>;
  setDeleteConfirmMsg: React.Dispatch<
    React.SetStateAction<{
      id: string;
      imageFileId?: string;
      videoFileId?: string;
    } | null>
  >;
  setActiveEphemeralVideo: React.Dispatch<
    React.SetStateAction<{
      messageId: string;
      videoUrl: string;
      sender: string;
      videoFileId?: string;
      isMine: boolean;
    } | null>
  >;
  setActiveEphemeralPhoto: React.Dispatch<
    React.SetStateAction<{
      messageId: string;
      imageUrl: string;
      sender: string;
      imageFileId?: string;
      duration: number;
      caption?: string;
      isMine: boolean;
    } | null>
  >;
  setActiveDrawing: React.Dispatch<
    React.SetStateAction<{
      strokes: RecordedDrawingStroke[];
      duration: number;
    } | null>
  >;
  handleSwipeStart: (
    e: React.TouchEvent<HTMLDivElement>,
    msg: Message,
    isMine: boolean,
  ) => void;
  handleLongPressStart: (msgId: string, isMine: boolean) => void;
  handleLongPressEnd: () => void;
  setReplyingTo: (msg: Message | null) => void;
  scrollToMessage: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onColorChange?: (messageId: string, color: string | null) => void;
  onBgEmojisChange?: (
    messageId: string,
    data: { emojis: string[]; density: number } | null,
  ) => void;
  onAnnotate?: (messageId: string) => void;
  slotNames: Record<string, string>;
  formatTimestamp: (createdAt?: number | object) => string;
};

const MessageBubble = React.memo(
  function MessageBubble({
    msg,
    isMine,
    slotId,
    themeColors,
    chatTheme,
    gradientColors,
    privacyMode,
    isLockedOut,
    isHighlighted,
    isPrivacyHovered,
    isCopied,
    isLongPressed,
    isPoofing,
    setPrivacyHoveredMsgId,
    setCopiedMsgId,
    setLongPressedMsgId,
    setDeleteConfirmMsg,
    setActiveEphemeralVideo,
    setActiveEphemeralPhoto,
    setActiveDrawing,
    handleSwipeStart,
    handleLongPressStart,
    handleLongPressEnd,
    setReplyingTo,
    scrollToMessage,
    onReact,
    onColorChange,
    onBgEmojisChange,
    onAnnotate,
    slotNames,
    formatTimestamp,
  }: MessageBubbleProps) {
    const timestamp = formatTimestamp(msg.createdAt);

    return (
      <EmojiText>
        <div
          data-msg-id={msg.id}
          className={`group flex ${isMine ? "justify-end" : "justify-start"} relative transition-colors duration-700 rounded-2xl ${
            isHighlighted ? "bg-white/10" : ""
          }`}
          onMouseEnter={() => privacyMode && setPrivacyHoveredMsgId(msg.id)}
          onMouseLeave={() => privacyMode && setPrivacyHoveredMsgId(null)}
        >
          <div
            className={`relative flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[75%]`}
          >
            {/* Cloud Poof Animation — sibling to bubble so opacity-0 doesn't hide it */}
            {isPoofing && (
              <div className="absolute inset-0 z-20 overflow-visible flex items-center justify-center pointer-events-none">
                <CloudPoofAnimation onComplete={() => {}} />
              </div>
            )}
            <div
              className={`relative w-full rounded-2xl px-3 py-2 text-sm shadow-md select-none transition-all duration-300 ${
                isPoofing ? "opacity-0 scale-75" : ""
              } ${privacyMode && !isPrivacyHovered ? "opacity-0" : ""} ${
                isMine
                  ? `${
                      chatTheme === "gradient" && !msg.bgColor
                        ? ""
                        : msg.bgColor
                          ? ""
                          : themeColors.bg
                    } ${themeColors.text} rounded-br-none`
                  : `${msg.bgColor ? "" : "bg-white/10"} text-white rounded-bl-none`
              }`}
              style={
                msg.bgColor
                  ? { background: msg.bgColor }
                  : isMine &&
                      chatTheme === "gradient" &&
                      gradientColors.length >= 2
                    ? {
                        background: `linear-gradient(to bottom, ${gradientColors.join(", ")})`,
                        backgroundAttachment: "fixed",
                        backgroundSize: "100% 100vh",
                      }
                    : undefined
              }
              onTouchStart={(e) => {
                handleSwipeStart(e, msg, isMine);
                handleLongPressStart(msg.id, isMine);
              }}
              onTouchEnd={handleLongPressEnd}
              onTouchMove={handleLongPressEnd}
              onMouseDown={() => handleLongPressStart(msg.id, isMine)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
            >
              {/* Bg emoji overlay */}
              {msg.bgEmojis && msg.bgEmojis.emojis.length > 0 && (
                <BgEmojiOverlay
                  messageId={msg.id}
                  emojis={msg.bgEmojis.emojis}
                  density={msg.bgEmojis.density}
                />
              )}
              {/* Annotation overlay (drawing + text on bubble) */}
              {msg.annotations &&
              (msg.annotations.strokes?.length ||
                msg.annotations.textBoxes?.length) ? (
                <BubbleAnnotationDisplay annotations={msg.annotations} />
              ) : null}
              {/* Delete button (long-press) */}
              {isMine && isLongPressed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmMsg({
                      id: msg.id,
                      imageFileId: msg.imageFileId,
                      videoFileId: msg.videoFileId,
                    });
                    setLongPressedMsgId(null);
                  }}
                  className={`absolute z-30 top-1/2 -translate-y-1/2 ${
                    isMine ? "-left-10" : "-right-10"
                  } w-8 h-8 flex items-center justify-center rounded-full bg-red-500/90 hover:bg-red-600 shadow-lg transition-all animate-in fade-in zoom-in duration-200`}
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
              {/* Reply button on hover (desktop) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReplyingTo(msg);
                }}
                className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 w-7 h-7 rounded-full hover:bg-white/10 ${
                  isMine ? "-left-8" : "-right-8"
                }`}
              >
                <span
                  className="text-xs text-neutral-400"
                  style={{
                    transform: isMine ? "scaleX(-1)" : "none",
                    display: "inline-block",
                  }}
                >
                  <ReplyIcon size={14} />
                </span>
              </button>
              {/* Emoji reaction picker on hover (desktop) */}
              <EmojiReactionPicker
                messageId={msg.id}
                isMine={isMine}
                currentReactions={msg.reactions}
                slotId={slotId}
                onReact={onReact}
                currentBgColor={msg.bgColor}
                onColorChange={onColorChange}
                currentBgEmojis={msg.bgEmojis}
                onBgEmojisChange={onBgEmojisChange}
                onAnnotate={onAnnotate}
                slotNames={slotNames}
                annotations={msg.annotations}
                messageSender={msg.sender}
              />
              {/* All message content above the bg emoji overlay */}
              <div className="relative" style={{ zIndex: 1 }}>
                {/* Reply preview if this is a reply */}
                {(msg.replyToText || msg.replyToImageUrl) && !isLockedOut && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (msg.replyToId) scrollToMessage(msg.replyToId);
                    }}
                    className={`mb-2 rounded-lg pl-3 pr-2.5 py-1.5 text-[11px] text-left w-full cursor-pointer active:opacity-70 transition-opacity ${
                      isMine
                        ? "bg-black/10 border-black/40"
                        : "bg-white/5 border-white/20"
                    }`}
                    style={{
                      boxShadow:
                        "inset 0 3px 5px rgba(0, 0, 0, 0.4), inset 0 -3px 5px rgba(0, 0, 0, 0.4), inset 3px 0 5px rgba(0, 0, 0, 0.25), inset -3px 0 5px rgba(0, 0, 0, 0.25)",
                    }}
                  >
                    <p className="font-semibold opacity-80">
                      {msg.replyToSender}
                    </p>
                    {msg.replyToImageUrl && (
                      <img
                        src={toProxyUrl(msg.replyToImageUrl)}
                        alt="Reply"
                        className="mt-1 mb-1 w-12 h-12 rounded object-cover border border-white/10"
                      />
                    )}
                    {msg.replyToText && (
                      <p className="truncate opacity-60 max-w-[200px]">
                        {msg.replyToText}
                      </p>
                    )}
                  </button>
                )}
                <p className="text-[11px] uppercase tracking-wide opacity-70 flex items-center justify-between gap-2">
                  <span>
                    {isLockedOut ? "???" : msg.sender}
                    {!isLockedOut && msg.decryptionFailed && (
                      <span className="ml-2 text-amber-400">
                        ⚠️ unencrypted
                      </span>
                    )}
                  </span>
                  {(msg.decryptedText ||
                    msg.imageUrl ||
                    msg.videoUrl ||
                    msg.drawingData) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const textToCopy = msg.decryptedText || "";
                        if (textToCopy) {
                          navigator.clipboard.writeText(textToCopy);
                          setCopiedMsgId(msg.id);
                          setTimeout(() => setCopiedMsgId(null), 2000);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center"
                      title="Copy message text"
                      disabled={!msg.decryptedText}
                    >
                      {isCopied ? (
                        <svg
                          className="w-3.5 h-3.5 text-emerald-400 animate-in scale-in duration-200"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      ) : (
                        <svg
                          className="w-3.5 h-3.5 text-neutral-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>
                  )}
                </p>
                {msg.decryptedText && (
                  <p
                    className={`mt-1 whitespace-pre-line break-words ${isLockedOut ? "select-none" : ""} ${
                      !isLockedOut && isEmojiOnly(msg.decryptedText)
                        ? "emoji text-4xl leading-snug"
                        : ""
                    }`}
                  >
                    {isLockedOut
                      ? msg.text || "\u2022\u2022\u2022\u2022\u2022\u2022"
                      : msg.decryptedText}
                  </p>
                )}
                {msg.imageUrl &&
                  !msg.isEphemeral &&
                  (isLockedOut ? (
                    <div className="mt-2 w-full h-40 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-neutral-500 text-sm">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      Join to view
                    </div>
                  ) : (
                    <Image
                      src={toProxyUrl(msg.imageUrl)}
                      alt="Uploaded"
                      width={500}
                      height={320}
                      className="mt-2 w-full rounded-xl border border-white/10"
                    />
                  ))}
                {/* Drawing message - tap to play fullscreen */}
                {msg.drawingData &&
                  msg.drawingData.length > 0 &&
                  !isLockedOut && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDrawing({
                          strokes: msg.drawingData!,
                          duration: msg.drawingDuration || 3000,
                        });
                      }}
                      className="mt-2 w-full rounded-xl border border-white/10 overflow-hidden aspect-video relative bg-black/60 group/draw"
                    >
                      {/* Static thumbnail showing all strokes */}
                      <svg
                        className="w-full h-full absolute inset-0"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        {msg.drawingData.map((s, idx) => {
                          if (s.points.length < 2) return null;
                          let path = `M ${s.points[0].x} ${s.points[0].y}`;
                          for (let i = 1; i < s.points.length - 1; i++) {
                            const curr = s.points[i];
                            const next = s.points[i + 1];
                            path += ` Q ${curr.x} ${curr.y} ${(curr.x + next.x) / 2} ${(curr.y + next.y) / 2}`;
                          }
                          const last = s.points[s.points.length - 1];
                          path += ` L ${last.x} ${last.y}`;
                          return (
                            <path
                              key={idx}
                              d={path}
                              stroke={s.color}
                              strokeWidth="0.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                              opacity={0.7}
                            />
                          );
                        })}
                      </svg>
                      {/* Play icon */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/draw:bg-black/10 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-white ml-0.5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  )}
                {msg.videoUrl && !msg.isEphemeral && !isLockedOut && (
                  <video
                    src={toProxyUrl(msg.videoUrl)}
                    controls
                    className="mt-2 w-full rounded-xl border border-white/10"
                  />
                )}
                {/* Ephemeral video - show icon button instead of inline video */}
                {msg.videoUrl &&
                  msg.isEphemeral &&
                  !isLockedOut &&
                  (isMine || !msg.disappearedFor?.[slotId ?? "1"]) && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveEphemeralVideo({
                          messageId: msg.id,
                          videoUrl: toProxyUrl(msg.videoUrl)!,
                          sender: msg.sender,
                          videoFileId: msg.videoFileId,
                          isMine,
                        })
                      }
                      className="mt-2 w-full flex items-center justify-center gap-2 py-6 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-orange-600/20 hover:from-amber-500/30 hover:to-orange-600/30 transition-all duration-300 group"
                    >
                      <div className="relative">
                        {/* Play icon */}
                        <svg
                          className="w-10 h-10 text-amber-400 group-hover:scale-110 transition-transform"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        {/* Ephemeral indicator */}
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-amber-300 text-sm font-medium">
                          Ephemeral Video
                        </span>
                        <span className="text-amber-400/60 text-[10px]">
                          {isMine
                            ? "Tap to view • Disappears when they watch"
                            : "Tap to view • Disappears after watching"}
                        </span>
                      </div>
                    </button>
                  )}

                {/* Ephemeral photo - show icon button instead of inline image */}
                {msg.imageUrl &&
                  msg.isEphemeral &&
                  !isLockedOut &&
                  (isMine || !msg.disappearedFor?.[slotId ?? "1"]) && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveEphemeralPhoto({
                          messageId: msg.id,
                          imageUrl: toProxyUrl(msg.imageUrl)!,
                          sender: msg.sender,
                          imageFileId: msg.imageFileId,
                          duration: msg.ephemeralDuration ?? 3,
                          caption: msg.text || undefined,
                          isMine,
                        })
                      }
                      className="mt-2 w-full flex items-center justify-center gap-2 py-6 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-orange-600/20 hover:from-amber-500/30 hover:to-orange-600/30 transition-all duration-300 group"
                    >
                      <div className="relative">
                        <svg
                          className="w-10 h-10 text-amber-400 group-hover:scale-110 transition-transform"
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
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-amber-300 text-sm font-medium">
                          Ephemeral Photo
                        </span>
                        <span className="text-amber-400/60 text-[10px]">
                          {isMine
                            ? `Tap to view • ${msg.ephemeralDuration ?? 3}s • Disappears when they view`
                            : `Tap to view • ${msg.ephemeralDuration ?? 3}s • Disappears after viewing`}
                        </span>
                      </div>
                    </button>
                  )}

                {/* Ephemeral media expired — ghost indicator */}
                {msg.ephemeralExpired && (
                  <div className="mt-2 flex items-center justify-center gap-1.5 py-1 px-3 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400/70 text-[11px]">
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    {msg.ephemeralExpired === "video"
                      ? "Expired ephemeral video"
                      : "Expired ephemeral photo"}
                  </div>
                )}
                {timestamp && (
                  <div
                    className={`mt-1 flex items-center gap-1 ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span
                      className={`text-[9px] ${
                        isMine ? themeColors.accent : "text-neutral-400"
                      }`}
                    >
                      {timestamp}
                    </span>
                    {/* Read receipt checkmarks */}
                    {isMine && msg.readBy?.[slotId === "1" ? "2" : "1"] && (
                      <span className={`text-[9px] ${themeColors.accent}`}>
                        ✓
                        {/* Second checkmark - shows when they've seen that you saw it */}
                        {msg.seenReceiptBy?.[slotId === "1" ? "2" : "1"] && "✓"}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {/* end content wrapper above bg emoji overlay */}
            </div>
            {/* Emoji reactions display below bubble */}
            {msg.reactions && !isLockedOut && (
              <div
                className={`w-full ${isMine ? "flex justify-end" : "flex justify-start"} ${
                  privacyMode && !isPrivacyHovered ? "opacity-0" : ""
                } transition-opacity`}
              >
                <EmojiReactionsDisplay
                  reactions={msg.reactions}
                  slotId={slotId}
                  onReact={onReact}
                  messageId={msg.id}
                />
              </div>
            )}
          </div>
        </div>
      </EmojiText>
    );
  },
  (prev, next) => {
    // Custom equality — only re-render when message-specific data changes.
    // Callback props are stable (useState setters + useCallback) so we skip them.
    return (
      prev.msg === next.msg &&
      prev.isHighlighted === next.isHighlighted &&
      prev.isPrivacyHovered === next.isPrivacyHovered &&
      prev.isCopied === next.isCopied &&
      prev.isLongPressed === next.isLongPressed &&
      prev.isPoofing === next.isPoofing &&
      prev.isMine === next.isMine &&
      prev.slotId === next.slotId &&
      prev.themeColors === next.themeColors &&
      prev.chatTheme === next.chatTheme &&
      prev.gradientColors === next.gradientColors &&
      prev.privacyMode === next.privacyMode &&
      prev.isLockedOut === next.isLockedOut
    );
  },
);

type ChatMessagesViewProps = {
  messages: Message[];
  slotId: "1" | "2" | null;
  themeColors: ThemeColors;
  chatTheme: ChatTheme;
  gradientColors: string[];
  isOtherTyping: boolean;
  formatTimestamp: (createdAt?: number | object) => string;
  setReplyingTo: (msg: Message | null) => void;
  markMessageAsRead: (msg: Message) => void;
  markReceiptAsSeen: (msg: Message) => void;
  onMarkEphemeralViewed: (messageId: string) => void;
  onDeleteEphemeralMessage: (
    messageId: string,
    videoFileId?: string,
    imageFileId?: string,
  ) => Promise<void> | void;
  onDeleteMessage: (
    messageId: string,
    imageFileId?: string,
    videoFileId?: string,
  ) => void;
  onReact: (messageId: string, emoji: string) => void;
  onColorChange?: (messageId: string, color: string | null) => void;
  onBgEmojisChange?: (
    messageId: string,
    data: { emojis: string[]; density: number } | null,
  ) => void;
  onAnnotationsChange?: (
    messageId: string,
    data: BubbleAnnotations | null,
  ) => void;
  scrollToMessageId?: string | null;
  /** Are there older messages on the server that haven't been fetched yet? */
  hasMoreOnServer?: boolean;
  /** Fetch the next page of older messages from Firebase */
  loadOlderFromServer?: () => Promise<void>;
  /** Is a server-side page currently being fetched? */
  isLoadingOlder?: boolean;
  /** Show privacy mode - messages hidden until hovered */
  privacyMode?: boolean;
  /** Room is full and user doesn't hold a spot — restrict visible content */
  isLockedOut?: boolean;
};

export function ChatMessagesView({
  messages,
  slotId,
  themeColors,
  chatTheme,
  gradientColors,
  isOtherTyping,
  formatTimestamp,
  setReplyingTo,
  markMessageAsRead,
  markReceiptAsSeen,
  onMarkEphemeralViewed,
  onDeleteEphemeralMessage,
  onDeleteMessage,
  onReact,
  onColorChange,
  onBgEmojisChange,
  onAnnotationsChange,
  scrollToMessageId,
  hasMoreOnServer = false,
  loadOlderFromServer,
  isLoadingOlder = false,
  privacyMode = false,
  isLockedOut = false,
}: ChatMessagesViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [privacyHoveredMsgId, setPrivacyHoveredMsgId] = useState<string | null>(
    null,
  );
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [annotatingMsgId, setAnnotatingMsgId] = useState<string | null>(null);
  const isNearBottomRef = useRef(true);

  // Derive slot→name mapping from messages
  const slotNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.slotId && m.sender && !names[m.slotId]) {
        names[m.slotId] = m.sender;
      }
      if (names["1"] && names["2"]) break;
    }
    return names;
  }, [messages]);
  const isLoadingRef = useRef(false);
  const lastManualScrollTimeRef = useRef(0);
  const anchorRef = useRef<{ msgId: string; offsetFromTop: number } | null>(
    null,
  );

  // Window position: index of the first visible message
  const [winStart, setWinStart] = useState(
    Math.max(0, messages.length - MESSAGES_PER_PAGE),
  );

  // Track previous message count AND first message ID to distinguish
  // "new messages at end" from "older messages prepended from server".
  const prevMsgLenRef = useRef(messages.length);
  const prevFirstIdRef = useRef<string | null>(
    messages.length > 0 ? messages[0].id : null,
  );

  useEffect(() => {
    const grew = messages.length > prevMsgLenRef.current;
    const wasEmpty = prevMsgLenRef.current === 0;
    const newFirstId = messages.length > 0 ? messages[0].id : null;
    const firstIdChanged = newFirstId !== prevFirstIdRef.current;

    if (grew && firstIdChanged && prevFirstIdRef.current) {
      // Older messages were prepended (server-loaded page) — shift winStart
      // so the user keeps seeing the same messages.
      const shift = messages.length - prevMsgLenRef.current;
      setWinStart((prev) => prev + shift);
    } else if (grew && isNearBottomRef.current) {
      // New messages at the end AND user is near the bottom — pin to newest.
      // If the user is scrolled far up, leave them where they are.
      setWinStart(Math.max(0, messages.length - MESSAGES_PER_PAGE));
    }

    // When messages first arrive (0 → N), force scroll to bottom after render
    if (wasEmpty && messages.length > 0) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "instant",
          block: "end",
        });
        lastManualScrollTimeRef.current = 0;
      });
    }

    prevMsgLenRef.current = messages.length;
    prevFirstIdRef.current = newFirstId;
  }, [messages]);

  // How many messages to shift when loading older / newer (half-page keeps overlap)
  const LOAD_CHUNK = Math.floor(MESSAGES_PER_PAGE / 2);

  // Compute the visible 50-message slice
  const windowStart = Math.max(
    0,
    Math.min(winStart, messages.length - MESSAGES_PER_PAGE),
  );
  const windowEnd = Math.min(messages.length, windowStart + MESSAGES_PER_PAGE);
  const visibleMessages = useMemo(
    () => messages.slice(windowStart, windowEnd),
    [messages, windowStart, windowEnd],
  );
  const hasOlder = windowStart > 0;
  const hasNewer = windowEnd < messages.length;

  // After React renders the new window, restore scroll so the anchor message
  // stays at the same visual position it was before. Works for both directions.
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const anchor = anchorRef.current;
    if (!container || !anchor) return;

    const el = container.querySelector(
      `[data-msg-id="${anchor.msgId}"]`,
    ) as HTMLElement | null;
    if (el) {
      const currentOffset =
        el.getBoundingClientRect().top - container.getBoundingClientRect().top;
      container.scrollTop += currentOffset - anchor.offsetFromTop;
    }

    anchorRef.current = null;
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 400);
  }, [windowStart]);

  const scrollToMessage = useCallback(
    (messageId: string) => {
      const el = scrollContainerRef.current?.querySelector(
        `[data-msg-id="${messageId}"]`,
      ) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedMsgId(messageId);
        setTimeout(() => setHighlightedMsgId(null), 1500);
      } else {
        // Message might be outside the visible window — find its index and jump there
        const idx = messages.findIndex((m) => m.id === messageId);
        if (idx !== -1) {
          // Center the window around the target message
          const newStart = Math.max(
            0,
            Math.min(
              idx - Math.floor(MESSAGES_PER_PAGE / 2),
              messages.length - MESSAGES_PER_PAGE,
            ),
          );
          setWinStart(newStart);
          setTimeout(() => {
            const retryEl = scrollContainerRef.current?.querySelector(
              `[data-msg-id="${messageId}"]`,
            ) as HTMLElement | null;
            if (retryEl) {
              retryEl.scrollIntoView({ behavior: "smooth", block: "center" });
              setHighlightedMsgId(messageId);
              setTimeout(() => setHighlightedMsgId(null), 1500);
            }
          }, 100);
        }
      }
    },
    [messages],
  );

  // Stable ref so MessageBubble never re-renders due to scrollToMessage identity
  const scrollToMessageRef = useRef(scrollToMessage);
  scrollToMessageRef.current = scrollToMessage;
  const stableScrollToMessage = useCallback(
    (id: string) => scrollToMessageRef.current(id),
    [],
  );

  // External scroll-to trigger from search
  const lastScrollToIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (scrollToMessageId && scrollToMessageId !== lastScrollToIdRef.current) {
      lastScrollToIdRef.current = scrollToMessageId;
      // Format is "messageId:timestamp" to allow re-triggering the same message
      const actualId = scrollToMessageId.split(":")[0];
      scrollToMessage(actualId);
    }
  }, [scrollToMessageId, scrollToMessage]);

  // Ephemeral video state
  const [activeEphemeralVideo, setActiveEphemeralVideo] = useState<{
    messageId: string;
    videoUrl: string;
    sender: string;
    videoFileId?: string;
    isMine: boolean;
  } | null>(null);
  // Ephemeral photo state
  const [activeEphemeralPhoto, setActiveEphemeralPhoto] = useState<{
    messageId: string;
    imageUrl: string;
    sender: string;
    imageFileId?: string;
    duration: number;
    caption?: string;
    isMine: boolean;
  } | null>(null);
  const [poofingMessageIds, setPoofingMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [activeDrawing, setActiveDrawing] = useState<{
    strokes: import("../types").RecordedDrawingStroke[];
    duration: number;
  } | null>(null);

  // Annotation editor: find the bubble DOM element for the annotating message
  const handleAnnotate = useCallback((messageId: string) => {
    setAnnotatingMsgId(messageId);
  }, []);

  const handleAnnotationSave = useCallback(
    (data: BubbleAnnotations) => {
      if (annotatingMsgId && onAnnotationsChange) {
        const isEmpty =
          (!data.strokes || data.strokes.length === 0) &&
          (!data.textBoxes || data.textBoxes.length === 0);
        onAnnotationsChange(annotatingMsgId, isEmpty ? null : data);
      }
      setAnnotatingMsgId(null);
    },
    [annotatingMsgId, onAnnotationsChange],
  );

  // Handle ephemeral video close - only trigger disappear for recipient, not sender
  const handleEphemeralVideoClose = useCallback(() => {
    if (activeEphemeralVideo && slotId && !activeEphemeralVideo.isMine) {
      const { messageId, videoFileId } = activeEphemeralVideo;
      // Mark as viewed first
      onMarkEphemeralViewed(messageId);
      // Start poof animation
      setPoofingMessageIds((prev) => new Set(prev).add(messageId));
      // After animation completes, expire the message then show ghost
      setTimeout(async () => {
        await onDeleteEphemeralMessage(messageId, videoFileId);
        setPoofingMessageIds((prev) => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
      }, 1100);
    }
    setActiveEphemeralVideo(null);
  }, [
    activeEphemeralVideo,
    slotId,
    onMarkEphemeralViewed,
    onDeleteEphemeralMessage,
  ]);

  // Handle ephemeral photo close - poof always plays; deletion only for recipient
  const handleEphemeralPhotoClose = useCallback(() => {
    if (activeEphemeralPhoto && slotId) {
      const { messageId, imageFileId, isMine } = activeEphemeralPhoto;
      // Always play poof animation
      setPoofingMessageIds((prev) => new Set(prev).add(messageId));
      if (!isMine) {
        // Recipient: mark viewed + expire after animation
        onMarkEphemeralViewed(messageId);
        setTimeout(async () => {
          await onDeleteEphemeralMessage(messageId, undefined, imageFileId);
          setPoofingMessageIds((prev) => {
            const next = new Set(prev);
            next.delete(messageId);
            return next;
          });
        }, 1100);
      } else {
        // Sender: just clear the animation after it plays
        setTimeout(() => {
          setPoofingMessageIds((prev) => {
            const next = new Set(prev);
            next.delete(messageId);
            return next;
          });
        }, 1100);
      }
    }
    setActiveEphemeralPhoto(null);
  }, [
    activeEphemeralPhoto,
    slotId,
    onMarkEphemeralViewed,
    onDeleteEphemeralMessage,
  ]);

  // Track last known message count for periodic scroll check
  const lastKnownCountRef = useRef(messages.length);
  const lastKnownLastIdRef = useRef(
    messages.length > 0 ? messages[messages.length - 1]?.id : null,
  );

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  // Scroll to bottom on initial load — retry a few times to catch
  // async decryption and image loads that change content height.
  const initialScrollDoneRef = useRef(false);
  useEffect(() => {
    if (initialScrollDoneRef.current) return;
    const delays = [50, 200, 500, 1200];
    const timers = delays.map((ms) =>
      window.setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "instant",
          block: "end",
        });
        lastManualScrollTimeRef.current = 0;
      }, ms),
    );
    // After the last attempt, mark done so this doesn't re-run
    const finalTimer = window.setTimeout(
      () => {
        initialScrollDoneRef.current = true;
      },
      delays[delays.length - 1] + 50,
    );
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finalTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic check — lightweight interval that compares message count/last ID
  // and scrolls to bottom if anything changed
  useEffect(() => {
    const interval = setInterval(() => {
      const currentCount = messages.length;
      const currentLastId =
        currentCount > 0 ? messages[currentCount - 1]?.id : null;

      // Only auto-scroll if 2+ seconds have passed since last manual scroll
      const timeSinceLastManualScroll =
        Date.now() - lastManualScrollTimeRef.current;
      if (timeSinceLastManualScroll < 2000) return;

      if (
        currentCount !== lastKnownCountRef.current ||
        currentLastId !== lastKnownLastIdRef.current
      ) {
        lastKnownCountRef.current = currentCount;
        lastKnownLastIdRef.current = currentLastId;
        // Pin window to bottom
        setWinStart(Math.max(0, currentCount - MESSAGES_PER_PAGE));
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [messages]);

  // Also scroll on typing indicator changes
  useEffect(() => {
    if (isOtherTyping) {
      // Only auto-scroll if 2+ seconds have passed since last manual scroll
      const timeSinceLastManualScroll =
        Date.now() - lastManualScrollTimeRef.current;
      if (timeSinceLastManualScroll >= 2000) {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        });
      }
    }
  }, [isOtherTyping]);

  // Auto-load older/newer messages on scroll (rAF-throttled)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    let rafId = 0;

    const handleScrollThrottled = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        handleScroll();
      });
    };

    const handleScroll = () => {
      const distFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      isNearBottomRef.current = distFromBottom < 150;

      // Track manual scroll time
      lastManualScrollTimeRef.current = Date.now();

      if (isLoadingRef.current) return;

      // Load older when scrolled near top
      if (container.scrollTop < 80 && hasOlder) {
        isLoadingRef.current = true;
        // Anchor the first visible message so we can restore its position
        const firstEl = container.querySelector(
          "[data-msg-id]",
        ) as HTMLElement | null;
        if (firstEl) {
          anchorRef.current = {
            msgId: firstEl.getAttribute("data-msg-id")!,
            offsetFromTop:
              firstEl.getBoundingClientRect().top -
              container.getBoundingClientRect().top,
          };
        }
        setWinStart((prev) => Math.max(0, prev - LOAD_CHUNK));
      }

      // Reached the top of locally-available messages — fetch older from server
      if (
        container.scrollTop < 80 &&
        !hasOlder &&
        hasMoreOnServer &&
        !isLoadingOlder &&
        loadOlderFromServer
      ) {
        // Anchor the first visible message for scroll restoration after new data arrives
        const firstEl = container.querySelector(
          "[data-msg-id]",
        ) as HTMLElement | null;
        if (firstEl) {
          anchorRef.current = {
            msgId: firstEl.getAttribute("data-msg-id")!,
            offsetFromTop:
              firstEl.getBoundingClientRect().top -
              container.getBoundingClientRect().top,
          };
        }
        loadOlderFromServer();
      }

      // Load newer when scrolled near bottom
      if (distFromBottom < 80 && hasNewer) {
        isLoadingRef.current = true;
        // Anchor the last visible message so we can restore its position
        const allMsgEls = container.querySelectorAll("[data-msg-id]");
        const lastEl = allMsgEls[allMsgEls.length - 1] as HTMLElement | null;
        if (lastEl) {
          anchorRef.current = {
            msgId: lastEl.getAttribute("data-msg-id")!,
            offsetFromTop:
              lastEl.getBoundingClientRect().top -
              container.getBoundingClientRect().top,
          };
        }
        setWinStart((prev) =>
          Math.min(messages.length - MESSAGES_PER_PAGE, prev + LOAD_CHUNK),
        );
      }
    };

    container.addEventListener("scroll", handleScrollThrottled, {
      passive: true,
    });
    return () => {
      container.removeEventListener("scroll", handleScrollThrottled);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [
    hasOlder,
    hasNewer,
    messages.length,
    LOAD_CHUNK,
    hasMoreOnServer,
    isLoadingOlder,
    loadOlderFromServer,
  ]);

  // Mark messages from the other person as read (only visible window, debounced)
  const markedReadRef = useRef(new Set<string>());
  useEffect(() => {
    if (!slotId) return;
    const timer = setTimeout(() => {
      visibleMessages.forEach((msg) => {
        if (!markedReadRef.current.has(msg.id)) {
          markedReadRef.current.add(msg.id);
          markMessageAsRead(msg);
        }
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [visibleMessages, slotId, markMessageAsRead]);

  // Mark that I've seen my read receipts (only visible window, debounced)
  const markedSeenRef = useRef(new Set<string>());
  useEffect(() => {
    if (!slotId) return;
    const timer = setTimeout(() => {
      visibleMessages.forEach((msg) => {
        if (!markedSeenRef.current.has(msg.id)) {
          markedSeenRef.current.add(msg.id);
          markReceiptAsSeen(msg);
        }
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [visibleMessages, slotId, markReceiptAsSeen]);

  // Long-press delete state
  const [longPressedMsgId, setLongPressedMsgId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete confirmation modal state
  const [deleteConfirmMsg, setDeleteConfirmMsg] = useState<{
    id: string;
    imageFileId?: string;
    videoFileId?: string;
  } | null>(null);

  const handleLongPressStart = useCallback((msgId: string, isMine: boolean) => {
    if (!isMine) return;
    longPressTimerRef.current = setTimeout(() => {
      setLongPressedMsgId((prev) => (prev === msgId ? null : msgId));
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Dismiss delete button when tapping elsewhere
  const handleContainerClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Only dismiss if clicking on the scroll container itself, not on a message
      if (e.target === e.currentTarget) {
        setLongPressedMsgId(null);
      }
    },
    [],
  );

  const handleSwipeStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>, msg: Message, isMine: boolean) => {
      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;
      const el = e.currentTarget;
      let deltaX = 0;
      let deltaY = 0;
      let isScrolling: boolean | null = null;

      const handleMove = (moveEvent: TouchEvent) => {
        const moveTouch = moveEvent.touches[0];
        deltaX = moveTouch.clientX - startX;
        deltaY = moveTouch.clientY - startY;

        // Determine if scrolling vertically on first significant move
        if (
          isScrolling === null &&
          (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)
        ) {
          isScrolling = Math.abs(deltaY) > Math.abs(deltaX);
        }

        // If scrolling vertically, don't interfere
        if (isScrolling) return;

        // Only allow swipe toward center (left for mine, right for theirs)
        const validDirection = isMine ? deltaX < 0 : deltaX > 0;
        if (!validDirection) {
          deltaX = 0;
          return;
        }

        const clampedDelta = Math.max(-50, Math.min(50, deltaX));
        el.style.transform = `translateX(${clampedDelta}px)`;
        el.style.transition = "none";
      };

      const handleEnd = () => {
        el.style.transform = "";
        el.style.transition = "transform 0.2s ease-out";
        // Require 60px swipe in correct direction to trigger reply
        const validSwipe = isMine ? deltaX < -60 : deltaX > 60;
        if (validSwipe && !isScrolling) {
          setReplyingTo(msg);
        }
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
      };

      document.addEventListener("touchmove", handleMove, { passive: true });
      document.addEventListener("touchend", handleEnd);
    },
    [setReplyingTo],
  );

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto overscroll-contain px-2 py-3 space-y-2"
      onClick={handleContainerClick}
    >
      {messages.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-neutral-400">
          No messages yet. Say hello!
        </div>
      )}

      {/* Server-side loading spinner */}
      {isLoadingOlder && (
        <div className="w-full py-3 flex justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
        </div>
      )}

      {/* Older messages sentinel */}
      {hasOlder && !isLoadingOlder && (
        <div className="w-full py-3 text-center text-xs text-neutral-500 animate-pulse">
          Loading older messages…
        </div>
      )}

      {/* Only render the current window of messages */}
      {visibleMessages.map((msg) => {
        const isMine = slotId === msg.slotId;
        return (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isMine={isMine}
            slotId={slotId}
            themeColors={themeColors}
            chatTheme={chatTheme}
            gradientColors={gradientColors}
            privacyMode={privacyMode}
            isLockedOut={isLockedOut}
            isHighlighted={highlightedMsgId === msg.id}
            isPrivacyHovered={privacyHoveredMsgId === msg.id}
            isCopied={copiedMsgId === msg.id}
            isLongPressed={longPressedMsgId === msg.id}
            isPoofing={poofingMessageIds.has(msg.id)}
            setPrivacyHoveredMsgId={setPrivacyHoveredMsgId}
            setCopiedMsgId={setCopiedMsgId}
            setLongPressedMsgId={setLongPressedMsgId}
            setDeleteConfirmMsg={setDeleteConfirmMsg}
            setActiveEphemeralVideo={setActiveEphemeralVideo}
            setActiveEphemeralPhoto={setActiveEphemeralPhoto}
            setActiveDrawing={setActiveDrawing}
            handleSwipeStart={handleSwipeStart}
            handleLongPressStart={handleLongPressStart}
            handleLongPressEnd={handleLongPressEnd}
            setReplyingTo={setReplyingTo}
            scrollToMessage={stableScrollToMessage}
            onReact={onReact}
            onColorChange={onColorChange}
            onBgEmojisChange={onBgEmojisChange}
            onAnnotate={onAnnotationsChange ? handleAnnotate : undefined}
            slotNames={slotNames}
            formatTimestamp={formatTimestamp}
          />
        );
      })}

      {/* Newer messages sentinel */}
      {hasNewer && (
        <div className="w-full py-3 text-center text-xs text-neutral-500 animate-pulse">
          Loading newer messages…
        </div>
      )}

      {isOtherTyping && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl bg-white/10 px-4 py-3 text-sm text-white shadow-lg">
            <p className="text-[11px] uppercase tracking-wide opacity-70">
              Tweakin
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

      {/* Ephemeral Video Player Modal */}
      {activeEphemeralVideo && (
        <EphemeralVideoPlayer
          videoUrl={activeEphemeralVideo.videoUrl}
          sender={activeEphemeralVideo.sender}
          onClose={handleEphemeralVideoClose}
          onViewed={() => {}}
        />
      )}

      {/* Ephemeral Photo Viewer Modal */}
      {activeEphemeralPhoto && (
        <EphemeralPhotoViewer
          imageUrl={activeEphemeralPhoto.imageUrl}
          sender={activeEphemeralPhoto.sender}
          duration={activeEphemeralPhoto.duration}
          caption={activeEphemeralPhoto.caption}
          onClose={handleEphemeralPhotoClose}
        />
      )}

      {/* Fullscreen Drawing Playback Overlay */}
      {activeDrawing && (
        <div className="fixed inset-0 z-[200] pointer-events-none">
          <DrawingPlayer
            strokes={activeDrawing.strokes}
            duration={activeDrawing.duration}
            autoPlay
            showPlayButton
            fullscreen
            onComplete={() => {}}
          />
          <button
            type="button"
            onClick={() => setActiveDrawing(null)}
            className="pointer-events-auto absolute top-5 right-5 z-[201] w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Bubble Annotation Editor */}
      {annotatingMsgId &&
        (() => {
          const msgWrapper = scrollContainerRef.current?.querySelector(
            `[data-msg-id="${annotatingMsgId}"]`,
          );
          const bubbleEl = msgWrapper?.querySelector(
            ".rounded-2xl.shadow-md",
          ) as HTMLDivElement | null;
          const annotatingMsg = messages.find((m) => m.id === annotatingMsgId);
          if (!bubbleEl) return null;
          return (
            <BubbleAnnotationEditor
              bubbleRef={bubbleEl}
              existing={annotatingMsg?.annotations}
              onSave={handleAnnotationSave}
              onClose={() => setAnnotatingMsgId(null)}
            />
          );
        })()}

      {/* Delete Confirmation Modal */}
      {deleteConfirmMsg && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-xs rounded-2xl border border-red-500/30 bg-gradient-to-br from-neutral-900 to-red-950/20 p-6 space-y-4 shadow-2xl">
            {/* Header icon */}
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-white text-center">
              Delete Message?
            </h3>

            {/* Description */}
            <p className="text-sm text-neutral-400 text-center">
              This message will be permanently deleted. This action cannot be
              undone.
            </p>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmMsg(null)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteMessage(
                    deleteConfirmMsg.id,
                    deleteConfirmMsg.imageFileId,
                    deleteConfirmMsg.videoFileId,
                  );
                  setDeleteConfirmMsg(null);
                }}
                className="flex-1 rounded-xl bg-red-500/80 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors active:scale-[0.98] shadow-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
