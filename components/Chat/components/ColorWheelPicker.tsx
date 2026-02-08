"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

// HSL to Hex conversion
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Hex to HSL conversion
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace(/^#/, "");

  let r: number, g: number, b: number;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16) / 255;
    g = parseInt(hex[1] + hex[1], 16) / 255;
    b = parseInt(hex[2] + hex[2], 16) / 255;
  } else {
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

type ColorWheelPickerProps = {
  currentColor: string;
  onColorChange: (color: string) => void;
  onClose: () => void;
};

export function ColorWheelPicker({
  currentColor,
  onColorChange,
  onClose,
}: ColorWheelPickerProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const initialHsl = hexToHsl(currentColor);
  const [hue, setHue] = useState(initialHsl.h);
  const [saturation, setSaturation] = useState(initialHsl.s);
  const [lightness, setLightness] = useState(
    Math.max(20, Math.min(80, initialHsl.l)),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Calculate wheel position from hue and saturation
  const getWheelPosition = useCallback(() => {
    const angle = (hue - 90) * (Math.PI / 180);
    const radius = (saturation / 100) * 50; // 50% is max radius
    return {
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle),
    };
  }, [hue, saturation]);

  const handleWheelInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!wheelRef.current) return;

      const rect = wheelRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const x = clientX - centerX;
      const y = clientY - centerY;

      // Calculate angle (hue)
      let angle = Math.atan2(y, x) * (180 / Math.PI);
      angle = (angle + 90 + 360) % 360;

      // Calculate distance from center (saturation)
      const maxRadius = rect.width / 2;
      const distance = Math.min(Math.sqrt(x * x + y * y), maxRadius);
      const sat = (distance / maxRadius) * 100;

      setHue(angle);
      setSaturation(sat);
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      setHasInteracted(true);
      handleWheelInteraction(e.clientX, e.clientY);
    },
    [handleWheelInteraction],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      setHasInteracted(true);
      const touch = e.touches[0];
      handleWheelInteraction(touch.clientX, touch.clientY);
    },
    [handleWheelInteraction],
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      handleWheelInteraction(clientX, clientY);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove);
      document.addEventListener("touchend", handleEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, handleWheelInteraction]);

  // Update color when HSL changes (only after user interaction)
  useEffect(() => {
    if (!hasInteracted) return;
    const newColor = hslToHex(hue, saturation, lightness);
    onColorChange(newColor);
  }, [hue, saturation, lightness, onColorChange, hasInteracted]);

  const position = getWheelPosition();
  const previewColor = hslToHex(hue, saturation, lightness);

  return (
    <div className="p-4 space-y-4">
      <p className="text-xs text-neutral-400 text-center font-medium tracking-wide uppercase">
        Indicator Color
      </p>

      {/* Color Wheel */}
      <div className="flex justify-center">
        <div
          ref={wheelRef}
          className="relative w-36 h-36 rounded-full cursor-crosshair select-none"
          style={{
            background: `conic-gradient(
              from 0deg,
              hsl(0, 100%, 50%),
              hsl(30, 100%, 50%),
              hsl(60, 100%, 50%),
              hsl(90, 100%, 50%),
              hsl(120, 100%, 50%),
              hsl(150, 100%, 50%),
              hsl(180, 100%, 50%),
              hsl(210, 100%, 50%),
              hsl(240, 100%, 50%),
              hsl(270, 100%, 50%),
              hsl(300, 100%, 50%),
              hsl(330, 100%, 50%),
              hsl(360, 100%, 50%)
            )`,
            boxShadow:
              "0 0 20px rgba(0,0,0,0.3), inset 0 0 40px rgba(255,255,255,0.1)",
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* White center gradient for saturation */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, white 0%, transparent 70%)",
            }}
          />

          {/* Selector dot */}
          <div
            className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg pointer-events-none"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: "translate(-50%, -50%)",
              backgroundColor: previewColor,
              boxShadow: `0 0 10px ${previewColor}, 0 2px 8px rgba(0,0,0,0.4)`,
            }}
          />
        </div>
      </div>

      {/* Brightness Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>Brightness</span>
          <span>{Math.round(lightness)}%</span>
        </div>
        <div className="relative">
          <input
            type="range"
            min="20"
            max="80"
            value={lightness}
            onChange={(e) => {
              setHasInteracted(true);
              setLightness(Number(e.target.value));
            }}
            className="w-full h-3 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/50 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/50 [&::-moz-range-thumb]:cursor-pointer"
            style={{
              background: `linear-gradient(to right, 
                ${hslToHex(hue, saturation, 20)}, 
                ${hslToHex(hue, saturation, 50)}, 
                ${hslToHex(hue, saturation, 80)}
              )`,
            }}
          />
        </div>
      </div>

      {/* Preview & Confirm */}
      <div className="flex items-center gap-3">
        <div
          className="flex-1 h-10 rounded-xl"
          style={{
            backgroundColor: previewColor,
            boxShadow: `0 0 20px ${previewColor}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
          }}
        />
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
