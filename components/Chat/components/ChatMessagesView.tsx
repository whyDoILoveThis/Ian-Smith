"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MESSAGES_PER_PAGE } from "../constants";
import type { Message, ThemeColors } from "../types";
import { EphemeralVideoPlayer } from "./EphemeralVideoPlayer";
import { CloudPoofAnimation } from "./CloudPoofAnimation";
import {
  EmojiReactionPicker,
  EmojiReactionsDisplay,
} from "./EmojiReactionPicker";
import Image from "next/image";
import ReplyIcon from "@/components/sub/ReplyIcon";
import { DrawingPlayer } from "./DrawingPlayer";

type ChatMessagesViewProps = {
  messages: Message[];
  slotId: "1" | "2" | null;
  themeColors: ThemeColors;
  isOtherTyping: boolean;
  formatTimestamp: (createdAt?: number | object) => string;
  setReplyingTo: (msg: Message | null) => void;
  markMessageAsRead: (msg: Message) => void;
  markReceiptAsSeen: (msg: Message) => void;
  onMarkEphemeralViewed: (messageId: string) => void;
  onDeleteEphemeralMessage: (messageId: string, videoFileId?: string) => void;
  onDeleteMessage: (
    messageId: string,
    imageFileId?: string,
    videoFileId?: string,
  ) => void;
  onReact: (messageId: string, emoji: string) => void;
  scrollToMessageId?: string | null;
};

