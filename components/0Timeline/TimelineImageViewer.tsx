"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import LoaderSpinSmall from "../sub/LoaderSpinSmall";

type TimelineImageViewerProps = {
  images: Screenshot[] | string[];
  onRemove?: (index: number) => void;
};

export default function TimelineImageViewer({
  images,
  onRemove,
}: TimelineImageViewerProps) {
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
    <div className="mb-3">
      <div className="relative w-full" style={{ height: "150px" }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50 z-10">
            <LoaderSpinSmall color="cyan" />
          </div>
        )}
        <Image
          src={urls[safeIdx]}
          alt={`Image ${safeIdx + 1}`}
          className="object-contain"
          fill
          sizes="(max-width: 768px) 100vw, 500px"
          onLoad={() => setIsLoading(false)}
        />
        {onRemove && (
          <button
            onClick={() => onRemove(safeIdx)}
            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded px-2 py-0.5 text-xs font-bold"
          >
            ✕ Remove
          </button>
        )}
      </div>

      {urls.length > 1 && (
        <div className="flex items-center justify-between gap-1 mb-2">
          {/** prev/next buttons */}
          <button
            onClick={handlePrev}
            className="px-2 py-1 rounded bg-neutral-700 text-xs hover:bg-neutral-600"
          >
            ←
          </button>
          {/** image counter - fades in/out */}
          <span
            className={`text-xs text-neutral-400 transition-opacity duration-300 ${
              showCounter ? "opacity-100" : "opacity-0"
            }`}
          >
            {safeIdx + 1}/{urls.length}
          </span>
          <button
            onClick={handleNext}
            className="px-2 py-1 rounded bg-neutral-700 text-xs hover:bg-neutral-600"
          >
            →
          </button>
        </div>
      )}

      {urls.length > 1 && (
        <div className="bg-neutral-950/30 border border-neutral-700/40 rounded p-1 mb-3 flex gap-1 overflow-x-auto">
          {urls.map((url, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentImageIdx(idx);
                setIsLoading(true);
                flashCounter();
              }}
              className={`relative flex-shrink-0 rounded border-2 transition-all ${
                idx === safeIdx
                  ? "border-cyan-400"
                  : "border-neutral-600 hover:border-neutral-500"
              }`}
              style={{ width: "40px", height: "40px" }}
            >
              <Image
                src={url}
                alt={`Thumb ${idx + 1}`}
                className="rounded"
                fill
                sizes="40px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
