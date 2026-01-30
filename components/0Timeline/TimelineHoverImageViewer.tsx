"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import LoaderSpinSmall from "../sub/LoaderSpinSmall";

type TimelineHoverImageViewerProps = {
  images: Screenshot[] | string[];
};

export default function TimelineHoverImageViewer({
  images,
}: TimelineHoverImageViewerProps) {
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [showCounter, setShowCounter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Normalize to array of URLs
  const urls: string[] =
    images.length > 0 && typeof images[0] === "string"
      ? (images as string[])
      : (images as Screenshot[]).map((img) => img.url);

  const flashCounter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowCounter(true);
    timeoutRef.current = setTimeout(() => setShowCounter(false), 1000);
  }, []);

  const handlePrev = () => {
    setCurrentImageIdx((prev) => (prev - 1 + urls.length) % urls.length);
    setIsLoading(true);
    flashCounter();
  };

  const handleNext = () => {
    setCurrentImageIdx((prev) => (prev + 1) % urls.length);
    setIsLoading(true);
    flashCounter();
  };

  // Adjust index if images array shrinks
  const safeIdx = Math.min(currentImageIdx, urls.length - 1);
  if (safeIdx !== currentImageIdx && urls.length > 0) {
    setCurrentImageIdx(safeIdx);
  }

  if (urls.length === 0) return null;

  return (
    <div
      className="relative w-full flex items-center justify-center bg-neutral-950 rounded mb-2 overflow-hidden"
      style={{ aspectRatio: "16/9" }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50 z-10">
          <LoaderSpinSmall color="cyan" />
        </div>
      )}
      <Image
        src={urls[safeIdx]}
        alt={`Image ${safeIdx + 1}`}
        fill
        className="object-contain"
        onLoad={() => setIsLoading(false)}
      />
      {urls.length > 1 && (
        <div className="absolute inset-0 flex items-center justify-between px-1 bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={handlePrev}
            className="bg-black/50 hover:bg-black/80 text-white text-xs px-1.5 py-0.5 rounded"
          >
            ←
          </button>
          <span
            className={`text-xs text-white bg-black/50 px-1.5 py-0.5 rounded transition-opacity duration-300 ${
              showCounter ? "opacity-100" : "opacity-0"
            }`}
          >
            {safeIdx + 1}/{urls.length}
          </span>
          <button
            onClick={handleNext}
            className="bg-black/50 hover:bg-black/80 text-white text-xs px-1.5 py-0.5 rounded"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