export function ChatMessagesView({
  messages,
  slotId,
  themeColors,
  isOtherTyping,
  formatTimestamp,
  setReplyingTo,
  markMessageAsRead,
  markReceiptAsSeen,
  onMarkEphemeralViewed,
  onDeleteEphemeralMessage,
  onDeleteMessage,
  onReact,
  scrollToMessageId,
}: ChatMessagesViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [messageOffset, setMessageOffset] = useState(0);

  // Compute the visible window slice
  const windowEnd = messages.length - messageOffset;
  const windowStart = Math.max(0, windowEnd - MESSAGES_PER_PAGE);
  const visibleMessages = messages.slice(windowStart, windowEnd);
  const hasOlder = windowStart > 0;
  const hasNewer = messageOffset > 0;

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
          const newOffset = Math.max(
            0,
            messages.length - idx - MESSAGES_PER_PAGE,
          );
          setMessageOffset(newOffset);
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
  const [poofingMessageIds, setPoofingMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [activeDrawing, setActiveDrawing] = useState<{
    strokes: import("../types").RecordedDrawingStroke[];
    duration: number;
  } | null>(null);

  // Handle ephemeral video close - only trigger disappear for recipient, not sender
  const handleEphemeralVideoClose = useCallback(() => {
    if (activeEphemeralVideo && slotId && !activeEphemeralVideo.isMine) {
      const { messageId, videoFileId } = activeEphemeralVideo;
      // Mark as viewed first
      onMarkEphemeralViewed(messageId);
      // Start poof animation
      setPoofingMessageIds((prev) => new Set(prev).add(messageId));
      // After animation completes, delete the message completely
      setTimeout(() => {
        onDeleteEphemeralMessage(messageId, videoFileId);
        setPoofingMessageIds((prev) => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
      }, 800);
    }
    setActiveEphemeralVideo(null);
  }, [
    activeEphemeralVideo,
    slotId,
    onMarkEphemeralViewed,
    onDeleteEphemeralMessage,
  ]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const id = window.setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);
    return () => window.clearTimeout(id);
  }, [messages, isOtherTyping]);

  // Mark messages from the other person as read
  useEffect(() => {
    if (!slotId) return;
    messages.forEach((msg) => {
      markMessageAsRead(msg);
    });
  }, [messages, slotId, markMessageAsRead]);

  // Mark that I've seen my read receipts (second checkmark)
  useEffect(() => {
    if (!slotId) return;
    messages.forEach((msg) => {
      markReceiptAsSeen(msg);
    });
  }, [messages, slotId, markReceiptAsSeen]);

  // Long-press delete state
  const [longPressedMsgId, setLongPressedMsgId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      {/* Load older messages button */}
      {hasOlder && (
        <button
          type="button"
          onClick={() => setMessageOffset((prev) => prev + MESSAGES_PER_PAGE)}
          className="w-full py-2 text-center text-xs text-neutral-400 hover:text-white transition-colors"
        >
          ↑ Load {Math.min(MESSAGES_PER_PAGE, windowStart)} older messages
        </button>
      )}

      {/* Only render the current window of messages */}
      {visibleMessages.map((msg) => {
        const isMine = slotId === msg.slotId;
        const timestamp = formatTimestamp(msg.createdAt);
        const isPoofing = poofingMessageIds.has(msg.id);

        return (
          <div
            key={msg.id}
            data-msg-id={msg.id}
            className={`group flex ${isMine ? "justify-end" : "justify-start"} relative transition-colors duration-700 rounded-2xl ${
              highlightedMsgId === msg.id ? "bg-white/10" : ""
            }`}
          >
            {/* Cloud Poof Animation overlay */}
            {isPoofing && (
              <div className="absolute inset-0 z-20">
                <CloudPoofAnimation onComplete={() => {}} />
              </div>
            )}
            <div
              className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[75%]`}
            >
              <div
                className={`relative w-full rounded-2xl px-3 py-2 text-sm shadow-md select-none transition-all duration-300 ${
                  isPoofing ? "opacity-0 scale-75" : ""
                } ${
                  isMine
                    ? `${themeColors.bg} ${themeColors.text} rounded-br-none`
                    : "bg-white/10 text-white rounded-bl-none"
                }`}
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
                {/* Delete button (long-press) */}
                {isMine && longPressedMsgId === msg.id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMessage(msg.id, msg.imageFileId, msg.videoFileId);
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
                />

                {/* Reply preview if this is a reply */}
                {(msg.replyToText || msg.replyToImageUrl) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (msg.replyToId) scrollToMessage(msg.replyToId);
                    }}
                    className={`mb-2 rounded-lg pl-3 pr-2.5 py-1.5 text-[11px] border-l-4 text-left w-full cursor-pointer active:opacity-70 transition-opacity ${
                      isMine
                        ? "bg-black/10 border-black/40"
                        : "bg-white/5 border-white/20"
                    }`}
                    style={{
                      boxShadow:
                        "inset 0 2px 3px rgba(0, 0, 0, 0.3), inset 0 -2px 3px rgba(0, 0, 0, 0.2), inset -2px 0 3px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    <p className="font-semibold opacity-80">
                      {msg.replyToSender}
                    </p>
                    {msg.replyToImageUrl && (
                      <img
                        src={msg.replyToImageUrl}
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

                <p className="text-[11px] uppercase tracking-wide opacity-70">
                  {msg.sender}
                  {msg.decryptionFailed && (
                    <span className="ml-2 text-amber-400">⚠️ unencrypted</span>
                  )}
                </p>
                {msg.decryptedText && (
                  <p className="mt-1 whitespace-pre-line break-words">
                    {msg.decryptedText}
                  </p>
                )}
                {msg.imageUrl && (
                  <Image
                    src={msg.imageUrl}
                    alt="Uploaded"
                    width={500} // Adjust width as needed
                    height={320} // Adjust height as needed
                    className="mt-2 w-full rounded-xl border border-white/10"
                  />
                )}
                {/* Drawing message - tap to play fullscreen */}
                {msg.drawingData && msg.drawingData.length > 0 && (
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
                {msg.videoUrl && !msg.isEphemeral && (
                  <video
                    src={msg.videoUrl}
                    controls
                    className="mt-2 w-full rounded-xl border border-white/10"
                  />
                )}
                {/* Ephemeral video - show icon button instead of inline video */}
                {msg.videoUrl &&
                  msg.isEphemeral &&
                  (isMine || !msg.disappearedFor?.[slotId ?? "1"]) && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveEphemeralVideo({
                          messageId: msg.id,
                          videoUrl: msg.videoUrl!,
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
                {/* Ephemeral video that has been viewed - show placeholder (only for recipient) */}
                {msg.videoUrl &&
                  msg.isEphemeral &&
                  !isMine &&
                  msg.disappearedFor?.[slotId ?? "1"] && (
                    <div className="mt-2 w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-white/10 bg-white/5 text-neutral-500 text-sm">
                      <svg
                        className="w-5 h-5"
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
                      Video has been viewed
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
              {/* Emoji reactions display below bubble */}
              {msg.reactions && (
                <div
                  className={`w-full ${isMine ? "flex justify-end" : "flex justify-start"}`}
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
        );
      })}

      {/* Jump to newest messages button */}
      {hasNewer && (
        <button
          type="button"
          onClick={() => setMessageOffset(0)}
          className="w-full py-2 text-center text-xs text-neutral-400 hover:text-white transition-colors"
        >
          ↓ Back to newest messages
        </button>
      )}

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

      {/* Ephemeral Video Player Modal */}
      {activeEphemeralVideo && (
        <EphemeralVideoPlayer
          videoUrl={activeEphemeralVideo.videoUrl}
          sender={activeEphemeralVideo.sender}
          onClose={handleEphemeralVideoClose}
          onViewed={() => {}}
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
    </div>
  );
}
