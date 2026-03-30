"use client";

import { cn } from "@/lib/utils";
import { CONFIDENCE_THRESHOLD } from "../lib/constants";

interface ConfidenceBadgeProps {
  confidence: number;
  retryCount?: number;
  className?: string;
}

export function ConfidenceBadge({
  confidence,
  retryCount = 0,
  className,
}: ConfidenceBadgeProps) {
  const passed = confidence >= CONFIDENCE_THRESHOLD;
  const color = passed
    ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
    : confidence >= 50
      ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
      : "text-red-400 border-red-500/30 bg-red-500/10";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums transition-all duration-300",
        color,
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          passed
            ? "bg-emerald-400"
            : confidence >= 50
              ? "bg-amber-400"
              : "bg-red-400",
        )}
      />
      {confidence}%
      {retryCount > 0 && (
        <span className="text-[10px] opacity-60">×{retryCount}</span>
      )}
    </span>
  );
}
