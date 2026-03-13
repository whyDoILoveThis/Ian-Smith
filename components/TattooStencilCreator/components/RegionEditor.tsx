/* ─────────────────────────────────────────────────────────────
   RegionEditor – polygon limb outline + brush tattoo highlighter

   Two-tab canvas overlay that lets the user:

     Tab 1 "Outline Limb":
       Click to place polygon vertices around the limb.
       Close by clicking near the first vertex (or double-click).
       Drag vertices to adjust after closing.

     Tab 2 "Highlight Tattoo":
       Paint over the tattoo with an adjustable brush.
       Toggle add/erase. Creates a binary mask sent to the API.

   On confirm, outputs a RegionEditorResult:
     { limbOutline, tattooHighlight }

   Both are optional — the user can skip either or both.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Check,
  ChevronDown,
  Eraser,
  HelpCircle,
  Paintbrush,
  Pencil,
  PenTool,
  Redo2,
  RotateCcw,
  Save,
  SkipForward,
  Trash2,
  Undo2,
  Waves,
} from "lucide-react";
import type { Point2D, RegionEditorResult } from "../types";

// ── Preset / saved-set types ─────────────────────────────────

const PRESETS_STORAGE_KEY = "tattoo-stencil-region-presets";

interface SavedPreset {
  id: string;
  name: string;
  createdAt: number;
  outlinePoints: Point2D[];
  outlineClosed: boolean;
  highlightMaskBase64: string | null;
  curveMaskBase64: string | null;
  curvaturePercent: number;
  curveAngle: number;
}

function loadPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedPreset[];
  } catch {
    return [];
  }
}

function savePresetsToStorage(presets: SavedPreset[]) {
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

// ── Types ────────────────────────────────────────────────────

type Mode = "outline" | "highlight" | "curves";

interface Props {
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  onConfirm: (result: RegionEditorResult) => void;
  onSkip: () => void;
  /** Previously saved regions to restore (same image). */
  initialRegions?: RegionEditorResult | null;
}

// ── Constants ────────────────────────────────────────────────

const CLOSE_RADIUS_PX = 14;
const VERTEX_RADIUS = 6;
const MIN_BRUSH = 5;
const MAX_BRUSH = 80;
const DEFAULT_BRUSH = 24;
const MASK_COLOUR = "rgba(255,50,50,0.45)";
const CURVE_COLOUR_R = 255;
const CURVE_COLOUR_G = 220;
const CURVE_COLOUR_B = 30;
const CURVE_OVERLAY_A = 100;
const OUTLINE_COLOUR = "#22d3ee";
const OUTLINE_FILL = "rgba(34,211,238,0.12)";
const VERTEX_FILL = "#fff";

// ── Component ────────────────────────────────────────────────

