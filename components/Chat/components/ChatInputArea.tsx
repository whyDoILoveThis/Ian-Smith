"use client";

import React from "react";
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
}: ChatInputAreaProps) {
  return (
    <div className="flex-shrink-0 border-t border-white/10 bg-black/60 px-2 py-2 safe-area-inset-bottom">
      {/* Reply preview bar */}
      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 text-sm">
          <div className="flex-1 border-l-2 border-emerald-400 pl-2">
            <p className="text-[10px] text-emerald-400 font-semibold">
              Replying to {replyingTo.sender}
            </p>
            <p className="text-[10px] text-neutral-400 truncate">
              {replyingTo.decryptedText?.slice(0, 40) ||
                (replyingTo.imageUrl ? "📷 Image" : "")}
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
          type="text"
          placeholder={slotId ? "Message" : "Join to chat"}
          value={messageText}
          disabled={!slotId || isSending}
          onChange={(e) => handleTypingChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSendMessage();
          }}
          className="flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-50"
        />
        <label
          className={`flex-shrink-0 rounded-full border border-white/10 p-2.5 text-white transition ${slotId ? "cursor-pointer hover:bg-white/10" : "opacity-50"}`}
        >
          <input
            type="file"
            accept="image/*"
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
        <button
          onClick={handleSendMessage}
          disabled={!slotId || isSending || !messageText.trim()}
          className={`flex-shrink-0 rounded-full p-2.5 transition disabled:opacity-50 ${themeColors.btn} text-black`}
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
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
