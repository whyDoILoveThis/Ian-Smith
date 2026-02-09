"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import type { Message, ThemeColors, RecordedDrawingStroke } from "../types";
import { DrawingPlayer } from "./DrawingPlayer";

type DrawingGalleryOverlayProps = {
  messages: Message[];
  themeColors: ThemeColors;
  onClose: () => void;
};

type DrawingItem = {
  drawingData: RecordedDrawingStroke[];
  drawingDuration: number;
  sender: string;
  senderInitial: string;
  slotId: "1" | "2";
  timestamp?: number | object;
  messageId: string;
};

export function DrawingGalleryOverlay({
  messages,
  themeColors,
  onClose,
}: DrawingGalleryOverlayProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  // Extract all drawings from messages, newest first
  const drawings: DrawingItem[] = useMemo(() => {
    return messages
      .filter((msg) => msg.drawingData && msg.drawingData.length > 0)
      .map((msg) => ({
        drawingData: msg.drawingData!,
        drawingDuration: msg.drawingDuration || 3000,
        sender: msg.sender,
        senderInitial: (msg.sender?.[0] || "?").toUpperCase(),
        slotId: msg.slotId,
        timestamp: msg.createdAt,
        messageId: msg.id,
      }))
      .reverse(); // newest first
  }, [messages]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fullscreenIndex !== null) {
          setFullscreenIndex(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullscreenIndex, onClose]);

  const navigateFullscreen = useCallback(
    (dir: -1 | 1) => {
      setFullscreenIndex((prev) => {
        if (prev === null) return null;
        const next = prev + dir;
        if (next < 0 || next >= drawings.length) return prev;
        return next;
      });
    },
    [drawings.length],
  );

  const getBubbleColor = (slotId: "1" | "2") => {
    return slotId === "1"
      ? "bg-emerald-500 text-white"
      : "bg-amber-500 text-white";
  };

  if (drawings.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Drawings</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
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
        <div className="flex-1 flex items-center justify-center">
          <p className="text-neutral-500 text-sm">
            No drawings in this conversation yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 safe-area-inset-top">
        <h2 className="text-base font-semibold text-white">
          Drawings
          <span className="ml-2 text-xs font-normal text-neutral-400">
            {drawings.length}
          </span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
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

      {/* Grid */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {drawings.map((drawing, idx) => (
            <button
              key={drawing.messageId}
              type="button"
              onClick={() => setFullscreenIndex(idx)}
              className="relative aspect-video overflow-hidden rounded-lg bg-black/60 border border-white/10 group focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              {/* Static preview: show all strokes at 100% */}
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {drawing.drawingData.map((stroke, sIdx) => (
                  <path
                    key={sIdx}
                    d={pointsToPath(stroke.points)}
                    stroke={stroke.color}
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity={0.8}
                  />
                ))}
              </svg>
              {/* Play icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                <svg
                  className="w-8 h-8 text-white/80"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              {/* Sender initial bubble */}
              <div
                className={`absolute bottom-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shadow-lg ring-1 ring-black/30 ${getBubbleColor(drawing.slotId)}`}
              >
                {drawing.senderInitial}
              </div>
              {/* Duration label */}
              <span className="absolute top-1 right-1 text-[9px] text-white/60 bg-black/40 px-1 rounded">
                {(drawing.drawingDuration / 1000).toFixed(1)}s
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen player */}
      {fullscreenIndex !== null && drawings[fullscreenIndex] && (
        <div className="fixed inset-0 z-[110] flex flex-col bg-black">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 safe-area-inset-top z-10">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getBubbleColor(drawings[fullscreenIndex].slotId)}`}
              >
                {drawings[fullscreenIndex].senderInitial}
              </div>
              <span className="text-sm text-white font-medium">
                {drawings[fullscreenIndex].sender}
              </span>
              <span className="text-xs text-neutral-500">
                {fullscreenIndex + 1} / {drawings.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Nav arrows */}
              {fullscreenIndex > 0 && (
                <button
                  type="button"
                  onClick={() => navigateFullscreen(-1)}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
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
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              )}
              {fullscreenIndex < drawings.length - 1 && (
                <button
                  type="button"
                  onClick={() => navigateFullscreen(1)}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
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
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => setFullscreenIndex(null)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
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
          </div>

          {/* Full drawing player */}
          <div
            className="flex-1 relative"
            key={drawings[fullscreenIndex].messageId}
          >
            <DrawingPlayer
              strokes={drawings[fullscreenIndex].drawingData}
              duration={drawings[fullscreenIndex].drawingDuration}
              autoPlay
              showPlayButton
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Utility: Convert points to SVG path (static preview)
function pointsToPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;
  return path;
}
