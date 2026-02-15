"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ChatTheme, ThemeColors } from "../types";

type ImageConfirmModalProps = {
  pendingMediaUrl: string;
  isVideo: boolean;
  isSending: boolean;
  onConfirm: (caption: string) => void;
  onCancel: () => void;
  themeColors: ThemeColors;
};

export function ImageConfirmModal({
  pendingMediaUrl,
  isVideo,
  isSending,
  onConfirm,
  onCancel,
  themeColors,
}: ImageConfirmModalProps) {
  const [caption, setCaption] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-900/90 p-6 shadow-2xl backdrop-blur">
        <h3 className="text-lg font-semibold text-white">
          Send this {isVideo ? "video" : "image"}?
        </h3>
        <p className="mt-1 text-sm text-neutral-400">
          Confirm or cancel before sending.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          {isVideo ? (
            <video
              src={pendingMediaUrl}
              controls
              className="max-h-[320px] w-full object-contain"
            />
          ) : (
            <Image
              src={pendingMediaUrl}
              alt="Preview"
              width={500}
              height={320}
              className="max-h-[320px] w-full object-contain"
            />
          )}
        </div>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isSending) onConfirm(caption);
          }}
          placeholder="Add a message..."
          className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-white/20"
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(caption)}
            disabled={isSending}
            className={`flex-1 rounded-2xl  px-4 py-3 text-sm font-semibold  transition hover:opacity-80-300 disabled:cursor-not-allowed disabled:opacity-60 ${themeColors.btn} ${themeColors.text}`}
          >
            {isSending ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
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
                Uploading...
              </span>
            ) : (
              `Send ${isVideo ? "Video" : "Image"}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
