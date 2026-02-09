"use client";

import React from "react";
import type { RecordedDrawingStroke, ThemeColors } from "../types";
import { DrawingPlayer } from "./DrawingPlayer";

type DrawingRecordPreviewProps = {
  strokes: RecordedDrawingStroke[];
  duration: number;
  themeColors: ThemeColors;
  isSending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DrawingRecordPreview({
  strokes,
  duration,
  themeColors,
  isSending,
  onConfirm,
  onCancel,
}: DrawingRecordPreviewProps) {
  const durationSec = (duration / 1000).toFixed(1);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-900/95 p-5 shadow-2xl backdrop-blur">
        <h3 className="text-lg font-semibold text-white">Send this drawing?</h3>
        <p className="mt-1 text-sm text-neutral-400">
          {strokes.length} stroke{strokes.length !== 1 ? "s" : ""} •{" "}
          {durationSec}s
        </p>

        {/* Drawing preview - auto plays */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 overflow-hidden aspect-video">
          <DrawingPlayer
            strokes={strokes}
            duration={duration}
            autoPlay
            showPlayButton
            loop
            className="w-full h-full"
          />
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSending}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSending || strokes.length === 0}
            className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition disabled:opacity-50 ${themeColors.bg} ${themeColors.text}`}
          >
            {isSending ? "Sending..." : "Send Drawing"}
          </button>
        </div>
      </div>
    </div>
  );
}
