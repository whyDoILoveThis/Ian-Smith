"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import Image from "next/image";
import type { Message, ThemeColors } from "../types";

type PhotoGalleryOverlayProps = {
  messages: Message[];
  themeColors: ThemeColors;
  onClose: () => void;
};

type PhotoItem = {
  imageUrl: string;
  sender: string;
  senderInitial: string;
  slotId: "1" | "2";
  timestamp?: number | object;
  messageId: string;
};

export function PhotoGalleryOverlay({
  messages,
  themeColors,
  onClose,
}: PhotoGalleryOverlayProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const [swipeOffset, setSwipeOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract all photos from messages
  const photos: PhotoItem[] = useMemo(() => {
    return messages
      .filter((msg) => msg.imageUrl)
      .map((msg) => ({
        imageUrl: msg.imageUrl!,
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
      if (fullscreenIndex !== null) {
        if (e.key === "ArrowLeft") navigateFullscreen(-1);
        if (e.key === "ArrowRight") navigateFullscreen(1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreenIndex, onClose, photos.length]);

  const navigateFullscreen = useCallback(
    (dir: -1 | 1) => {
      setFullscreenIndex((prev) => {
        if (prev === null) return null;
        const next = prev + dir;
        if (next < 0 || next >= photos.length) return prev;
        return next;
      });
    },
    [photos.length],
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

  // Slot color for sender bubble
  const getBubbleColor = (slotId: "1" | "2") => {
    return slotId === "1"
      ? "bg-emerald-500 text-white"
      : "bg-amber-500 text-white";
  };

  if (photos.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Photos</h2>
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
            No photos in this conversation yet.
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
          Photos
          <span className="ml-2 text-xs font-normal text-neutral-400">
            {photos.length}
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
          {photos.map((photo, idx) => (
            <button
              key={photo.messageId}
              type="button"
              onClick={() => setFullscreenIndex(idx)}
              className="relative aspect-square overflow-hidden rounded-md bg-neutral-900 group focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <Image
                src={photo.imageUrl}
                alt={`Photo from ${photo.sender}`}
                fill
                sizes="33vw"
                className="object-cover transition-transform duration-200 group-hover:scale-105"
              />
              {/* Sender initial bubble */}
              <div
                className={`absolute bottom-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shadow-lg ring-1 ring-black/30 ${getBubbleColor(photo.slotId)}`}
              >
                {photo.senderInitial}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen viewer */}
      {fullscreenIndex !== null && photos[fullscreenIndex] && (
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
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getBubbleColor(photos[fullscreenIndex].slotId)}`}
              >
                {photos[fullscreenIndex].senderInitial}
              </div>
              <span className="text-sm text-white font-medium">
                {photos[fullscreenIndex].sender}
              </span>
              <span className="text-xs text-neutral-500">
                {fullscreenIndex + 1} / {photos.length}
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

          {/* Image area */}
          <div className="flex-1 flex items-center justify-center overflow-hidden relative">
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
              style={{
                transform: `translateX(${swipeOffset}px)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[fullscreenIndex].imageUrl}
                alt={`Photo from ${photos[fullscreenIndex].sender}`}
                className="absolute inset-0 w-full h-full object-contain"
                draggable={false}
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
            {fullscreenIndex < photos.length - 1 && (
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

          {/* Thumbnail strip at bottom */}
          <div className="bg-black/80 px-2 py-2 safe-area-inset-bottom">
            <div className="flex gap-1.5 overflow-x-auto justify-center">
              {photos.map((photo, idx) => (
                <button
                  key={`thumb-${photo.messageId}`}
                  type="button"
                  onClick={() => setFullscreenIndex(idx)}
                  className={`relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden transition-all ${
                    idx === fullscreenIndex
                      ? "ring-2 ring-white scale-105"
                      : "opacity-50 hover:opacity-80"
                  }`}
                >
                  <Image
                    src={photo.imageUrl}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
