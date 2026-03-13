/* ─────────────────────────────────────────────────────────────
   StencilRepairEditor – paint-to-repair overlay
   
   The user paints GREEN on the "good" area of the generated
   stencil. An AI-assisted analysis can auto-detect which side
   is clean. Clicking "Apply Repair" mirrors the good area to
   reconstruct the damaged side.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Eraser,
  Paintbrush,
  RotateCcw,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import type { StencilRepairResponse } from "../types";

interface Props {
  stencilBase64: string;
  stencilWidth: number;
  stencilHeight: number;
  onRepaired: (repairedBase64: string) => void;
  onCancel: () => void;
}

type Phase = "paint" | "analyzing" | "repairing" | "done";

export default function StencilRepairEditor({
  stencilBase64,
  stencilWidth,
  stencilHeight,
  onRepaired,
  onCancel,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<Phase>("paint");
  const [brushSize, setBrushSize] = useState(40);
  const [error, setError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [repairedBase64, setRepairedBase64] = useState<string | null>(null);
  const [showBefore, setShowBefore] = useState(false);

  const isPainting = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const undoStack = useRef<ImageData[]>([]);

  // ── Scale factors ──────────────────────────────────────────

  const [displayW, setDisplayW] = useState(0);
  const [displayH, setDisplayH] = useState(0);
  const scaleRef = useRef({ x: 1, y: 1 });

  // ── Init canvases ──────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cw = container.clientWidth;
    const aspect = stencilHeight / stencilWidth;
    const dw = cw;
    const dh = Math.round(cw * aspect);
    setDisplayW(dw);
    setDisplayH(dh);
    scaleRef.current = { x: stencilWidth / dw, y: stencilHeight / dh };

    // Display canvas
    const dc = displayCanvasRef.current;
    if (dc) {
      dc.width = dw;
      dc.height = dh;
    }

    // Offscreen mask canvas at stencil resolution
    const mc = maskCanvasRef.current;
    if (mc) {
      mc.width = stencilWidth;
      mc.height = stencilHeight;
      const ctx = mc.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, stencilWidth, stencilHeight);
      }
    }
  }, [stencilWidth, stencilHeight]);

  // ── Draw the stencil + overlay on the display canvas ───────

  const redrawDisplay = useCallback(() => {
    const dc = displayCanvasRef.current;
    const mc = maskCanvasRef.current;
    if (!dc || !mc || !displayW) return;
    const ctx = dc.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, displayW, displayH);
      ctx.drawImage(img, 0, 0, displayW, displayH);

      // Overlay: draw green only where the mask is white (painted)
      ctx.save();
      ctx.globalAlpha = 0.35;

      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = stencilWidth;
      tmpCanvas.height = stencilHeight;
      const tmpCtx = tmpCanvas.getContext("2d")!;

      // Read mask pixels and build a green RGBA image from white areas only
      const maskData = mc
        .getContext("2d")!
        .getImageData(0, 0, stencilWidth, stencilHeight);
      const overlay = tmpCtx.createImageData(stencilWidth, stencilHeight);
      for (let i = 0; i < maskData.data.length; i += 4) {
        if (maskData.data[i] > 128) {
          // Green where mask is white
          overlay.data[i] = 0x22; // R
          overlay.data[i + 1] = 0xcc; // G
          overlay.data[i + 2] = 0x66; // B
          overlay.data[i + 3] = 255; // A
        }
        // else leave transparent (all zeros)
      }
      tmpCtx.putImageData(overlay, 0, 0);

      ctx.drawImage(tmpCanvas, 0, 0, displayW, displayH);
      ctx.restore();
    };
    img.src = `data:image/png;base64,${stencilBase64}`;
  }, [stencilBase64, displayW, displayH, stencilWidth, stencilHeight]);

  useEffect(() => {
    redrawDisplay();
  }, [redrawDisplay]);

  // ── Painting helpers ───────────────────────────────────────

  const paintAt = useCallback(
    (dispX: number, dispY: number) => {
      const mc = maskCanvasRef.current;
      if (!mc) return;
      const ctx = mc.getContext("2d");
      if (!ctx) return;

      const sx = scaleRef.current.x;
      const sy = scaleRef.current.y;
      const mx = dispX * sx;
      const my = dispY * sy;
      const mr = (brushSize / 2) * Math.max(sx, sy);

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();

      // Interpolate between last point to avoid gaps
      if (lastPt.current) {
        const dx = mx - lastPt.current.x;
        const dy = my - lastPt.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const step = Math.max(mr * 0.3, 1);
        if (dist > step) {
          const steps = Math.ceil(dist / step);
          for (let i = 1; i < steps; i++) {
            const t = i / steps;
            ctx.beginPath();
            ctx.arc(
              lastPt.current.x + dx * t,
              lastPt.current.y + dy * t,
              mr,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      }
      lastPt.current = { x: mx, y: my };
      redrawDisplay();
    },
    [brushSize, redrawDisplay],
  );

  const getCanvasPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const dc = displayCanvasRef.current;
    if (!dc) return null;
    const rect = dc.getBoundingClientRect();
    const clientX = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
    const clientY = "touches" in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;
    // Scale from CSS rect to canvas internal pixel coordinates
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;
    return {
      x: (cssX / rect.width) * dc.width,
      y: (cssY / rect.height) * dc.height,
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (phase !== "paint") return;
      e.preventDefault();

      // Save undo state
      const mc = maskCanvasRef.current;
      if (mc) {
        const ctx = mc.getContext("2d");
        if (ctx) {
          undoStack.current.push(
            ctx.getImageData(0, 0, stencilWidth, stencilHeight),
          );
          if (undoStack.current.length > 20) undoStack.current.shift();
        }
      }

      isPainting.current = true;
      lastPt.current = null;
      const pos = getCanvasPos(e);
      if (pos) paintAt(pos.x, pos.y);
    },
    [phase, getCanvasPos, paintAt, stencilWidth, stencilHeight],
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isPainting.current) return;
      e.preventDefault();
      const pos = getCanvasPos(e);
      if (pos) paintAt(pos.x, pos.y);
    },
    [getCanvasPos, paintAt],
  );

  const handlePointerUp = useCallback(() => {
    isPainting.current = false;
    lastPt.current = null;
  }, []);

  // ── Clear mask ─────────────────────────────────────────────

  const clearMask = useCallback(() => {
    const mc = maskCanvasRef.current;
    if (!mc) return;
    const ctx = mc.getContext("2d");
    if (!ctx) return;
    undoStack.current.push(ctx.getImageData(0, 0, stencilWidth, stencilHeight));
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, stencilWidth, stencilHeight);
    setAiSuggestion(null);
    redrawDisplay();
  }, [stencilWidth, stencilHeight, redrawDisplay]);

  // ── Undo ───────────────────────────────────────────────────

  const undo = useCallback(() => {
    const mc = maskCanvasRef.current;
    if (!mc) return;
    const ctx = mc.getContext("2d");
    if (!ctx) return;
    const prev = undoStack.current.pop();
    if (prev) {
      ctx.putImageData(prev, 0, 0);
      redrawDisplay();
    }
  }, [redrawDisplay]);

  // ── AI Auto-Detect ─────────────────────────────────────────

  const aiDetect = useCallback(async () => {
    setPhase("analyzing");
    setError(null);

    try {
      const resp = await fetch("/api/tattoo-stencil-repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "analyze", stencilBase64 }),
      });

      const data: StencilRepairResponse = await resp.json();
      if (!data.success || !data.analysis) {
        setError(
          data.error ?? "AI analysis returned no result — paint manually.",
        );
        setPhase("paint");
        return;
      }

      const { goodSide, confidence } = data.analysis;
      setAiSuggestion(
        `AI detected: ${goodSide} side looks best (${Math.round(confidence * 100)}% confidence)`,
      );

      // Auto-fill the mask for the detected good side
      const mc = maskCanvasRef.current;
      if (mc) {
        const ctx = mc.getContext("2d");
        if (ctx) {
          // Save for undo
          undoStack.current.push(
            ctx.getImageData(0, 0, stencilWidth, stencilHeight),
          );

          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, stencilWidth, stencilHeight);

          ctx.fillStyle = "#fff";
          const hw = stencilWidth / 2;
          const hh = stencilHeight / 2;
          switch (goodSide) {
            case "left":
              ctx.fillRect(0, 0, hw, stencilHeight);
              break;
            case "right":
              ctx.fillRect(hw, 0, hw, stencilHeight);
              break;
            case "top":
              ctx.fillRect(0, 0, stencilWidth, hh);
              break;
            case "bottom":
              ctx.fillRect(0, hh, stencilWidth, hh);
              break;
          }
          redrawDisplay();
        }
      }

      setPhase("paint");
    } catch {
      setError("AI analysis failed — paint the good area manually.");
      setPhase("paint");
    }
  }, [stencilBase64, stencilWidth, stencilHeight, redrawDisplay]);

  // ── Apply Repair ───────────────────────────────────────────

  const applyRepair = useCallback(async () => {
    const mc = maskCanvasRef.current;
    if (!mc) return;

    setPhase("repairing");
    setError(null);

    // Export mask as PNG base64
    const maskDataUrl = mc.toDataURL("image/png");
    const maskB64 = maskDataUrl.split(",")[1];

    try {
      const resp = await fetch("/api/tattoo-stencil-repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "repair",
          stencilBase64,
          referenceMaskBase64: maskB64,
        }),
      });

      const data: StencilRepairResponse = await resp.json();
      if (!data.success || !data.repairedBase64) {
        setError(data.error ?? "Repair failed.");
        setPhase("paint");
        return;
      }

      setRepairedBase64(data.repairedBase64);
      setPhase("done");
    } catch {
      setError("Network error during repair.");
      setPhase("paint");
    }
  }, [stencilBase64]);

  // ── Accept / Redo ──────────────────────────────────────────

  const acceptRepair = useCallback(() => {
    if (repairedBase64) onRepaired(repairedBase64);
  }, [repairedBase64, onRepaired]);

  const redoRepair = useCallback(() => {
    setRepairedBase64(null);
    setPhase("paint");
  }, []);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Wand2 className="h-4 w-4" />
          AI Edge Repair
        </h4>
        <button
          onClick={onCancel}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Instructions */}
      {phase === "paint" && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Paint <span className="text-emerald-400 font-medium">green</span> over
          the side that looks correct. The AI will mirror it to fix the damaged
          side.{" "}
          <button
            onClick={aiDetect}
            className="underline text-primary hover:text-primary/80 font-medium"
          >
            Or let AI auto-detect
          </button>
        </p>
      )}

      {aiSuggestion && phase === "paint" && (
        <p className="text-xs text-emerald-400 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          {aiSuggestion}
          <span className="text-muted-foreground ml-1">— adjust if needed</span>
        </p>
      )}

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border border-border bg-white dark:bg-neutral-950 select-none touch-none"
      >
        {/* Hidden offscreen mask canvas */}
        <canvas ref={maskCanvasRef} className="hidden" />

        {phase === "done" && repairedBase64 ? (
          /* Before/After toggle */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${showBefore ? stencilBase64 : repairedBase64}`}
            alt={showBefore ? "Original stencil" : "Repaired stencil"}
            className="block w-full"
          />
        ) : (
          <canvas
            ref={displayCanvasRef}
            className="block w-full"
            style={{
              cursor:
                phase === "paint"
                  ? `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${brushSize}" height="${brushSize}"><circle cx="${brushSize / 2}" cy="${brushSize / 2}" r="${brushSize / 2 - 1}" fill="none" stroke="%2322cc66" stroke-width="2"/></svg>') ${brushSize / 2} ${brushSize / 2}, crosshair`
                  : "default",
            }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
        )}

        {/* Loading overlays */}
        {(phase === "analyzing" || phase === "repairing") && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl">
            <div className="flex flex-col items-center gap-2 text-white">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              <span className="text-xs font-medium">
                {phase === "analyzing" ? "AI analyzing…" : "Applying repair…"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Controls */}
      {phase === "paint" && (
        <div className="flex flex-col gap-2">
          {/* Brush size */}
          <div className="flex items-center gap-2">
            <Paintbrush className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="range"
              min={10}
              max={100}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="flex-1 h-1.5 accent-emerald-500"
            />
            <span className="text-xs text-muted-foreground w-8 text-right">
              {brushSize}
            </span>
          </div>

          {/* Action row */}
          <div className="flex gap-2">
            <button
              onClick={undo}
              className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Undo
            </button>
            <button
              onClick={clearMask}
              className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <Eraser className="h-3 w-3" />
              Clear
            </button>
            <div className="flex-1" />
            <button
              onClick={aiDetect}
              className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              AI Detect
            </button>
            <button
              onClick={applyRepair}
              className="flex items-center gap-1 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Wand2 className="h-3 w-3" />
              Apply Repair
            </button>
          </div>
        </div>
      )}

      {/* Done controls */}
      {phase === "done" && (
        <div className="flex flex-col gap-2">
          {/* Before/After toggle */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setShowBefore(false)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                !showBefore
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              After
            </button>
            <button
              onClick={() => setShowBefore(true)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                showBefore
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              Before
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={redoRepair}
              className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Try Again
            </button>
            <div className="flex-1" />
            <button
              onClick={acceptRepair}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              Accept Repair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
