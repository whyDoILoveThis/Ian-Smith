"use client";

import React, { useEffect, useRef, useState } from "react";
import type { DrawingStroke, EmojiStamp } from "../hooks/useDrawing";
import { isNeonColor } from "../hooks/useDrawing";
import EmojiText from "@/components/ui/EmojiText";

type DrawingOverlayProps = {
  strokes: DrawingStroke[];
  isDrawingMode: boolean;
  onStartStroke: (x: number, y: number) => void;
  onAddPoint: (x: number, y: number) => void;
  onEndStroke: () => void;
  strokeDuration: number;
  fadeDuration: number;
  // Emoji stamp props
  emojiStamps: EmojiStamp[];
  isEmojiMode: boolean;
  onEmojiTap: (x: number, y: number) => void;
  emojiStampDuration: number;
  emojiStampFade: number;
};

export function DrawingOverlay({
  strokes,
  isDrawingMode,
  onStartStroke,
  onAddPoint,
  onEndStroke,
  strokeDuration,
  fadeDuration,
  emojiStamps,
  isEmojiMode,
  onEmojiTap,
  emojiStampDuration,
  emojiStampFade,
}: DrawingOverlayProps) {
  const [, forceUpdate] = useState(0);
  const isDrawingRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  // Local in-progress stroke
  const [localStroke, setLocalStroke] = useState<{
    color: string;
    points: { x: number; y: number }[];
  } | null>(null);

  // Animation loop for smooth fading
  useEffect(() => {
    if (strokes.length === 0 && emojiStamps.length === 0) return;

    let animationId: number;
    const animate = () => {
      forceUpdate((n) => n + 1);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [strokes.length, emojiStamps.length]);

  // Lock scrolling when in drawing mode or emoji mode
  useEffect(() => {
    if (!isDrawingMode && !isEmojiMode) return;

    // Save current overflow style
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    // Disable scrolling
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      // Restore original styles
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isDrawingMode, isEmojiMode]);

  // Handle touch/mouse events for drawing and emoji stamps
  useEffect(() => {
    if (!isDrawingMode && !isEmojiMode) return;

    // Get color from the last stroke or fallback
    const getCurrentColor = () => {
      if (strokes.length > 0) return strokes[strokes.length - 1].color;
      return "#fff";
    };

    const getPosition = (clientX: number, clientY: number) => {
      const x = (clientX / window.innerWidth) * 100;
      const y = (clientY / window.innerHeight) * 100;
      return { x, y };
    };

    const handleStart = (clientX: number, clientY: number) => {
      if (isEmojiMode) {
        // Emoji mode: place stamp on tap
        const { x, y } = getPosition(clientX, clientY);
        onEmojiTap(x, y);
        return;
      }
      isDrawingRef.current = true;
      const { x, y } = getPosition(clientX, clientY);
      onStartStroke(x, y);
      // Start local stroke
      setLocalStroke({ color: getCurrentColor(), points: [{ x, y }] });
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (isEmojiMode) return; // no drag for emoji stamps
      if (!isDrawingRef.current) return;
      const { x, y } = getPosition(clientX, clientY);
      onAddPoint(x, y);
      setLocalStroke((prev) =>
        prev ? { ...prev, points: [...prev.points, { x, y }] } : prev,
      );
    };

    const handleEnd = () => {
      if (isEmojiMode) return;
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        onEndStroke();
        setLocalStroke(null);
      }
    };

    // Touch events

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    };

    // Mouse events (for desktop testing)
    const handleMouseDown = (e: MouseEvent) => {
      handleStart(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleEnd();
    };

    const overlay = overlayRef.current;
    if (!overlay) return;

    overlay.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    overlay.addEventListener("touchmove", handleTouchMove, { passive: false });
    overlay.addEventListener("touchend", handleTouchEnd);
    overlay.addEventListener("mousedown", handleMouseDown);
    overlay.addEventListener("mousemove", handleMouseMove);
    overlay.addEventListener("mouseup", handleMouseUp);
    overlay.addEventListener("mouseleave", handleMouseUp);

    return () => {
      overlay.removeEventListener("touchstart", handleTouchStart);
      overlay.removeEventListener("touchmove", handleTouchMove);
      overlay.removeEventListener("touchend", handleTouchEnd);
      overlay.removeEventListener("mousedown", handleMouseDown);
      overlay.removeEventListener("mousemove", handleMouseMove);
      overlay.removeEventListener("mouseup", handleMouseUp);
      overlay.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [
    isDrawingMode,
    isEmojiMode,
    onStartStroke,
    onAddPoint,
    onEndStroke,
    onEmojiTap,
  ]);

  // Calculate opacity for a stroke based on its age
  const getStrokeOpacity = (stroke: DrawingStroke) => {
    if (!stroke.isComplete) return 1;

    const age = Date.now() - stroke.timestamp;
    if (age < strokeDuration) return 1;

    const fadeProgress = (age - strokeDuration) / fadeDuration;
    return Math.max(0, 1 - fadeProgress);
  };

  // Convert points to smooth SVG path using quadratic bezier curves
  const pointsToPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
    }
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }

    // Use quadratic bezier curves for smooth lines
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      // Control point is the current point, end point is midpoint to next
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
    }

    // Draw to the last point
    const last = points[points.length - 1];
    path += ` L ${last.x} ${last.y}`;

    return path;
  };

  // Calculate opacity for an emoji stamp based on its age
  const getStampOpacity = (stamp: EmojiStamp) => {
    const age = Date.now() - stamp.timestamp;
    if (age < emojiStampDuration) return 1;
    const fadeProgress = (age - emojiStampDuration) / emojiStampFade;
    return Math.max(0, 1 - fadeProgress);
  };

  // Calculate scale for emoji stamp (pop-in effect)
  const getStampScale = (stamp: EmojiStamp) => {
    const age = Date.now() - stamp.timestamp;
    if (age < 120) return 0.3 + (age / 120) * 0.9; // pop-in: 0.3 → 1.2
    if (age < 200) return 1.2 - ((age - 120) / 80) * 0.2; // settle: 1.2 → 1.0
    return 1;
  };

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[140] overflow-hidden ${
        isDrawingMode || isEmojiMode
          ? "pointer-events-auto cursor-crosshair"
          : "pointer-events-none"
      }`}
      style={isDrawingMode ? { top: "48px" } : undefined}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="drawGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.8" result="blur1" />
            <feGaussianBlur stdDeviation="1.5" result="blur2" />
            <feGaussianBlur stdDeviation="2.5" result="blur3" />
            <feMerge>
              <feMergeNode in="blur3" />
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Render finished strokes from Firebase */}
        {strokes.map((stroke) => {
          const opacity = getStrokeOpacity(stroke);
          if (opacity <= 0) return null;
          const isNeon = isNeonColor(stroke.color);
          return (
            <path
              key={stroke.id}
              d={pointsToPath(stroke.points)}
              stroke={stroke.color}
              strokeWidth={isNeon ? "0.6" : "0.5"}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={opacity}
              filter={isNeon ? "url(#neonGlow)" : "url(#drawGlow)"}
              style={{
                transition: "opacity 0.1s ease-out",
              }}
            />
          );
        })}
        {/* Render local in-progress stroke */}
        {localStroke && localStroke.points.length > 1 && (
          <path
            d={pointsToPath(localStroke.points)}
            stroke={localStroke.color}
            strokeWidth={isNeonColor(localStroke.color) ? "0.6" : "0.5"}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={1}
            filter={
              isNeonColor(localStroke.color)
                ? "url(#neonGlow)"
                : "url(#drawGlow)"
            }
          />
        )}
      </svg>

      {/* Emoji stamps overlay */}
      {emojiStamps.map((stamp) => {
        const opacity = getStampOpacity(stamp);
        if (opacity <= 0) return null;
        const scale = getStampScale(stamp);
        return (
          <div
            key={stamp.id}
            className="absolute pointer-events-none select-none"
            style={{
              left: `${stamp.x}%`,
              top: `${stamp.y}%`,
              transform: `translate(-50%, -50%) scale(${scale})`,
              fontSize: `${stamp.size}px`,
              opacity,
              lineHeight: 1,
              transition: "opacity 0.1s ease-out",
              // Add a subtle text shadow for depth
              filter: opacity < 1 ? `blur(${(1 - opacity) * 2}px)` : undefined,
            }}
          >
            <EmojiText>{stamp.emoji}</EmojiText>
          </div>
        );
      })}
    </div>
  );
}
