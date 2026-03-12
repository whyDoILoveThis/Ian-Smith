"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import type { Message, ThemeColors } from "../types";

type VideoGalleryOverlayProps = {
  messages: Message[];
  themeColors: ThemeColors;
  onClose: () => void;
};

type VideoItem = {
  videoUrl: string;
  sender: string;
  senderInitial: string;
  slotId: "1" | "2";
  timestamp?: number | object;
  messageId: string;
};

export function VideoGalleryOverlay({
  messages,
  themeColors,
  onClose,
}: VideoGalleryOverlayProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const [swipeOffset, setSwipeOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract all videos from messages
  const videos: VideoItem[] = useMemo(() => {
    return messages
      .filter((msg) => msg.videoUrl && !msg.isEphemeral)
      .map((msg) => ({
        videoUrl: msg.videoUrl!,
        sender: msg.sender,
        senderInitial: (msg.sender?.[0] || "?").toUpperCase(),
        slotId: msg.slotId,
        timestamp: msg.createdAt,
        messageId: msg.id,
      }))
      .reverse(); // newest first
  }, [messages]);

  // Close on Escape, arrow nav in fullscreen
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fullscreenIndex !== null) {
          setFullscreenIndex(null);
        } else {
          onClose();
        }
      }
      if (fullscreenIndex !== null) {
        if (e.key === "ArrowLeft") navigateFullscreen(-1);
        if (e.key === "ArrowRight") navigateFullscreen(1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreenIndex, onClose, videos.length]);

  const navigateFullscreen = useCallback(
    (dir: -1 | 1) => {
      setFullscreenIndex((prev) => {
        if (prev === null) return null;
        const next = prev + dir;
        if (next < 0 || next >= videos.length) return prev;
        return next;
      });
    },
    [videos.length],
  );

  // Swipe handlers for fullscreen
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setSwipeOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    setSwipeOffset(dx);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current) return;
    const threshold = 60;
    if (swipeOffset < -threshold) {
      navigateFullscreen(1);
    } else if (swipeOffset > threshold) {
      navigateFullscreen(-1);
    }
    setSwipeOffset(0);
    touchStartRef.current = null;
  }, [swipeOffset, navigateFullscreen]);

  const getBubbleColor = (slotId: "1" | "2") => {
    return slotId === "1"
      ? "bg-emerald-500 text-white"
      : "bg-amber-500 text-white";
  };

  if (videos.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Videos</h2>
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
            No videos in this conversation yet.
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
          Videos
          <span className="ml-2 text-xs font-normal text-neutral-400">
            {videos.length}
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
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overscroll-contain p-1.5"
      >
        <div className="grid grid-cols-3 gap-1">
          {videos.map((video, idx) => (
            <button
              key={video.messageId}
              type="button"
              onClick={() => setFullscreenIndex(idx)}
              className="relative aspect-square overflow-hidden rounded-md bg-neutral-900 group focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <video
                src={video.videoUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
              {/* Play icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <svg
                  className="w-8 h-8 text-white/80 drop-shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              {/* Sender initial bubble */}
              <div
                className={`absolute bottom-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shadow-lg ring-1 ring-black/30 ${getBubbleColor(video.slotId)}`}
              >
                {video.senderInitial}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen viewer */}
      {fullscreenIndex !== null && videos[fullscreenIndex] && (
        <div
          className="fixed inset-0 z-[110] flex flex-col bg-black"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Fullscreen header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 safe-area-inset-top z-10">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getBubbleColor(videos[fullscreenIndex].slotId)}`}
              >
                {videos[fullscreenIndex].senderInitial}
              </div>
              <span className="text-sm text-white font-medium">
                {videos[fullscreenIndex].sender}
              </span>
              <span className="text-xs text-neutral-500">
                {fullscreenIndex + 1} / {videos.length}
              </span>
            </div>
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

          {/* Video area */}
          <div className="flex-1 flex items-center justify-center overflow-hidden relative">
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
              style={{
                transform: `translateX(${swipeOffset}px)`,
              }}
            >
              <video
                key={videos[fullscreenIndex].messageId}
                src={videos[fullscreenIndex].videoUrl}
                className="absolute inset-0 w-full h-full object-contain"
                controls
                autoPlay
                playsInline
              />
            </div>

            {/* Desktop nav arrows */}
            {fullscreenIndex > 0 && (
              <button
                type="button"
                onClick={() => navigateFullscreen(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors hidden sm:flex items-center justify-center"
              >
                <svg
                  className="w-6 h-6 text-white"
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
            {fullscreenIndex < videos.length - 1 && (
              <button
                type="button"
                onClick={() => navigateFullscreen(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors hidden sm:flex items-center justify-center"
              >
                <svg
                  className="w-6 h-6 text-white"
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
          </div>
        </div>
      )}
    </div>
  );
}
