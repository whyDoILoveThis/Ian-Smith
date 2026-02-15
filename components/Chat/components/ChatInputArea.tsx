"use client";

import React, { useRef } from "react";
import type { Message, ThemeColors } from "../types";

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
}: ChatInputAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const sendAndRefocus = () => {
    handleSendMessage();
    // Re-focus input after send (multiple attempts to beat any competing blur)
    setTimeout(() => inputRef.current?.focus(), 0);
    setTimeout(() => inputRef.current?.focus(), 50);
    setTimeout(() => inputRef.current?.focus(), 150);
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
      <div className="flex items-center gap-2">
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
          className={`flex-shrink-0 rounded-full border border-white/10 p-2.5 text-white transition ${slotId ? "cursor-pointer hover:bg-white/10" : "opacity-50"}`}
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
          onClick={sendAndRefocus}
          disabled={!slotId || isSending || !messageText.trim()}
          className={`flex-shrink-0 rounded-full p-2.5 transition disabled:opacity-50 ${themeColors.btn} ${themeColors.text} hover:opacity-80`}
        >
          {isSending ? (
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
  );
}
