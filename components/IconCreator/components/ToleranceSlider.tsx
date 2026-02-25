/**
 * ToleranceSlider — Adjustable color distance slider
 *
 * Controls how aggressively the background removal algorithm
 * matches pixels to the background color.
 */

"use client";

import { cn } from "@/lib/utils";
import { TOLERANCE_MIN, TOLERANCE_MAX } from "../lib/constants";

interface ToleranceSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function ToleranceSlider({
  value,
  onChange,
  disabled,
}: ToleranceSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="tolerance-slider"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Color Tolerance
        </label>
        <span
          className={cn(
            "text-sm font-mono tabular-nums px-2 py-0.5 rounded-md",
            "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
          )}
        >
          {value}
        </span>
      </div>

      <input
        id="tolerance-slider"
        type="range"
        min={TOLERANCE_MIN}
        max={TOLERANCE_MAX}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={cn(
          "w-full h-2 rounded-full appearance-none cursor-pointer",
          "bg-gray-200 dark:bg-gray-700",
          "accent-orange-500",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          // Custom slider styling
          "[&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5",
          "[&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:bg-orange-500",
          "[&::-webkit-slider-thumb]:shadow-md",
          "[&::-webkit-slider-thumb]:shadow-orange-500/30",
          "[&::-webkit-slider-thumb]:border-2",
          "[&::-webkit-slider-thumb]:border-white",
          "[&::-webkit-slider-thumb]:dark:border-gray-900",
          "[&::-webkit-slider-thumb]:transition-transform",
          "[&::-webkit-slider-thumb]:hover:scale-110",
        )}
      />

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Lower = precise match · Higher = more aggressive removal
      </p>
    </div>
  );
}
