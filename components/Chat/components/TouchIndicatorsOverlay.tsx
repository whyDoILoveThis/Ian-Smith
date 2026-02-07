"use client";

import React, { useEffect, useState, useRef } from "react";
import type { TouchIndicator } from "../hooks/useTouchIndicators";

// Slot colors - Orange for slot 1, Cyan for slot 2 (soft glows only)
const SLOT_COLORS = {
  "1": "rgba(255, 61, 63, 0.6)", // coral red
  "2": "rgba(157, 61, 255, 0.6)", // purple
};

// Minimum swipe distance (in percentage of screen)
const SWIPE_THRESHOLD = 3;

type TouchIndicatorsOverlayProps = {
  touches: TouchIndicator[];
  onTap: (x: number, y: number) => void;
  onSwipe: (startX: number, startY: number, endX: number, endY: number) => void;
  enabled: boolean;
};

export function TouchIndicatorsOverlay({
  touches,
  onTap,
  onSwipe,
  enabled,
}: TouchIndicatorsOverlayProps) {
  const [localTouches, setLocalTouches] = useState<TouchIndicator[]>([]);
  const [, forceUpdate] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );

  // Update local touches
  useEffect(() => {
    setLocalTouches(touches);
  }, [touches]);

  // Animation loop to continuously update opacity/scale
  useEffect(() => {
    if (localTouches.length === 0) return;

    let animationId: number;
    const animate = () => {
      forceUpdate((n) => n + 1);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [localTouches.length]);

  // Listen to touch events on document (capture phase, passive)
  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;

      const touch = e.touches[0];
      const x = (touch.clientX / window.innerWidth) * 100;
      const y = (touch.clientY / window.innerHeight) * 100;

      touchStartRef.current = { x, y, time: Date.now() };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      if (e.changedTouches.length === 0) return;

      const touch = e.changedTouches[0];
      const endX = (touch.clientX / window.innerWidth) * 100;
      const endY = (touch.clientY / window.innerHeight) * 100;

      const startX = touchStartRef.current.x;
      const startY = touchStartRef.current.y;

      // Calculate distance
      const distance = Math.sqrt(
        Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2),
      );

      if (distance >= SWIPE_THRESHOLD) {
        // It's a swipe
        onSwipe(startX, startY, endX, endY);
      } else {
        // It's a tap
        onTap(startX, startY);
      }

      touchStartRef.current = null;
    };

    // Capture phase to see touches before they're consumed, passive to not block scrolling
    document.addEventListener("touchstart", handleTouchStart, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEnd, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart, {
        capture: true,
      });
      document.removeEventListener("touchend", handleTouchEnd, {
        capture: true,
      });
    };
  }, [enabled, onTap, onSwipe]);

  // Don't render if no touches
  if (localTouches.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[150] pointer-events-none overflow-hidden">
      {/* Render swipes as soft glowing lines */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <filter id="swipeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
          </filter>
        </defs>
        {localTouches
          .filter(
            (t) =>
              t.type === "swipe" &&
              t.endX !== undefined &&
              t.endY !== undefined,
          )
          .map((touch) => {
            const color = SLOT_COLORS[touch.slotId];
            const age = Date.now() - touch.timestamp;
            const maxAge = 700;
            const progress = Math.min(age / maxAge, 1);
            // Quick fade in then out
            const opacity =
              progress < 0.15 ? progress / 0.15 : 1 - (progress - 0.15) / 0.95;

            if (opacity <= 0) return null;

            return (
              <g key={touch.id} style={{ opacity }}>
                {/* Blurred glow line */}
                <line
                  x1={`${touch.x}%`}
                  y1={`${touch.y}%`}
                  x2={`${touch.endX}%`}
                  y2={`${touch.endY}%`}
                  stroke={color}
                  strokeWidth="18"
                  strokeLinecap="round"
                  filter="url(#swipeGlow)"
                />
                {/* End glow dot */}
                <circle
                  cx={`${touch.endX}%`}
                  cy={`${touch.endY}%`}
                  r="24"
                  fill={color}
                  filter="url(#swipeGlow)"
                />
              </g>
            );
          })}
      </svg>

      {/* Render taps as soft glowing orbs - no solid colors */}
      {localTouches
        .filter((t) => t.type === "tap")
        .map((touch) => {
          const color = SLOT_COLORS[touch.slotId];
          const age = Date.now() - touch.timestamp;
          const maxAge = 500;
          const progress = Math.min(age / maxAge, 1);

          // Smooth fade in then out using sine curve - peaks at 50%
          const opacity = Math.sin(progress * Math.PI);

          // Gentle grow from 0.7 to 1.1
          const scale = 0.7 + progress * 0.4;

          if (opacity <= 0.01) return null;

          return (
            <div
              key={touch.id}
              className="absolute"
              style={{
                left: `${touch.x}%`,
                top: `${touch.y}%`,
                transform: `translate(-50%, -50%) scale(${scale})`,
              }}
            >
              {/* Soft glowing orb - pure blur, no solid center */}
              <div
                className="rounded-full"
                style={{
                  width: 120,
                  height: 120,
                  opacity,
                  background: `radial-gradient(circle, ${color} 0%, transparent 60%)`,
                  filter: "blur(7px)",
                }}
              />
            </div>
          );
        })}
    </div>
  );
}
