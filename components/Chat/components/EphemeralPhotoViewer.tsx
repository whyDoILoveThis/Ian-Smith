"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type EphemeralPhotoViewerProps = {
  imageUrl: string;
  sender: string;
  duration: number; // seconds
  caption?: string;
  onClose: () => void;
};

export function EphemeralPhotoViewer({
  imageUrl,
  sender,
  duration,
  caption,
  onClose,
}: EphemeralPhotoViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isExpired, setIsExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Start countdown only after the image is fully loaded
  useEffect(() => {
    if (!imageLoaded) return;
    startTimeRef.current = performance.now();

    timerRef.current = setInterval(() => {
      const elapsed = (performance.now() - startTimeRef.current!) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsExpired(true);
      }
    }, 16); // ~60fps for smooth countdown

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [imageLoaded, duration]);

  // Auto-close when expired
  useEffect(() => {
    if (isExpired) {
      const timeout = setTimeout(onClose, 300);
      return () => clearTimeout(timeout);
    }
  }, [isExpired, onClose]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const progress = imageLoaded ? (timeLeft / duration) * 100 : 100;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-xl">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold">
            {sender.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-medium">{sender}</p>
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <span>👁️</span> Ephemeral Photo
            </p>
          </div>
        </div>
        {/* Timer display */}
        <div className="flex items-center gap-3">
          {imageLoaded && !isExpired && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-amber-500/30">
              <svg
                className="w-4 h-4 text-amber-400"
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
              <span className="text-amber-300 text-sm font-mono font-medium tabular-nums">
                {timeLeft.toFixed(1)}s
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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

      {/* Image container */}
      <div className="relative w-full max-w-2xl mx-4">
        <div
          className={`relative rounded-2xl overflow-hidden bg-black shadow-2xl transition-opacity duration-300 ${
            isExpired ? "opacity-0 scale-95" : "opacity-100"
          }`}
        >
          {/* Loading state */}
          {!imageLoaded && (
            <div className="flex items-center justify-center py-32">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                <span className="text-sm text-neutral-400">Loading image…</span>
              </div>
            </div>
          )}

          {/* The actual image — hidden until loaded */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Ephemeral photo"
            onLoad={handleImageLoad}
            className={`w-full max-h-[70vh] object-contain ${imageLoaded ? "" : "absolute opacity-0 pointer-events-none"}`}
          />

          {/* Caption overlay */}
          {caption && imageLoaded && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white text-sm">{caption}</p>
            </div>
          )}

          {/* Warning badge */}
          {imageLoaded && (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-red-500/20 backdrop-blur-sm border border-red-500/30">
              <span className="text-red-400 text-xs font-medium">
                🔥 Disappears in {timeLeft.toFixed(1)}s
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {imageLoaded && (
          <div className="mt-4 px-2">
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-white/70">
              <span>{timeLeft.toFixed(1)}s remaining</span>
              <span>{duration}s total</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
