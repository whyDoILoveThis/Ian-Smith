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
  chatTheme: ChatTheme;
  gradientColors: string[];
  /** When true, shows ephemeral duration selector */
  isEphemeral?: boolean;
  /** Called instead of onConfirm when isEphemeral is true */
  onConfirmEphemeral?: (caption: string, duration: number) => void;
};

const PRESET_DURATIONS = [0.5, 1, 2, 3, 5, 10];

export function ImageConfirmModal({
  pendingMediaUrl,
  isVideo,
  isSending,
  onConfirm,
  onCancel,
  themeColors,
  chatTheme,
  gradientColors,
  isEphemeral = false,
  onConfirmEphemeral,
}: ImageConfirmModalProps) {
  const [caption, setCaption] = useState("");
  const [ephemeralDuration, setEphemeralDuration] = useState("3");

  const parsedDuration = parseFloat(ephemeralDuration);
  const isValidDuration =
    !isNaN(parsedDuration) && parsedDuration > 0 && parsedDuration <= 999;

  const handleSend = () => {
    if (isEphemeral && onConfirmEphemeral && isValidDuration) {
      onConfirmEphemeral(caption, parsedDuration);
    } else {
      onConfirm(caption);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-900/90 p-6 shadow-2xl backdrop-blur">
        <h3 className="text-lg font-semibold text-white">
          {isEphemeral
            ? "Send ephemeral photo?"
            : `Send this ${isVideo ? "video" : "image"}?`}
        </h3>
        <p className="mt-1 text-sm text-neutral-400">
          {isEphemeral
            ? "This photo will disappear after the recipient views it."
            : "Confirm or cancel before sending."}
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
            if (e.key === "Enter" && !isSending) handleSend();
          }}
          placeholder="Add a message..."
          className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-white/20"
        />
        {/* Ephemeral duration selector */}
        {isEphemeral && (
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm text-amber-400">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              View duration
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setEphemeralDuration(String(d))}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    parseFloat(ephemeralDuration) === d
                      ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                      : "bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={ephemeralDuration}
                onChange={(e) => setEphemeralDuration(e.target.value)}
                min="0.1"
                max="999"
                step="0.1"
                className="w-20 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white outline-none focus:border-amber-500/50"
              />
              <span className="text-xs text-neutral-500">seconds</span>
              {!isValidDuration && ephemeralDuration !== "" && (
                <span className="text-xs text-red-400">Invalid</span>
              )}
            </div>
          </div>
        )}
        <div className="mt-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || (isEphemeral && !isValidDuration)}
            className={`flex-1 rounded-2xl  px-4 py-3 text-sm font-semibold  transition hover:opacity-80-300 disabled:cursor-not-allowed disabled:opacity-60 ${
              chatTheme === "gradient" ? "" : themeColors.btn
            } ${themeColors.text}`}
            style={
              chatTheme === "gradient" && gradientColors.length >= 2
                ? {
                    background: `linear-gradient(to right, ${gradientColors.join(", ")})`,
                  }
                : undefined
            }
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
            ) : isEphemeral ? (
              `Send Ephemeral (${isValidDuration ? parsedDuration + "s" : "–"})`
            ) : (
              `Send ${isVideo ? "Video" : "Image"}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