export default function RegionEditor({
  imageSrc,
  imageWidth,
  imageHeight,
  onConfirm,
  onSkip,
  initialRegions,
}: Props) {
  /* ── state ─────────────────────────────────────────────── */
  const [mode, setMode] = useState<Mode>("outline");
  const [outlinePoints, setOutlinePoints] = useState<Point2D[]>(
    initialRegions?.limbOutline?.points ?? [],
  );
  const [outlineClosed, setOutlineClosed] = useState(
    (initialRegions?.limbOutline?.points?.length ?? 0) >= 3,
  );
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH);
  const [brushMode, setBrushMode] = useState<"add" | "erase">("add");
  const [curvaturePercent, setCurvaturePercent] = useState(50);
  const [curveAngle, setCurveAngle] = useState(0);
  const [showHelp, setShowHelp] = useState(true);

  /* ── refs ──────────────────────────────────────────────── */
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paintingRef = useRef(false);
  const dragIdxRef = useRef<number | null>(null);
  const lastPaintPt = useRef<{ x: number; y: number } | null>(null);

  /** Undo / redo stacks for the tattoo highlight mask. */
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  /** Undo / redo stacks for the curve mask. */
  const curveUndoStackRef = useRef<ImageData[]>([]);
  const curveRedoStackRef = useRef<ImageData[]>([]);
  /** Undo / redo stacks for the polygon outline. */
  const outlineUndoRef = useRef<{ pts: Point2D[]; closed: boolean }[]>([]);
  const outlineRedoRef = useRef<{ pts: Point2D[]; closed: boolean }[]>([]);

  /** Saved presets state */
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const presetMenuRef = useRef<HTMLDivElement>(null);

  // Load presets from localStorage on mount
  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  // Close preset menu on outside click
  useEffect(() => {
    if (!showPresetMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        presetMenuRef.current &&
        !presetMenuRef.current.contains(e.target as Node)
      ) {
        setShowPresetMenu(false);
        setEditingPresetId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPresetMenu]);
  /** Offscreen canvas for the curve highlight mask (yellow). */
  const curveMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  /** Initial highlight base64 to restore on canvas init. */
  const initialHighlightRef = useRef(
    initialRegions?.tattooHighlight?.maskBase64 ?? null,
  );
  /** Initial curve highlight base64 to restore. */
  const initialCurveRef = useRef(
    initialRegions?.curveHighlight?.maskBase64 ?? null,
  );
  /** Initial curvature percentage to restore. */
  const initialCurvePctRef = useRef(
    initialRegions?.curveHighlight?.curvaturePercent ?? null,
  );
  /** Initial curve angle to restore. */
  const initialCurveAngleRef = useRef(
    initialRegions?.curveHighlight?.angleDeg ?? null,
  );

  // ── coordinate helpers ─────────────────────────────────────

  const toNorm = useCallback(
    (e: { clientX: number; clientY: number }): Point2D | null => {
      const cnv = displayCanvasRef.current;
      if (!cnv) return null;
      const r = cnv.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return null;
      return { x, y };
    },
    [],
  );

  const toCanvas = useCallback((pt: Point2D) => {
    const cnv = displayCanvasRef.current;
    if (!cnv) return { x: 0, y: 0 };
    return { x: pt.x * cnv.width, y: pt.y * cnv.height };
  }, []);

  // ── ensure mask canvas matches display canvas size ─────────

  useEffect(() => {
    const cnv = displayCanvasRef.current;
    if (!cnv) return;
    const dpr = window.devicePixelRatio || 1;
    const r = cnv.getBoundingClientRect();
    cnv.width = r.width * dpr;
    cnv.height = r.height * dpr;

    // Create offscreen mask at the same resolution
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement("canvas");
    }
    maskCanvasRef.current.width = cnv.width;
    maskCanvasRef.current.height = cnv.height;
    const mctx = maskCanvasRef.current.getContext("2d")!;
    mctx.fillStyle = "#000";
    mctx.fillRect(0, 0, cnv.width, cnv.height);

    // Restore previous highlight mask if re-entering editor
    const savedMask = initialHighlightRef.current;
    if (savedMask) {
      const img = new Image();
      img.onload = () => {
        mctx.drawImage(img, 0, 0, cnv.width, cnv.height);
        redraw();
      };
      img.src = `data:image/png;base64,${savedMask}`;
      initialHighlightRef.current = null; // only restore once
    }

    // Clear undo/redo stacks on re-init
    undoStackRef.current = [];
    redoStackRef.current = [];

    // Create offscreen curve-mask canvas at same resolution
    if (!curveMaskCanvasRef.current) {
      curveMaskCanvasRef.current = document.createElement("canvas");
    }
    curveMaskCanvasRef.current.width = cnv.width;
    curveMaskCanvasRef.current.height = cnv.height;
    const cctx = curveMaskCanvasRef.current.getContext("2d")!;
    cctx.fillStyle = "#000";
    cctx.fillRect(0, 0, cnv.width, cnv.height);

    // Restore previous curve mask if re-entering editor
    const savedCurve = initialCurveRef.current;
    if (savedCurve) {
      const img2 = new Image();
      img2.onload = () => {
        cctx.drawImage(img2, 0, 0, cnv.width, cnv.height);
        redraw();
      };
      img2.src = `data:image/png;base64,${savedCurve}`;
      initialCurveRef.current = null;
    }
    if (initialCurvePctRef.current !== null) {
      setCurvaturePercent(initialCurvePctRef.current);
      initialCurvePctRef.current = null;
    }
    if (initialCurveAngleRef.current !== null) {
      setCurveAngle(initialCurveAngleRef.current);
      initialCurveAngleRef.current = null;
    }
    curveUndoStackRef.current = [];
    curveRedoStackRef.current = [];
    outlineUndoRef.current = [];
    outlineRedoRef.current = [];

    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc, imageWidth, imageHeight]);

  // ── redraw visible canvas ──────────────────────────────────

  const redraw = useCallback(() => {
    const cnv = displayCanvasRef.current;
    if (!cnv) return;
    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    const w = cnv.width;
    const h = cnv.height;
    ctx.clearRect(0, 0, w, h);

    // Draw mask overlay
    const mask = maskCanvasRef.current;
    if (mask) {
      const mctx = mask.getContext("2d")!;
      const mdata = mctx.getImageData(0, 0, mask.width, mask.height);
      // Convert binary mask to red overlay
      const overlay = ctx.createImageData(w, h);
      for (let i = 0; i < mdata.data.length; i += 4) {
        if (mdata.data[i] > 128) {
          // white pixel in mask → red overlay
          overlay.data[i] = 255;
          overlay.data[i + 1] = 50;
          overlay.data[i + 2] = 50;
          overlay.data[i + 3] = 100;
        }
      }
      ctx.putImageData(overlay, 0, 0);
    }

    // Draw yellow curve mask overlay on top
    const curveMask = curveMaskCanvasRef.current;
    if (curveMask) {
      const cmctx = curveMask.getContext("2d")!;
      const cmdata = cmctx.getImageData(
        0,
        0,
        curveMask.width,
        curveMask.height,
      );
      const curveOverlay = ctx.createImageData(w, h);
      for (let i = 0; i < cmdata.data.length; i += 4) {
        const v = cmdata.data[i]; // curvature level (0-255)
        if (v > 2) {
          curveOverlay.data[i] = CURVE_COLOUR_R;
          curveOverlay.data[i + 1] = CURVE_COLOUR_G;
          curveOverlay.data[i + 2] = CURVE_COLOUR_B;
          // Opacity scales with curvature: dim at low %, bright at high %
          curveOverlay.data[i + 3] = Math.round(40 + (v / 255) * 140);
        }
      }
      // Blend with existing content (putImageData replaces, so use a temp canvas)
      const tempCnv = document.createElement("canvas");
      tempCnv.width = w;
      tempCnv.height = h;
      const tctx = tempCnv.getContext("2d")!;
      tctx.putImageData(curveOverlay, 0, 0);
      ctx.drawImage(tempCnv, 0, 0);
    }

    // Draw cylinder axis indicator when curves mode is active and mask exists
    if (curveMask) {
      // Find centroid of painted pixels for the indicator position
      const cmctx2 = curveMask.getContext("2d")!;
      const cmdata2 = cmctx2.getImageData(
        0,
        0,
        curveMask.width,
        curveMask.height,
      );
      let cmCx = 0,
        cmCy = 0,
        cmCount = 0;
      for (let py = 0; py < curveMask.height; py++) {
        for (let px = 0; px < curveMask.width; px++) {
          if (cmdata2.data[(py * curveMask.width + px) * 4] > 2) {
            cmCx += px;
            cmCy += py;
            cmCount++;
          }
        }
      }
      if (cmCount > 50) {
        cmCx /= cmCount;
        cmCy /= cmCount;
        const angleRad = (curveAngle * Math.PI) / 180;
        const lineLen = Math.min(w, h) * 0.35;
        const dx = Math.cos(angleRad) * lineLen;
        const dy = Math.sin(angleRad) * lineLen;

        // Axis line (dashed, orange)
        ctx.save();
        ctx.strokeStyle = "rgba(255,160,0,0.85)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(cmCx - dx, cmCy - dy);
        ctx.lineTo(cmCx + dx, cmCy + dy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow head at the positive end
        const arrowSize = 10;
        const ax = cmCx + dx;
        const ay = cmCy + dy;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(
          ax - arrowSize * Math.cos(angleRad - 0.4),
          ay - arrowSize * Math.sin(angleRad - 0.4),
        );
        ctx.moveTo(ax, ay);
        ctx.lineTo(
          ax - arrowSize * Math.cos(angleRad + 0.4),
          ay - arrowSize * Math.sin(angleRad + 0.4),
        );
        ctx.stroke();

        // Label
        ctx.fillStyle = "rgba(255,160,0,0.9)";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(`axis ${curveAngle}°`, cmCx + 8, cmCy - 8);
        ctx.restore();
      }
    }

    // Draw polygon outline
    if (outlinePoints.length > 0) {
      ctx.beginPath();
      const first = toCanvas(outlinePoints[0]);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < outlinePoints.length; i++) {
        const p = toCanvas(outlinePoints[i]);
        ctx.lineTo(p.x, p.y);
      }
      if (outlineClosed) {
        ctx.closePath();
        ctx.fillStyle = OUTLINE_FILL;
        ctx.fill();
      }
      ctx.strokeStyle = OUTLINE_COLOUR;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw vertices
      for (let i = 0; i < outlinePoints.length; i++) {
        const p = toCanvas(outlinePoints[i]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, VERTEX_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = VERTEX_FILL;
        ctx.fill();
        ctx.strokeStyle = OUTLINE_COLOUR;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [outlinePoints, outlineClosed, curveAngle, toCanvas]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // ── outline mode handlers ──────────────────────────────────

  const findNearVertex = useCallback(
    (norm: Point2D): number | null => {
      const cnv = displayCanvasRef.current;
      if (!cnv) return null;
      for (let i = 0; i < outlinePoints.length; i++) {
        const vx = outlinePoints[i].x * cnv.getBoundingClientRect().width;
        const vy = outlinePoints[i].y * cnv.getBoundingClientRect().height;
        const mx = norm.x * cnv.getBoundingClientRect().width;
        const my = norm.y * cnv.getBoundingClientRect().height;
        if (Math.hypot(vx - mx, vy - my) < CLOSE_RADIUS_PX) return i;
      }
      return null;
    },
    [outlinePoints],
  );

  const pushOutlineUndo = useCallback(() => {
    outlineUndoRef.current.push({
      pts: [...outlinePoints],
      closed: outlineClosed,
    });
    if (outlineUndoRef.current.length > 50) outlineUndoRef.current.shift();
    outlineRedoRef.current = [];
  }, [outlinePoints, outlineClosed]);

  const handleOutlinePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      const norm = toNorm(e);
      if (!norm) return;

      // If polygon is closed, try drag
      if (outlineClosed) {
        const idx = findNearVertex(norm);
        if (idx !== null) {
          pushOutlineUndo();
          dragIdxRef.current = idx;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }
        return;
      }

      pushOutlineUndo();

      // If near first vertex → close
      if (outlinePoints.length >= 3) {
        const idx = findNearVertex(norm);
        if (idx === 0) {
          setOutlineClosed(true);
          return;
        }
      }

      // Add new vertex
      setOutlinePoints((prev) => [...prev, norm]);
    },
    [toNorm, outlineClosed, outlinePoints, findNearVertex, pushOutlineUndo],
  );

  const handleOutlinePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (dragIdxRef.current === null) return;
      const norm = toNorm(e);
      if (!norm) return;
      setOutlinePoints((prev) => {
        const copy = [...prev];
        copy[dragIdxRef.current!] = norm;
        return copy;
      });
    },
    [toNorm],
  );

  const handleOutlinePointerUp = useCallback(() => {
    dragIdxRef.current = null;
  }, []);

  const handleOutlineDoubleClick = useCallback(() => {
    if (outlinePoints.length >= 3 && !outlineClosed) {
      pushOutlineUndo();
      setOutlineClosed(true);
    }
  }, [outlinePoints, outlineClosed, pushOutlineUndo]);

  // ── highlight mode handlers ────────────────────────────────

  const paintAt = useCallback(
    (normX: number, normY: number) => {
      const mask = maskCanvasRef.current;
      if (!mask) return;
      const mctx = mask.getContext("2d")!;
      const px = normX * mask.width;
      const py = normY * mask.height;

      const dpr = window.devicePixelRatio || 1;
      const cnv = displayCanvasRef.current;
      const scaledBrush = cnv
        ? (brushSize / cnv.getBoundingClientRect().width) * mask.width
        : brushSize * dpr;

      mctx.globalCompositeOperation =
        brushMode === "add" ? "source-over" : "destination-out";
      mctx.fillStyle = "#fff";
      mctx.beginPath();
      mctx.arc(px, py, scaledBrush / 2, 0, Math.PI * 2);
      mctx.fill();
      mctx.globalCompositeOperation = "source-over";
    },
    [brushSize, brushMode],
  );

  const interpolatePaint = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const cnv = displayCanvasRef.current;
      if (!cnv) return;
      const distPx = Math.hypot(
        (to.x - from.x) * cnv.getBoundingClientRect().width,
        (to.y - from.y) * cnv.getBoundingClientRect().height,
      );
      const steps = Math.max(1, Math.ceil(distPx / (brushSize * 0.3)));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        paintAt(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
      }
    },
    [paintAt, brushSize],
  );

  const handleHighlightPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      const norm = toNorm(e);
      if (!norm) return;

      // Save mask snapshot for undo before this stroke
      const mask = maskCanvasRef.current;
      if (mask) {
        const mctx = mask.getContext("2d")!;
        const snapshot = mctx.getImageData(0, 0, mask.width, mask.height);
        undoStackRef.current.push(snapshot);
        // Cap undo stack at 30 to avoid memory issues
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();
        // New stroke invalidates redo history
        redoStackRef.current = [];
      }

      paintingRef.current = true;
      lastPaintPt.current = norm;
      paintAt(norm.x, norm.y);
      redraw();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [toNorm, paintAt, redraw],
  );

  const handleHighlightPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!paintingRef.current) return;
      const norm = toNorm(e);
      if (!norm) return;
      if (lastPaintPt.current) {
        interpolatePaint(lastPaintPt.current, norm);
      } else {
        paintAt(norm.x, norm.y);
      }
      lastPaintPt.current = norm;
      redraw();
    },
    [toNorm, paintAt, interpolatePaint, redraw],
  );

  const handleHighlightPointerUp = useCallback(() => {
    paintingRef.current = false;
    lastPaintPt.current = null;
  }, []);

  // ── curve mode handlers (mirrors highlight but targets curveMask) ──

  const curvePaintAt = useCallback(
    (normX: number, normY: number) => {
      const mask = curveMaskCanvasRef.current;
      if (!mask) return;
      const mctx = mask.getContext("2d")!;
      const px = normX * mask.width;
      const py = normY * mask.height;

      const cnv = displayCanvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      const scaledBrush = cnv
        ? (brushSize / cnv.getBoundingClientRect().width) * mask.width
        : brushSize * dpr;

      mctx.globalCompositeOperation =
        brushMode === "add" ? "source-over" : "destination-out";
      // Grayscale value encodes curvature: 1% → ~3, 100% → 255
      const curvValue = Math.round(curvaturePercent * 2.55);
      mctx.fillStyle = `rgb(${curvValue},${curvValue},${curvValue})`;
      mctx.beginPath();
      mctx.arc(px, py, scaledBrush / 2, 0, Math.PI * 2);
      mctx.fill();
      mctx.globalCompositeOperation = "source-over";
    },
    [brushSize, brushMode, curvaturePercent],
  );

  const curveInterpolatePaint = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const cnv = displayCanvasRef.current;
      if (!cnv) return;
      const distPx = Math.hypot(
        (to.x - from.x) * cnv.getBoundingClientRect().width,
        (to.y - from.y) * cnv.getBoundingClientRect().height,
      );
      const steps = Math.max(1, Math.ceil(distPx / (brushSize * 0.3)));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        curvePaintAt(
          from.x + (to.x - from.x) * t,
          from.y + (to.y - from.y) * t,
        );
      }
    },
    [curvePaintAt, brushSize],
  );

  const handleCurvePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      const norm = toNorm(e);
      if (!norm) return;

      const mask = curveMaskCanvasRef.current;
      if (mask) {
        const mctx = mask.getContext("2d")!;
        const snapshot = mctx.getImageData(0, 0, mask.width, mask.height);
        curveUndoStackRef.current.push(snapshot);
        if (curveUndoStackRef.current.length > 30)
          curveUndoStackRef.current.shift();
        curveRedoStackRef.current = [];
      }

      paintingRef.current = true;
      lastPaintPt.current = norm;
      curvePaintAt(norm.x, norm.y);
      redraw();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [toNorm, curvePaintAt, redraw],
  );

  const handleCurvePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!paintingRef.current) return;
      const norm = toNorm(e);
      if (!norm) return;
      if (lastPaintPt.current) {
        curveInterpolatePaint(lastPaintPt.current, norm);
      } else {
        curvePaintAt(norm.x, norm.y);
      }
      lastPaintPt.current = norm;
      redraw();
    },
    [toNorm, curvePaintAt, curveInterpolatePaint, redraw],
  );

  const handleCurvePointerUp = useCallback(() => {
    paintingRef.current = false;
    lastPaintPt.current = null;
  }, []);

  // ── confirm / reset ────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    const mask = maskCanvasRef.current;

    // Check if mask has any painted pixels
    let hasMask = false;
    if (mask) {
      const mctx = mask.getContext("2d")!;
      const d = mctx.getImageData(0, 0, mask.width, mask.height).data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 128) {
          hasMask = true;
          break;
        }
      }
    }

    // Check if curve mask has painted pixels
    const curveMask = curveMaskCanvasRef.current;
    let hasCurveMask = false;
    if (curveMask) {
      const cctx = curveMask.getContext("2d")!;
      const cd = cctx.getImageData(
        0,
        0,
        curveMask.width,
        curveMask.height,
      ).data;
      for (let i = 0; i < cd.length; i += 4) {
        if (cd[i] > 2) {
          hasCurveMask = true;
          break;
        }
      }
    }

    const result: RegionEditorResult = {
      limbOutline:
        outlineClosed && outlinePoints.length >= 3
          ? { points: outlinePoints }
          : null,
      tattooHighlight:
        hasMask && mask
          ? {
              maskBase64: mask.toDataURL("image/png").split(",")[1],
              width: mask.width,
              height: mask.height,
            }
          : null,
      curveHighlight:
        hasCurveMask && curveMask
          ? {
              maskBase64: curveMask.toDataURL("image/png").split(",")[1],
              width: curveMask.width,
              height: curveMask.height,
              curvaturePercent,
              angleDeg: curveAngle,
            }
          : null,
    };
    onConfirm(result);
  }, [outlinePoints, outlineClosed, curvaturePercent, curveAngle, onConfirm]);

  const resetOutline = useCallback(() => {
    pushOutlineUndo();
    setOutlinePoints([]);
    setOutlineClosed(false);
  }, [pushOutlineUndo]);

  const undoOutline = useCallback(() => {
    if (outlineUndoRef.current.length === 0) return;
    outlineRedoRef.current.push({
      pts: [...outlinePoints],
      closed: outlineClosed,
    });
    const prev = outlineUndoRef.current.pop()!;
    setOutlinePoints(prev.pts);
    setOutlineClosed(prev.closed);
  }, [outlinePoints, outlineClosed]);

  const redoOutline = useCallback(() => {
    if (outlineRedoRef.current.length === 0) return;
    outlineUndoRef.current.push({
      pts: [...outlinePoints],
      closed: outlineClosed,
    });
    const next = outlineRedoRef.current.pop()!;
    setOutlinePoints(next.pts);
    setOutlineClosed(next.closed);
  }, [outlinePoints, outlineClosed]);

  const resetMask = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (mask) {
      const mctx = mask.getContext("2d")!;
      mctx.fillStyle = "#000";
      mctx.fillRect(0, 0, mask.width, mask.height);
    }
    undoStackRef.current = [];
    redraw();
  }, [redraw]);

  const undoLastStroke = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (!mask || undoStackRef.current.length === 0) return;
    const mctx = mask.getContext("2d")!;
    // Save current state to redo stack before restoring
    redoStackRef.current.push(mctx.getImageData(0, 0, mask.width, mask.height));
    if (redoStackRef.current.length > 30) redoStackRef.current.shift();
    const prev = undoStackRef.current.pop()!;
    mctx.putImageData(prev, 0, 0);
    redraw();
  }, [redraw]);

  const redoLastStroke = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (!mask || redoStackRef.current.length === 0) return;
    const mctx = mask.getContext("2d")!;
    // Save current state to undo stack before restoring
    undoStackRef.current.push(mctx.getImageData(0, 0, mask.width, mask.height));
    if (undoStackRef.current.length > 30) undoStackRef.current.shift();
    const next = redoStackRef.current.pop()!;
    mctx.putImageData(next, 0, 0);
    redraw();
  }, [redraw]);

  const resetCurveMask = useCallback(() => {
    const mask = curveMaskCanvasRef.current;
    if (mask) {
      const mctx = mask.getContext("2d")!;
      mctx.fillStyle = "#000";
      mctx.fillRect(0, 0, mask.width, mask.height);
    }
    curveUndoStackRef.current = [];
    redraw();
  }, [redraw]);

  const undoCurveStroke = useCallback(() => {
    const mask = curveMaskCanvasRef.current;
    if (!mask || curveUndoStackRef.current.length === 0) return;
    const mctx = mask.getContext("2d")!;
    curveRedoStackRef.current.push(
      mctx.getImageData(0, 0, mask.width, mask.height),
    );
    if (curveRedoStackRef.current.length > 30)
      curveRedoStackRef.current.shift();
    const prev = curveUndoStackRef.current.pop()!;
    mctx.putImageData(prev, 0, 0);
    redraw();
  }, [redraw]);

  const redoCurveStroke = useCallback(() => {
    const mask = curveMaskCanvasRef.current;
    if (!mask || curveRedoStackRef.current.length === 0) return;
    const mctx = mask.getContext("2d")!;
    curveUndoStackRef.current.push(
      mctx.getImageData(0, 0, mask.width, mask.height),
    );
    if (curveUndoStackRef.current.length > 30)
      curveUndoStackRef.current.shift();
    const next = curveRedoStackRef.current.pop()!;
    mctx.putImageData(next, 0, 0);
    redraw();
  }, [redraw]);

  // ── preset CRUD ─────────────────────────────────────────────

  const saveCurrentAsPreset = useCallback(() => {
    const mask = maskCanvasRef.current;
    const curveMask = curveMaskCanvasRef.current;

    const hlBase64 = mask ? mask.toDataURL("image/png").split(",")[1] : null;
    const cvBase64 = curveMask
      ? curveMask.toDataURL("image/png").split(",")[1]
      : null;

    const preset: SavedPreset = {
      id: crypto.randomUUID(),
      name: `Preset ${presets.length + 1}`,
      createdAt: Date.now(),
      outlinePoints: [...outlinePoints],
      outlineClosed,
      highlightMaskBase64: hlBase64,
      curveMaskBase64: cvBase64,
      curvaturePercent,
      curveAngle,
    };
    const updated = [...presets, preset];
    setPresets(updated);
    savePresetsToStorage(updated);
  }, [presets, outlinePoints, outlineClosed, curvaturePercent, curveAngle]);

  const loadPreset = useCallback(
    (id: string) => {
      const preset = presets.find((p) => p.id === id);
      if (!preset) return;

      setOutlinePoints(preset.outlinePoints);
      setOutlineClosed(preset.outlineClosed);
      setCurvaturePercent(preset.curvaturePercent);
      setCurveAngle(preset.curveAngle);

      // Restore highlight mask
      const mask = maskCanvasRef.current;
      if (mask) {
        const mctx = mask.getContext("2d")!;
        mctx.fillStyle = "#000";
        mctx.fillRect(0, 0, mask.width, mask.height);
        if (preset.highlightMaskBase64) {
          const img = new Image();
          img.onload = () => {
            mctx.drawImage(img, 0, 0, mask.width, mask.height);
            redraw();
          };
          img.src = `data:image/png;base64,${preset.highlightMaskBase64}`;
        }
      }

      // Restore curve mask
      const curveMask = curveMaskCanvasRef.current;
      if (curveMask) {
        const cctx = curveMask.getContext("2d")!;
        cctx.fillStyle = "#000";
        cctx.fillRect(0, 0, curveMask.width, curveMask.height);
        if (preset.curveMaskBase64) {
          const img2 = new Image();
          img2.onload = () => {
            cctx.drawImage(img2, 0, 0, curveMask.width, curveMask.height);
            redraw();
          };
          img2.src = `data:image/png;base64,${preset.curveMaskBase64}`;
        }
      }

      // Clear undo/redo stacks on load
      undoStackRef.current = [];
      redoStackRef.current = [];
      curveUndoStackRef.current = [];
      curveRedoStackRef.current = [];
      outlineUndoRef.current = [];
      outlineRedoRef.current = [];

      setShowPresetMenu(false);
      redraw();
    },
    [presets, redraw],
  );

  const renamePreset = useCallback(
    (id: string, name: string) => {
      const updated = presets.map((p) => (p.id === id ? { ...p, name } : p));
      setPresets(updated);
      savePresetsToStorage(updated);
      setEditingPresetId(null);
    },
    [presets],
  );

  const deletePreset = useCallback(
    (id: string) => {
      const updated = presets.filter((p) => p.id !== id);
      setPresets(updated);
      savePresetsToStorage(updated);
    },
    [presets],
  );

  // ── render ─────────────────────────────────────────────────

  const isOutline = mode === "outline";
  const isHighlight = mode === "highlight";
  const isCurves = mode === "curves";
  const canConfirm =
    (outlineClosed && outlinePoints.length >= 3) ||
    maskCanvasRef.current !== null;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Help banner ─────────────────────────────────── */}
      {showHelp && (
        <div className="rounded-lg border border-cyan-700/40 bg-cyan-950/40 px-4 py-3 text-sm text-cyan-200">
          <p className="font-semibold mb-1">How to use:</p>
          <ol className="list-decimal list-inside space-y-1 text-cyan-300/90">
            <li>
              <strong>Outline Limb</strong> — click around the limb to create a
              polygon (closes when you click near the first point or
              double-click). This helps the algorithm correct for curvature.
            </li>
            <li>
              <strong>Highlight Tattoo</strong> — paint over the tattoo with the
              brush. This tells the algorithm exactly where the ink is and
              dramatically improves results.
            </li>
            <li>
              <strong>Mark Curves</strong> — paint over areas that wrap around a
              curved surface (e.g. an arm or leg) and set the curvature %. The
              algorithm will flatten those areas.
            </li>
            <li>
              Click <strong>Confirm</strong> when done, or <strong>Skip</strong>{" "}
              to let the algorithm auto-detect.
            </li>
          </ol>
          <button
            onClick={() => setShowHelp(false)}
            className="mt-2 text-xs text-cyan-400 underline"
          >
            Hide help
          </button>
        </div>
      )}

      {/* ── Tab buttons ─────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("outline")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            isOutline
              ? "bg-cyan-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          <PenTool size={14} /> Outline Limb
        </button>
        <button
          onClick={() => setMode("highlight")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            isHighlight
              ? "bg-rose-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          <Paintbrush size={14} /> Highlight Tattoo
        </button>
        <button
          onClick={() => setMode("curves")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            isCurves
              ? "bg-yellow-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          <Waves size={14} /> Mark Curves
        </button>

        <div className="ml-auto flex gap-2">
          {/* Preset dropdown */}
          <div className="relative" ref={presetMenuRef}>
            <button
              onClick={() => setShowPresetMenu((v) => !v)}
              className="flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
              title="Saved presets"
            >
              <Save size={14} /> Presets <ChevronDown size={12} />
            </button>
            {showPresetMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
                <button
                  onClick={saveCurrentAsPreset}
                  className="mb-2 flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium text-emerald-400 hover:bg-zinc-800"
                >
                  <Save size={12} /> Save current as preset
                </button>
                {presets.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-zinc-500">
                    No saved presets yet
                  </p>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {presets.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-zinc-800"
                      >
                        {editingPresetId === p.id ? (
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => renamePreset(p.id, editingName)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                renamePreset(p.id, editingName);
                              if (e.key === "Escape") setEditingPresetId(null);
                            }}
                            className="flex-1 rounded bg-zinc-800 px-1 py-0.5 text-xs text-zinc-200 outline-none ring-1 ring-cyan-600"
                          />
                        ) : (
                          <button
                            onClick={() => loadPreset(p.id)}
                            className="flex-1 truncate text-left text-zinc-300 hover:text-white"
                            title="Load this preset"
                          >
                            {p.name}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingPresetId(p.id);
                            setEditingName(p.name);
                          }}
                          className="p-0.5 text-zinc-500 hover:text-zinc-300"
                          title="Rename"
                        >
                          <Pencil size={10} />
                        </button>
                        <button
                          onClick={() => deletePreset(p.id)}
                          className="p-0.5 text-zinc-500 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {!showHelp && (
            <button
              onClick={() => setShowHelp(true)}
              className="rounded-md bg-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-700"
              title="Show help"
            >
              <HelpCircle size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Brush controls (highlight / curves modes) ──── */}
      {isHighlight && (
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <button
            onClick={() => setBrushMode(brushMode === "add" ? "erase" : "add")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
              brushMode === "add"
                ? "bg-rose-700 text-white"
                : "bg-amber-700 text-white"
            }`}
          >
            {brushMode === "add" ? (
              <>
                <Paintbrush size={12} /> Paint
              </>
            ) : (
              <>
                <Eraser size={12} /> Erase
              </>
            )}
          </button>
          <label className="flex items-center gap-1.5">
            Size
            <input
              type="range"
              min={MIN_BRUSH}
              max={MAX_BRUSH}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-24 accent-rose-500"
            />
            <span className="w-6 text-right text-xs text-zinc-500">
              {brushSize}
            </span>
          </label>
          <button
            onClick={resetMask}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            <RotateCcw size={12} /> Clear mask
          </button>
          <button
            onClick={undoLastStroke}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            <Undo2 size={12} /> Undo
          </button>
          <button
            onClick={redoLastStroke}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            <Redo2 size={12} /> Redo
          </button>
        </div>
      )}

      {isCurves && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <button
              onClick={() =>
                setBrushMode(brushMode === "add" ? "erase" : "add")
              }
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                brushMode === "add"
                  ? "bg-yellow-700 text-white"
                  : "bg-amber-700 text-white"
              }`}
            >
              {brushMode === "add" ? (
                <>
                  <Paintbrush size={12} /> Paint
                </>
              ) : (
                <>
                  <Eraser size={12} /> Erase
                </>
              )}
            </button>
            <label className="flex items-center gap-1.5">
              Size
              <input
                type="range"
                min={MIN_BRUSH}
                max={MAX_BRUSH}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-24 accent-yellow-500"
              />
              <span className="w-6 text-right text-xs text-zinc-500">
                {brushSize}
              </span>
            </label>
            <button
              onClick={resetCurveMask}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
            >
              <RotateCcw size={12} /> Clear
            </button>
            <button
              onClick={undoCurveStroke}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
            >
              <Undo2 size={12} /> Undo
            </button>
            <button
              onClick={redoCurveStroke}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
            >
              <Redo2 size={12} /> Redo
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <label className="flex items-center gap-1.5">
              Stroke&nbsp;curve&nbsp;%
              <input
                type="range"
                min={1}
                max={100}
                value={curvaturePercent}
                onChange={(e) => setCurvaturePercent(Number(e.target.value))}
                className="w-32 accent-yellow-500"
              />
              <input
                type="number"
                min={1}
                max={100}
                value={curvaturePercent}
                onChange={(e) => {
                  const v = Math.max(
                    1,
                    Math.min(100, Number(e.target.value) || 1),
                  );
                  setCurvaturePercent(v);
                }}
                className="w-14 rounded bg-zinc-800 px-1.5 py-0.5 text-center text-xs text-zinc-200"
              />
            </label>
            <span className="text-xs text-zinc-500">
              Set before each stroke — opacity shows intensity
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <label className="flex items-center gap-1.5">
              Axis&nbsp;angle
              <input
                type="range"
                min={0}
                max={359}
                value={curveAngle}
                onChange={(e) => setCurveAngle(Number(e.target.value))}
                className="w-32 accent-orange-500"
              />
              <input
                type="number"
                min={0}
                max={359}
                value={curveAngle}
                onChange={(e) => {
                  const v = (((Number(e.target.value) || 0) % 360) + 360) % 360;
                  setCurveAngle(v);
                }}
                className="w-14 rounded bg-zinc-800 px-1.5 py-0.5 text-center text-xs text-zinc-200"
              />
              <span className="text-xs text-zinc-600">°</span>
            </label>
            <div className="flex gap-1">
              {[
                { label: "↔", deg: 0 },
                { label: "↗", deg: 45 },
                { label: "↕", deg: 90 },
                { label: "↘", deg: 135 },
              ].map((p) => (
                <button
                  key={p.deg}
                  onClick={() => setCurveAngle(p.deg)}
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    curveAngle === p.deg
                      ? "bg-orange-700 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                  title={`${p.deg}°`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-zinc-500">
              Direction the limb runs
            </span>
          </div>
        </div>
      )}

      {/* ── Status bar (outline mode) ───────────────────── */}
      {isOutline && (
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          {outlineClosed ? (
            <span className="text-cyan-400">
              ✓ Polygon closed ({outlinePoints.length} points) — drag vertices
              to adjust
            </span>
          ) : (
            <span className="text-zinc-400">
              Click to place vertices ({outlinePoints.length} placed
              {outlinePoints.length >= 3
                ? " — click near first point to close"
                : ""}
              )
            </span>
          )}
          <button
            onClick={resetOutline}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            <RotateCcw size={12} /> Reset outline
          </button>
          <button
            onClick={undoOutline}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            <Undo2 size={12} /> Undo
          </button>
          <button
            onClick={redoOutline}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            <Redo2 size={12} /> Redo
          </button>
        </div>
      )}

      {/* ── Canvas container ────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg border border-zinc-700"
        style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt="Uploaded"
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
        <canvas
          ref={displayCanvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{
            cursor: isOutline ? (outlineClosed ? "grab" : "crosshair") : "none",
          }}
          onPointerDown={
            isOutline
              ? handleOutlinePointerDown
              : isCurves
                ? handleCurvePointerDown
                : handleHighlightPointerDown
          }
          onPointerMove={(e) => {
            if (isOutline) {
              handleOutlinePointerMove(e);
            } else {
              if (isCurves) {
                handleCurvePointerMove(e);
              } else {
                handleHighlightPointerMove(e);
              }
              // Custom cursor circle for brush
              const cnv = displayCanvasRef.current;
              if (cnv) {
                const ctx = cnv.getContext("2d");
                if (ctx) {
                  redraw();
                  const norm = toNorm(e);
                  if (norm) {
                    const p = toCanvas(norm);
                    const dpr = window.devicePixelRatio || 1;
                    const r = cnv.getBoundingClientRect();
                    const scaledBrush = (brushSize / r.width) * cnv.width;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, scaledBrush / 2, 0, Math.PI * 2);
                    ctx.strokeStyle = isCurves
                      ? brushMode === "add"
                        ? "rgba(255,220,30,0.8)"
                        : "rgba(255,200,50,0.8)"
                      : brushMode === "add"
                        ? "rgba(255,80,80,0.8)"
                        : "rgba(255,200,50,0.8)";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                  }
                }
              }
            }
          }}
          onPointerUp={
            isOutline
              ? handleOutlinePointerUp
              : isCurves
                ? handleCurvePointerUp
                : handleHighlightPointerUp
          }
          onDoubleClick={isOutline ? handleOutlineDoubleClick : undefined}
        />
      </div>

      {/* ── Action buttons ──────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleConfirm}
          className="flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
        >
          <Check size={16} /> Confirm &amp; Generate
        </button>
        <button
          onClick={onSkip}
          className="flex items-center gap-1.5 rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-600 transition-colors"
        >
          <SkipForward size={16} /> Skip (auto-detect)
        </button>
      </div>
    </div>
  );
}
