/* ─────────────────────────────────────────────────────────────
   BoundarySelector – human-defined wrap boundary editor

   Renders the uploaded image with a canvas overlay where the
   user places 4 control points:

     1. axisStart  – top of the limb centre-line (e.g. elbow)
     2. axisEnd    – bottom of the limb centre-line (e.g. wrist)
     3. leftEdge   – left silhouette at widest point
     4. rightEdge   – right silhouette at widest point

   Points are stored as normalised 0-1 coords relative to the
   image's natural dimensions so they survive any client resize.

   WHY this file exists:
   No existing component handles user-drawn geometry on the
   image.  The spec requires "explicit human input, no guessing"
   for wrap boundaries.  This is a clearly-scoped addition next
   to the other components in the same folder.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Check, HelpCircle } from "lucide-react";
import type { WrapBoundary } from "../types";

// ── Point definition order ───────────────────────────────────

const POINT_DEFS = [
  {
    key: "axisStart",
    label: "Axis top",
    colour: "#22d3ee",
    instruction: "Click the TOP of the limb axis (e.g. elbow or hip)",
  },
  {
    key: "axisEnd",
    label: "Axis bottom",
    colour: "#22d3ee",
    instruction: "Click the BOTTOM of the limb axis (e.g. wrist or ankle)",
  },
  {
    key: "leftEdge",
    label: "Left edge",
    colour: "#f97316",
    instruction:
      "Click the LEFT silhouette edge of the limb at its widest point",
  },
  {
    key: "rightEdge",
    label: "Right edge",
    colour: "#a855f7",
    instruction:
      "Click the RIGHT silhouette edge of the limb at its widest point",
  },
] as const;

type PointKey = (typeof POINT_DEFS)[number]["key"];

interface Props {
  /** Object-URL preview of the uploaded image. */
  imageSrc: string;
  /** Natural dimensions of the uploaded image. */
  imageWidth: number;
  imageHeight: number;
  /** Called when the user confirms all 4 points. */
  onConfirm: (boundary: WrapBoundary) => void;
  /** Called when user opts to skip boundary selection. */
  onSkip: () => void;
}

// ── Component ────────────────────────────────────────────────

export default function BoundarySelector({
  imageSrc,
  imageWidth,
  imageHeight,
  onConfirm,
  onSkip,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Points placed so far (normalised 0-1)
  const [points, setPoints] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [showHelp, setShowHelp] = useState(true);

  // Which point is being dragged (null = none)
  const dragRef = useRef<PointKey | null>(null);

  // Current point index to place next
  const placedCount = POINT_DEFS.filter((d) => d.key in points).length;
  const allPlaced = placedCount === POINT_DEFS.length;
  const nextDef = !allPlaced ? POINT_DEFS[placedCount] : null;

  // ── Coordinate helpers ─────────────────────────────────────

  /** Convert mouse/touch event to normalised 0-1 image coords. */
  const eventToNorm = useCallback(
    (e: React.MouseEvent | React.Touch): { x: number; y: number } | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    },
    [],
  );

  // ── Click handler (place next point) ───────────────────────

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (allPlaced) return; // all done
      const norm = eventToNorm(e);
      if (!norm || !nextDef) return;
      setPoints((prev) => ({ ...prev, [nextDef.key]: norm }));
    },
    [allPlaced, nextDef, eventToNorm],
  );

  // ── Drag: find nearest point ───────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!allPlaced) return; // only drag when all are placed
      const norm = eventToNorm(e);
      if (!norm) return;

      let nearest: PointKey | null = null;
      let bestDist = 0.04; // threshold (norm distance)
      for (const def of POINT_DEFS) {
        const p = points[def.key];
        if (!p) continue;
        const d = Math.hypot(p.x - norm.x, p.y - norm.y);
        if (d < bestDist) {
          bestDist = d;
          nearest = def.key;
        }
      }
      if (nearest) {
        dragRef.current = nearest;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [allPlaced, points, eventToNorm],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const norm = eventToNorm(e);
      if (!norm) return;
      setPoints((prev) => ({ ...prev, [dragRef.current!]: norm }));
    },
    [eventToNorm],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ── Draw overlay ───────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const toPixel = (norm: { x: number; y: number }) => ({
      px: norm.x * rect.width,
      py: norm.y * rect.height,
    });

    // Draw axis line
    const aStart = points.axisStart;
    const aEnd = points.axisEnd;
    if (aStart && aEnd) {
      const a = toPixel(aStart);
      const b = toPixel(aEnd);
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw left edge → right edge line
    const lE = points.leftEdge;
    const rE = points.rightEdge;
    if (lE && rE) {
      const a = toPixel(lE);
      const b = toPixel(rE);
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw points
    for (const def of POINT_DEFS) {
      const p = points[def.key];
      if (!p) continue;
      const { px, py } = toPixel(p);

      // Outer ring
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = def.colour + "33";
      ctx.fill();
      ctx.strokeStyle = def.colour;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Centre dot
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = def.colour;
      ctx.fill();

      // Label
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#00000088";
      ctx.lineWidth = 3;
      ctx.strokeText(def.label, px + 12, py + 4);
      ctx.fillText(def.label, px + 12, py + 4);
    }
  }, [points]);

  // ── Reset handler ──────────────────────────────────────────

  const handleReset = useCallback(() => setPoints({}), []);

  // ── Confirm handler ────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    if (!allPlaced) return;
    onConfirm({
      axisStart: points.axisStart,
      axisEnd: points.axisEnd,
      leftEdge: points.leftEdge,
      rightEdge: points.rightEdge,
    });
  }, [allPlaced, points, onConfirm]);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Instruction banner */}
      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        <HelpCircle className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-foreground">
          {allPlaced
            ? "All points placed. Drag to adjust, then confirm."
            : (nextDef?.instruction ?? "Place all 4 boundary points.")}
        </span>
        {showHelp && !allPlaced && (
          <button
            onClick={() => setShowHelp(false)}
            className="ml-auto text-xs text-muted-foreground underline"
          >
            hide
          </button>
        )}
      </div>

      {/* Image + canvas overlay */}
      <div
        ref={containerRef}
        className="relative cursor-crosshair select-none overflow-hidden rounded-xl border border-border"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt="Draw wrap boundaries on this image"
          className="block w-full"
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>

      {/* Point progress chips */}
      <div className="flex flex-wrap gap-2">
        {POINT_DEFS.map((def) => {
          const placed = def.key in points;
          return (
            <span
              key={def.key}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                placed
                  ? "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400"
                  : "border-border bg-muted/40 text-muted-foreground"
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: placed ? def.colour : "#888" }}
              />
              {def.label}
            </span>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted active:scale-[0.97]"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Points
        </button>

        <button
          onClick={handleConfirm}
          disabled={!allPlaced}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
            allPlaced
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "cursor-not-allowed bg-muted text-muted-foreground"
          }`}
        >
          <Check className="h-4 w-4" />
          Confirm Boundaries &amp; Generate
        </button>

        <button
          onClick={onSkip}
          className="text-xs text-muted-foreground underline transition-colors hover:text-foreground"
        >
          Skip (auto)
        </button>
      </div>
    </div>
  );
}
