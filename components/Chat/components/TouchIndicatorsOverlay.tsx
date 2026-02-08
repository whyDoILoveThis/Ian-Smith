"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import type { TouchIndicator } from "../hooks/useTouchIndicators";

// Minimum swipe distance (in percentage of screen)
const SWIPE_THRESHOLD = 3;

// Debounce time to prevent duplicate events (ms)
const DEBOUNCE_TIME = 50;

// Default slot colors as fallback
const DEFAULT_SLOT_COLORS = {
  "1": { r: 255, g: 61, b: 63 }, // coral red
  "2": { r: 157, g: 61, b: 255 }, // purple
};

// Convert hex to RGB object
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  hex = hex.replace(/^#/, "");

  let r: number, g: number, b: number;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }

  return { r, g, b };
}

type TouchIndicatorsOverlayProps = {
  touches: TouchIndicator[];
  onTap: (x: number, y: number, inputType?: "touch" | "mouse") => void;
  onSwipe: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    inputType?: "touch" | "mouse",
  ) => void;
  enabled: boolean;
  customColors?: { "1"?: string; "2"?: string };
};

export function TouchIndicatorsOverlay({
  touches,
  onTap,
  onSwipe,
  enabled,
  customColors,
}: TouchIndicatorsOverlayProps) {
  const [localTouches, setLocalTouches] = useState<TouchIndicator[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const mouseStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const isMouseDownRef = useRef(false);
  const lastEventTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Get color for a slot
  const getColor = useCallback(
    (slotId: "1" | "2") => {
      const customHex = customColors?.[slotId];
      return customHex ? hexToRgb(customHex) : DEFAULT_SLOT_COLORS[slotId];
    },
    [customColors],
  );

  // Update local touches with optimized batching
  useEffect(() => {
    setLocalTouches(touches);
  }, [touches]);

  // High-performance animation loop using RAF
  useEffect(() => {
    if (localTouches.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animate = () => {
      setCurrentTime(Date.now());
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [localTouches.length]);

  // Touch event handlers with debouncing and interactive element detection
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

      const now = Date.now();

      // Debounce check
      if (now - lastEventTimeRef.current < DEBOUNCE_TIME) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      const endX = (touch.clientX / window.innerWidth) * 100;
      const endY = (touch.clientY / window.innerHeight) * 100;

      const startX = touchStartRef.current.x;
      const startY = touchStartRef.current.y;

      const distance = Math.sqrt(
        Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2),
      );

      lastEventTimeRef.current = now;

      if (distance >= SWIPE_THRESHOLD) {
        onSwipe(startX, startY, endX, endY, "touch");
      } else {
        onTap(startX, startY, "touch");
      }

      touchStartRef.current = null;
    };

    const handleTouchCancel = () => {
      touchStartRef.current = null;
    };

    document.addEventListener("touchstart", handleTouchStart, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEnd, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchcancel", handleTouchCancel, {
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
      document.removeEventListener("touchcancel", handleTouchCancel, {
        capture: true,
      });
    };
  }, [enabled, onTap, onSwipe]);

  // Mouse event handlers
  useEffect(() => {
    if (!enabled) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;

      mouseStartRef.current = { x, y, time: Date.now() };
      isMouseDownRef.current = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!mouseStartRef.current || !isMouseDownRef.current) return;

      const now = Date.now();

      if (now - lastEventTimeRef.current < DEBOUNCE_TIME) {
        mouseStartRef.current = null;
        isMouseDownRef.current = false;
        return;
      }

      const endX = (e.clientX / window.innerWidth) * 100;
      const endY = (e.clientY / window.innerHeight) * 100;

      const startX = mouseStartRef.current.x;
      const startY = mouseStartRef.current.y;

      const distance = Math.sqrt(
        Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2),
      );

      lastEventTimeRef.current = now;

      if (distance >= SWIPE_THRESHOLD) {
        onSwipe(startX, startY, endX, endY, "mouse");
      } else {
        onTap(startX, startY, "mouse");
      }

      mouseStartRef.current = null;
      isMouseDownRef.current = false;
    };

    document.addEventListener("mousedown", handleMouseDown, {
      capture: true,
      passive: true,
    });
    document.addEventListener("mouseup", handleMouseUp, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handleMouseDown, {
        capture: true,
      });
      document.removeEventListener("mouseup", handleMouseUp, { capture: true });
    };
  }, [enabled, onTap, onSwipe]);

  if (localTouches.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[150] pointer-events-none overflow-hidden">
      {/* Beautiful swipe trails with gradient effect */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ willChange: "transform" }}
      >
        <defs>
          {/* Define gradients and filters for each touch */}
          {localTouches
            .filter(
              (t) =>
                t.type === "swipe" &&
                t.endX !== undefined &&
                t.endY !== undefined,
            )
            .map((touch) => {
              const rgb = getColor(touch.slotId);
              return (
                <React.Fragment key={`defs-${touch.id}`}>
                  <linearGradient
                    id={`swipeGradient-${touch.id}`}
                    x1={`${touch.x}%`}
                    y1={`${touch.y}%`}
                    x2={`${touch.endX}%`}
                    y2={`${touch.endY}%`}
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop
                      offset="0%"
                      stopColor={`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`}
                    />
                    <stop
                      offset="50%"
                      stopColor={`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`}
                    />
                    <stop
                      offset="100%"
                      stopColor={`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`}
                    />
                  </linearGradient>
                  <filter
                    id={`swipeGlow-${touch.id}`}
                    x="-100%"
                    y="-100%"
                    width="300%"
                    height="300%"
                  >
                    <feGaussianBlur stdDeviation="8" result="blur1" />
                    <feGaussianBlur stdDeviation="4" result="blur2" />
                    <feMerge>
                      <feMergeNode in="blur1" />
                      <feMergeNode in="blur2" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter
                    id={`endGlow-${touch.id}`}
                    x="-200%"
                    y="-200%"
                    width="500%"
                    height="500%"
                  >
                    <feGaussianBlur stdDeviation="12" result="blur" />
                  </filter>
                </React.Fragment>
              );
            })}
        </defs>

        {/* Render swipe lines */}
        {localTouches
          .filter(
            (t) =>
              t.type === "swipe" &&
              t.endX !== undefined &&
              t.endY !== undefined,
          )
          .map((touch) => {
            const rgb = getColor(touch.slotId);
            const age = currentTime - touch.timestamp;
            const maxAge = 600;
            const progress = Math.min(age / maxAge, 1);

            // Smooth ease-out fade
            const opacity = Math.pow(1 - progress, 1.5);

            if (opacity <= 0.01) return null;

            // Calculate line length for animated dash effect
            const dx = ((touch.endX! - touch.x) * window.innerWidth) / 100;
            const dy = ((touch.endY! - touch.y) * window.innerHeight) / 100;
            const length = Math.sqrt(dx * dx + dy * dy);

            return (
              <g key={touch.id} style={{ opacity, willChange: "opacity" }}>
                {/* Outer glow */}
                <line
                  x1={`${touch.x}%`}
                  y1={`${touch.y}%`}
                  x2={`${touch.endX}%`}
                  y2={`${touch.endY}%`}
                  stroke={`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`}
                  strokeWidth="24"
                  strokeLinecap="round"
                  filter={`url(#swipeGlow-${touch.id})`}
                />
                {/* Main line with gradient */}
                <line
                  x1={`${touch.x}%`}
                  y1={`${touch.y}%`}
                  x2={`${touch.endX}%`}
                  y2={`${touch.endY}%`}
                  stroke={`url(#swipeGradient-${touch.id})`}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${length * (1 - progress * 0.3)} ${length}`}
                />
                {/* Inner bright core */}
                <line
                  x1={`${touch.x}%`}
                  y1={`${touch.y}%`}
                  x2={`${touch.endX}%`}
                  y2={`${touch.endY}%`}
                  stroke={`rgba(255, 255, 255, ${0.6 * opacity})`}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* End point glow burst */}
                <circle
                  cx={`${touch.endX}%`}
                  cy={`${touch.endY}%`}
                  r={16 + progress * 8}
                  fill={`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.5 * opacity})`}
                  filter={`url(#endGlow-${touch.id})`}
                />
                {/* End point bright center */}
                <circle
                  cx={`${touch.endX}%`}
                  cy={`${touch.endY}%`}
                  r={4}
                  fill={`rgba(255, 255, 255, ${0.8 * opacity})`}
                />
              </g>
            );
          })}
      </svg>

      {/* Render tap indicators */}
      {localTouches
        .filter((t) => t.type === "tap")
        .map((touch) => {
          const rgb = getColor(touch.slotId);
          const age = currentTime - touch.timestamp;
          const maxAge = 450;
          const progress = Math.min(age / maxAge, 1);

          // Smooth bell curve fade with quick peak
          const opacity = Math.sin(progress * Math.PI) * (1 - progress * 0.3);

          // Expand animation
          const scale = 0.5 + progress * 0.8;

          // Ring expansion
          const ringScale = 0.3 + progress * 1.2;
          const ringOpacity = (1 - progress) * 0.6;

          if (opacity <= 0.01) return null;

          return (
            <div
              key={touch.id}
              className="absolute"
              style={{
                left: `${touch.x}%`,
                top: `${touch.y}%`,
                transform: "translate(-50%, -50%)",
                willChange: "transform, opacity",
              }}
            >
              {/* Mouse cursor icon */}
              {touch.inputType === "mouse" && (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="absolute"
                  style={{
                    opacity,
                    filter: `drop-shadow(0 0 8px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8))`,
                    left: "50%",
                    top: "50%",
                    marginLeft: "-6px",
                    marginTop: "-2px",
                    zIndex: 10,
                  }}
                >
                  <path
                    d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L5.85 2.36a.5.5 0 0 0-.35.85z"
                    fill={`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`}
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              )}

              {/* Expanding ring */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 80,
                  height: 80,
                  left: "50%",
                  top: "50%",
                  transform: `translate(-50%, -50%) scale(${ringScale})`,
                  border: `2px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${ringOpacity})`,
                  boxShadow: `0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${ringOpacity * 0.5})`,
                }}
              />

              {/* Main glow orb */}
              <div
                className="rounded-full"
                style={{
                  width: 100,
                  height: 100,
                  transform: `scale(${scale})`,
                  opacity,
                  background: `radial-gradient(circle, 
                    rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8) 0%, 
                    rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4) 30%,
                    rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1) 60%,
                    transparent 80%
                  )`,
                  filter: "blur(4px)",
                }}
              />

              {/* Bright center dot */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 12,
                  height: 12,
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  opacity: opacity * 0.9,
                  background: `radial-gradient(circle, 
                    rgba(255, 255, 255, 0.9) 0%, 
                    rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8) 100%
                  )`,
                  boxShadow: `0 0 15px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`,
                }}
              />
            </div>
          );
        })}

      {/* Mouse cursor at swipe endpoints */}
      {localTouches
        .filter(
          (t) =>
            t.type === "swipe" &&
            t.inputType === "mouse" &&
            t.endX !== undefined &&
            t.endY !== undefined,
        )
        .map((touch) => {
          const rgb = getColor(touch.slotId);
          const age = currentTime - touch.timestamp;
          const maxAge = 600;
          const progress = Math.min(age / maxAge, 1);
          const opacity = Math.pow(1 - progress, 1.5);

          if (opacity <= 0.01) return null;

          return (
            <div
              key={`cursor-${touch.id}`}
              className="absolute pointer-events-none"
              style={{
                left: `${touch.endX}%`,
                top: `${touch.endY}%`,
                transform: "translate(-50%, -50%)",
                opacity,
                willChange: "opacity",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                style={{
                  filter: `drop-shadow(0 0 8px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8))`,
                }}
              >
                <path
                  d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L5.85 2.36a.5.5 0 0 0-.35.85z"
                  fill={`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`}
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          );
        })}
    </div>
  );
}
