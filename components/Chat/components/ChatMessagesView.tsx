"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MESSAGES_PER_PAGE } from "../constants";
import type { Message, ThemeColors } from "../types";
import { EphemeralVideoPlayer } from "./EphemeralVideoPlayer";
import { CloudPoofAnimation } from "./CloudPoofAnimation";
import { ReplyIcon } from "lucide-react";

type ChatMessagesViewProps = {
  messages: Message[];
  slotId: "1" | "2" | null;
  themeColors: ThemeColors;
  visibleMessageCount: number;
  setVisibleMessageCount: React.Dispatch<React.SetStateAction<number>>;
  isOtherTyping: boolean;
  formatTimestamp: (createdAt?: number | object) => string;
  setReplyingTo: (msg: Message | null) => void;
  markMessageAsRead: (msg: Message) => void;
  onMarkEphemeralViewed: (messageId: string) => void;
  onDeleteEphemeralMessage: (messageId: string, videoFileId?: string) => void;
};

export function ChatMessagesView({
  messages,
  slotId,
  themeColors,
  visibleMessageCount,
  setVisibleMessageCount,
  isOtherTyping,
  formatTimestamp,
  setReplyingTo,
  markMessageAsRead,
  onMarkEphemeralViewed,
  onDeleteEphemeralMessage,
}: ChatMessagesViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Ephemeral video state
  const [activeEphemeralVideo, setActiveEphemeralVideo] = useState<{
    messageId: string;
    videoUrl: string;
    sender: string;
    videoFileId?: string;
  } | null>(null);
  const [poofingMessageIds, setPoofingMessageIds] = useState<Set<string>>(
    new Set(),
  );

  // Handle ephemeral video close - trigger poof animation then delete
  const handleEphemeralVideoClose = useCallback(() => {
    if (activeEphemeralVideo && slotId) {
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
    >
      {messages.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-neutral-400">
          No messages yet. Say hello!
        </div>
      )}

      {/* Load older messages button */}
      {messages.length > visibleMessageCount && (
        <button
          type="button"
          onClick={() =>
            setVisibleMessageCount((prev) => prev + MESSAGES_PER_PAGE)
          }
          className="w-full py-2 text-center text-xs text-neutral-400 hover:text-white transition-colors"
        >
          ↑ Load{" "}
          {Math.min(MESSAGES_PER_PAGE, messages.length - visibleMessageCount)}{" "}
          older messages
        </button>
      )}

      {/* Only render last N messages for performance */}
      {messages.slice(-visibleMessageCount).map((msg) => {
        const isMine = slotId === msg.slotId;
        const timestamp = formatTimestamp(msg.createdAt);
        const isPoofing = poofingMessageIds.has(msg.id);

        return (
          <div
            key={msg.id}
            className={`group flex ${isMine ? "justify-end" : "justify-start"} relative`}
          >
            {/* Cloud Poof Animation overlay */}
            {isPoofing && (
              <div className="absolute inset-0 z-20">
                <CloudPoofAnimation onComplete={() => {}} />
              </div>
            )}
            <div
              className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-md select-none transition-all duration-300 ${
                isPoofing ? "opacity-0 scale-75" : ""
              } ${
                isMine
                  ? `${themeColors.bg} ${themeColors.text} rounded-br-none`
                  : "bg-white/10 text-white rounded-bl-none"
              }`}
              onTouchStart={(e) => handleSwipeStart(e, msg, isMine)}
            >
              {/* Reply button on hover (desktop) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReplyingTo(msg);
                }}
                className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-white/10 ${
                  isMine ? "-left-7" : "-right-7"
                }`}
              >
                <span className={`text-xs text-neutral-400`}>
                  <ReplyIcon size={14} />
                </span>
              </button>

              {/* Reply preview if this is a reply */}
              {msg.replyToText && (
                <div
                  className={`mb-2 rounded-lg px-2 py-1 text-[11px] ${
                    isMine
                      ? "bg-black/10 border-l-2 border-black/40"
                      : "bg-white/5 border-l-2 border-white/40"
                  }`}
                >
                  <p className="font-semibold opacity-80">
                    {msg.replyToSender}
                  </p>
                  <p className="truncate opacity-60 max-w-[200px]">
                    {msg.replyToText}
                  </p>
                </div>
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
                <img
                  src={msg.imageUrl}
                  alt="Uploaded"
                  className="mt-2 w-full rounded-xl border border-white/10"
                />
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
                !msg.disappearedFor?.[slotId ?? "1"] && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveEphemeralVideo({
                        messageId: msg.id,
                        videoUrl: msg.videoUrl!,
                        sender: msg.sender,
                        videoFileId: msg.videoFileId,
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
                        Tap to view • Disappears after watching
                      </span>
                    </div>
                  </button>
                )}
              {/* Ephemeral video that has been viewed - show placeholder */}
              {msg.videoUrl &&
                msg.isEphemeral &&
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
                  {/* Read receipt checkmark - only shows when other person has seen it */}
                  {isMine && msg.readBy?.[slotId === "1" ? "2" : "1"] && (
                    <span className={`text-[9px] ${themeColors.accent}`}>
                      ✓
                    </span>
                  )}
                </div>
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

      {/* Ephemeral Video Player Modal */}
      {activeEphemeralVideo && (
        <EphemeralVideoPlayer
          videoUrl={activeEphemeralVideo.videoUrl}
          sender={activeEphemeralVideo.sender}
          onClose={handleEphemeralVideoClose}
          onViewed={() => {}}
        />
      )}
    </div>
  );
}
