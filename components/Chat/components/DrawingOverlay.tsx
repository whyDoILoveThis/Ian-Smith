"use client";

import React, { useEffect, useRef, useState } from "react";
import type { DrawingStroke } from "../hooks/useDrawing";

type DrawingOverlayProps = {
  strokes: DrawingStroke[];
  isDrawingMode: boolean;
  onStartStroke: (x: number, y: number) => void;
  onAddPoint: (x: number, y: number) => void;
  onEndStroke: () => void;
  strokeDuration: number;
  fadeDuration: number;
};

export function DrawingOverlay({
  strokes,
  isDrawingMode,
  onStartStroke,
  onAddPoint,
  onEndStroke,
  strokeDuration,
  fadeDuration,
}: DrawingOverlayProps) {
  const [, forceUpdate] = useState(0);
  const isDrawingRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Animation loop for smooth fading
  useEffect(() => {
    if (strokes.length === 0) return;

    let animationId: number;
    const animate = () => {
      forceUpdate((n) => n + 1);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [strokes.length]);

  // Lock scrolling when in drawing mode
  useEffect(() => {
    if (!isDrawingMode) return;

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
  }, [isDrawingMode]);

  // Handle touch/mouse events for drawing
  useEffect(() => {
    if (!isDrawingMode) return;

    const getPosition = (clientX: number, clientY: number) => {
      const x = (clientX / window.innerWidth) * 100;
      const y = (clientY / window.innerHeight) * 100;
      return { x, y };
    };

    const handleStart = (clientX: number, clientY: number) => {
      isDrawingRef.current = true;
      const { x, y } = getPosition(clientX, clientY);
      onStartStroke(x, y);
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!isDrawingRef.current) return;
      const { x, y } = getPosition(clientX, clientY);
      onAddPoint(x, y);
    };

    const handleEnd = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        onEndStroke();
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
  }, [isDrawingMode, onStartStroke, onAddPoint, onEndStroke]);

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

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[140] overflow-hidden ${
        isDrawingMode
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
        </defs>
        {strokes.map((stroke) => {
          const opacity = getStrokeOpacity(stroke);
          if (opacity <= 0) return null;

          return (
            <path
              key={stroke.id}
              d={pointsToPath(stroke.points)}
              stroke={stroke.color}
              strokeWidth="0.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={opacity}
              filter="url(#drawGlow)"
              style={{
                transition: "opacity 0.1s ease-out",
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}
