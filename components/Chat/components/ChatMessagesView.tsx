"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { MESSAGES_PER_PAGE } from "../constants";
import type { Message, ThemeColors } from "../types";

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
}: ChatMessagesViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        return (
          <div
            key={msg.id}
            className={`group flex ${isMine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-md select-none ${
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
                <span className="text-xs text-neutral-400">↩</span>
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
              {timestamp && (
                <div
                  className={`mt-1 flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <span
                    className={`text-[9px] ${
                      isMine ? themeColors.accent : "text-neutral-400"
                    }`}
                  >
                    {timestamp}
                  </span>
                </div>
              )}
              {/* Read receipt checkmark */}
              {isMine && (
                <span
                  className={`absolute bottom-1 right-1 text-[9px] ${
                    msg.readBy?.[slotId === "1" ? "2" : "1"]
                      ? themeColors.accent
                      : "opacity-40"
                  }`}
                >
                  ✓
                </span>
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
  );
}
