// components/timeline/TimelineCanvas.tsx
"use client";
import React, { useMemo, useRef, useCallback, useEffect } from "react";
// Date math helpers are not needed here anymore
import { MS_PER_DAY } from "./lib/constants";

// Generate ticks aligned to Jan 1 of each year
function getTicks(
  centerMs: number,
  scale: number,
  baseRangeDays: number,
  containerWidth: number,
) {
  const visibleMs = (baseRangeDays * MS_PER_DAY) / scale;
  const start = centerMs - visibleMs / 2;
  const end = centerMs + visibleMs / 2;

  const ticks: Array<{ ms: number; x: number; year: number }> = [];

  // Find the first Jan 1 at or before 'start'
  const startDate = new Date(start);
  let year = startDate.getFullYear();
  let jan1 = new Date(year, 0, 1).getTime();
  if (jan1 > start) {
    year--;
    jan1 = new Date(year, 0, 1).getTime();
  }

  // Generate ticks for each year until we pass 'end'
  while (jan1 <= end) {
    if (jan1 >= start) {
      const x = ((jan1 - start) / visibleMs) * containerWidth;
      ticks.push({ ms: jan1, x, year });
    }
    year++;
    jan1 = new Date(year, 0, 1).getTime();
  }

  // Thin ticks to ensure minimum spacing on narrow screens
  const MIN_TICK_SPACING_PX = 24;
  const thinned: typeof ticks = [];
  let lastX = -Infinity;
  for (const t of ticks) {
    if (t.x - lastX >= MIN_TICK_SPACING_PX) {
      thinned.push(t);
      lastX = t.x;
    }
  }
  return thinned;
}

function getLabels(
  centerMs: number,
  scale: number,
  baseRangeDays: number,
  containerWidth: number,
) {
  const visibleMs = (baseRangeDays * MS_PER_DAY) / scale;
  const start = centerMs - visibleMs / 2;
  const LABEL_FIXED_WIDTH_PX = 92; // fixed width to prevent jitter
  const MIN_LABEL_SPACING_PX = LABEL_FIXED_WIDTH_PX + 12; // include margin
  const labels: Array<{ ms: number; x: number; label: string }> = [];
  if (containerWidth <= 0) return labels;
  // Adaptive count based on available width
  const maxByWidth = Math.max(
    2,
    Math.floor(containerWidth / MIN_LABEL_SPACING_PX),
  );
  const count: number = Math.min(7, maxByWidth);
  for (let i = 0; i < count; i++) {
    const targetX =
      count === 1 ? containerWidth / 2 : (i * containerWidth) / (count - 1);
    const ms = Math.round(start + (targetX / containerWidth) * visibleMs);
    // Use a consistent format to keep width similar across labels
    const d = new Date(ms);
    const label = d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
    labels.push({ ms, x: targetX, label });
  }
  return labels;
}

export default function TimelineCanvas({
  containerWidth,
  centerMs,
  scale,
  baseRangeDays,
  onTimelineClick,
  onPan,
}: {
  containerWidth: number;
  centerMs: number;
  scale: number;
  baseRangeDays: number;
  onTimelineClick: (e: React.MouseEvent) => void;
  onPan?: (direction: "left" | "right") => void;
}) {
  const ticks = useMemo(
    () => getTicks(centerMs, scale, baseRangeDays, containerWidth),
    [centerMs, scale, baseRangeDays, containerWidth],
  );
  const labels = useMemo(
    () => getLabels(centerMs, scale, baseRangeDays, containerWidth),
    [centerMs, scale, baseRangeDays, containerWidth],
  );

  /* ── Arrow hold-to-scroll logic ── */
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHold = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => clearHold, [clearHold]);

  const startHold = useCallback(
    (dir: "left" | "right") => {
      if (!onPan) return;
      clearHold();
      // Immediate first tick
      onPan(dir);
      // After a short delay, start repeating
      holdTimeoutRef.current = setTimeout(() => {
        holdIntervalRef.current = setInterval(() => onPan(dir), 50);
      }, 300);
    },
    [onPan, clearHold],
  );

  const stopHold = useCallback(() => {
    clearHold();
  }, [clearHold]);

  return (
    <div className="absolute inset-0">
      {/* horizontal line */}
      <div
        onClick={onTimelineClick}
        data-timeline-line
        className="absolute cursor-pointer z-10 left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-neutral-800 via-cyan-700/40 to-neutral-800"
      />

      {/* arrows at ends — clickable with hold-to-scroll */}
      <button
        type="button"
        aria-label="Scroll timeline left"
        onMouseDown={() => startHold("left")}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={() => startHold("left")}
        onTouchEnd={stopHold}
        className="absolute z-20 left-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
          rounded-full cursor-pointer select-none
          text-neutral-500 hover:text-cyan-400 hover:bg-white/[0.06]
          active:scale-90 active:text-cyan-300
          transition-all duration-150"
      >
        <div className="rotate-180 transform text-sm">➤</div>
      </button>
      <button
        type="button"
        aria-label="Scroll timeline right"
        onMouseDown={() => startHold("right")}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={() => startHold("right")}
        onTouchEnd={stopHold}
        className="absolute z-20 right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
          rounded-full cursor-pointer select-none
          text-neutral-500 hover:text-cyan-400 hover:bg-white/[0.06]
          active:scale-90 active:text-cyan-300
          transition-all duration-150"
      >
        <div className="text-sm">➤</div>
      </button>

      {/* ticks */}
      {ticks.map((t, i) => (
        <div
          key={i}
          style={{ left: `${t.x}px` }}
          className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-neutral-600"
        />
      ))}

      {/* Evenly spaced labels across the width */}
      {labels.map((l, i) => (
        <div
          key={`label-${i}`}
          style={{ left: `${l.x}px` }}
          className="absolute top-1/2 -translate-y-1/2"
        >
          <div
            className="absolute -top-10 -translate-x-1/2 text-xs text-neutral-400 whitespace-nowrap -mt-2 text-center"
            style={{ left: 0, width: 92 }}
          >
            {l.label}
          </div>
        </div>
      ))}
    </div>
  );
}
