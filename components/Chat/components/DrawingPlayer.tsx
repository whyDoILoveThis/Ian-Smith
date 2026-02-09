"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { RecordedDrawingStroke } from "../types";
import { isNeonColor } from "../hooks/useDrawing";

type DrawingPlayerProps = {
  strokes: RecordedDrawingStroke[];
  duration: number;
  /** Auto-play on mount */
  autoPlay?: boolean;
  /** Show play button overlay when not playing */
  showPlayButton?: boolean;
  /** Render at full screen (fixed overlay) vs inline container */
  fullscreen?: boolean;
  /** Optional class for the container */
  className?: string;
  /** Callback when playback completes */
  onComplete?: () => void;
  /** Whether to loop */
  loop?: boolean;
};

// Convert points to smooth SVG path using quadratic bezier curves
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

export function DrawingPlayer({
  strokes,
  duration,
  autoPlay = false,
  showPlayButton = true,
  fullscreen = false,
  className = "",
  onComplete,
  loop = false,
}: DrawingPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopPlayback = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const startPlayback = useCallback(() => {
    if (strokes.length === 0) return;
    setIsPlaying(true);
    setCurrentTime(0);
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      setCurrentTime(elapsed);

      if (elapsed >= duration) {
        if (loop) {
          startTimeRef.current = performance.now();
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Show the final frame for a moment, then stop
          setCurrentTime(duration);
          setIsPlaying(false);
          animFrameRef.current = null;
          onComplete?.();
        }
        return;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [strokes, duration, loop, onComplete]);

  // Auto-play on mount if specified
  useEffect(() => {
    if (autoPlay && strokes.length > 0) {
      // Small delay so the component is mounted
      const id = setTimeout(startPlayback, 100);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Get visible strokes and their progress at `currentTime`
  const getVisibleStrokes = () => {
    if (!isPlaying && currentTime === 0) return [];

    return strokes
      .filter((s) => s.startTime <= currentTime)
      .map((s) => {
        const strokeDur = s.endTime - s.startTime;
        if (strokeDur <= 0)
          return { ...s, visiblePoints: s.points, opacity: 1 };

        const elapsed = currentTime - s.startTime;
        const progress = Math.min(1, elapsed / strokeDur);
        const visibleCount = Math.max(2, Math.ceil(s.points.length * progress));
        const visiblePoints = s.points.slice(0, visibleCount);

        // Fade out after the stroke is complete (last 500ms of a 1500ms window)
        const timeSinceEnd = currentTime - s.endTime;
        const fadeDuration = 1500;
        let opacity = 1;
        if (timeSinceEnd > 0 && timeSinceEnd < fadeDuration) {
          opacity = 1 - timeSinceEnd / fadeDuration;
        } else if (timeSinceEnd >= fadeDuration) {
          opacity = 0;
        }

        return { ...s, visiblePoints, opacity };
      })
      .filter((s) => s.opacity > 0);
  };

  const visible = getVisibleStrokes();
  const hasFinished = !isPlaying && currentTime >= duration && currentTime > 0;

  const containerClass = fullscreen
    ? "fixed inset-0 z-[150] flex items-center justify-center pointer-events-none"
    : `relative bg-black/60 rounded-xl overflow-hidden ${className}`;

  return (
    <div className={containerClass}>
      {/* SVG drawing canvas */}
      <svg
        className={
          fullscreen ? "w-full h-full" : "w-full h-full absolute inset-0"
        }
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="playGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter
            id="playNeonGlow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="0.8" result="blur1" />
            <feGaussianBlur stdDeviation="1.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {visible.map((s, idx) => {
          const isNeon = isNeonColor(s.color);
          return (
            <path
              key={`${idx}-${s.startTime}`}
              d={pointsToPath(s.visiblePoints)}
              stroke={s.color}
              strokeWidth={isNeon ? "0.6" : "0.5"}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={s.opacity}
              filter={isNeon ? "url(#playNeonGlow)" : "url(#playGlow)"}
            />
          );
        })}
      </svg>

      {/* Play button overlay */}
      {showPlayButton && !isPlaying && (currentTime === 0 || hasFinished) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            startPlayback();
          }}
          className={`absolute inset-0 flex items-center justify-center ${fullscreen ? "bg-transparent" : "bg-black/30 hover:bg-black/20"} transition-colors z-10 ${fullscreen ? "pointer-events-auto" : ""}`}
        >
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
            {hasFinished ? (
              /* Replay icon */
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            ) : (
              /* Play icon */
              <svg
                className="w-6 h-6 text-white ml-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </button>
      )}

      {/* Progress bar at bottom */}
      {(isPlaying || hasFinished) && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <div
            className="h-full bg-white/50 transition-none"
            style={{
              width: `${Math.min(100, (currentTime / duration) * 100)}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
