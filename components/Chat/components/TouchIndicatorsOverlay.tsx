"use client";

import React, { useEffect, useState } from "react";
import type { TouchIndicator } from "../hooks/useTouchIndicators";

// Slot colors - Orange for slot 1, Cyan for slot 2
const SLOT_COLORS = {
  "1": {
    primary: "#f97316", // orange-500
    glow: "rgba(249, 115, 22, 0.4)",
    ring: "rgba(249, 115, 22, 0.6)",
  },
  "2": {
    primary: "#06b6d4", // cyan-500
    glow: "rgba(6, 182, 212, 0.4)",
    ring: "rgba(6, 182, 212, 0.6)",
  },
};

type TouchIndicatorsOverlayProps = {
  touches: TouchIndicator[];
  onTouch: (x: number, y: number) => void;
  enabled: boolean;
};

export function TouchIndicatorsOverlay({
  touches,
  onTouch,
  enabled,
}: TouchIndicatorsOverlayProps) {
  const [localTouches, setLocalTouches] = useState<TouchIndicator[]>([]);

  // Update local touches and animate
  useEffect(() => {
    setLocalTouches(touches);

    // Animation loop for smooth fading
    let animationId: number;
    const animate = () => {
      setLocalTouches((prev) => [...prev]);
      animationId = requestAnimationFrame(animate);
    };
    if (touches.length > 0) {
      animationId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [touches]);

  // Listen to touch events on document (capture phase, passive)
  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;

      const touch = e.touches[0];
      const x = (touch.clientX / window.innerWidth) * 100;
      const y = (touch.clientY / window.innerHeight) * 100;

      onTouch(x, y);
    };

    // Capture phase to see touches before they're consumed, passive to not block scrolling
    document.addEventListener("touchstart", handleTouchStart, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart, {
        capture: true,
      });
    };
  }, [enabled, onTouch]);

  // Don't render if no touches
  if (localTouches.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[150] pointer-events-none overflow-hidden">
      {localTouches.map((touch) => {
        const colors = SLOT_COLORS[touch.slotId];
        const age = Date.now() - touch.timestamp;
        const maxAge = 1500;
        const progress = Math.min(age / maxAge, 1);
        const opacity = 1 - progress;
        const scale = 1 + progress * 0.5;

        if (opacity <= 0) return null;

        return (
          <div
            key={touch.id}
            className="absolute"
            style={{
              left: `${touch.x}%`,
              top: `${touch.y}%`,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity,
            }}
          >
            {/* Outer ping effect */}
            <div
              className="absolute rounded-full animate-ping"
              style={{
                width: 48,
                height: 48,
                left: -24,
                top: -24,
                backgroundColor: colors.glow,
                animationDuration: "0.6s",
              }}
            />
            {/* Middle ring */}
            <div
              className="absolute rounded-full"
              style={{
                width: 32,
                height: 32,
                left: -16,
                top: -16,
                border: `3px solid ${colors.ring}`,
                backgroundColor: "transparent",
              }}
            />
            {/* Inner dot */}
            <div
              className="absolute rounded-full"
              style={{
                width: 14,
                height: 14,
                left: -7,
                top: -7,
                backgroundColor: colors.primary,
                boxShadow: `0 0 16px ${colors.primary}, 0 0 32px ${colors.glow}`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
