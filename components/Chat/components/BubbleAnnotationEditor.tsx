"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AnnotationStroke,
  AnnotationTextBox,
  BubbleAnnotations,
} from "../types";

// ── Rainbow-sorted color palette ─────────────────────────────────
const DRAW_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ffffff", // white
  "#000000", // black
];

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

/** Adjust the lightness of a hex color. lightness 0-100, 50 = original. */
function adjustHexLightness(hex: string, lightness: number): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  l = lightness / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

type Mode = "draw" | "text" | null;

type Props = {
  /** The message bubble element to annotate */
  bubbleRef: HTMLDivElement;
  existing?: BubbleAnnotations | null;
  onSave: (data: BubbleAnnotations) => void;
  onClose: () => void;
};

export function BubbleAnnotationEditor({
  bubbleRef,
  existing,
  onSave,
  onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>("draw");
  const [color, setColor] = useState(DRAW_COLORS[0]);
  const [strokes, setStrokes] = useState<AnnotationStroke[]>(
    existing?.strokes ?? [],
  );
  const [textBoxes, setTextBoxes] = useState<AnnotationTextBox[]>(
    existing?.textBoxes ?? [],
  );
  const [lineWidth, setLineWidth] = useState(3);

  // z-order counter for interleaved layering of strokes & text boxes
  const zNextRef = useRef(
    (() => {
      const allZ = [
        ...(existing?.strokes ?? []).map((s) => s.zOrder ?? 0),
        ...(existing?.textBoxes ?? []).map((t) => t.zOrder ?? 0),
      ];
      return allZ.length > 0 ? Math.max(...allZ) + 1 : 1;
    })(),
  );
  const nextZ = useCallback(() => zNextRef.current++, []);

  // Text box being created/edited
  const [editingTextIdx, setEditingTextIdx] = useState<number | null>(null);
  const [showTextConfig, setShowTextConfig] = useState(false);

  // Canvas for drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Track drawing state
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);

  // ── Fullscreen mode ──────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isFullscreenRef = useRef(false);
  const bubbleCloneRef = useRef<HTMLDivElement | null>(null);
  const [fsTransform, setFsTransform] = useState({
    scale: 1,
    tx: 0,
    ty: 0,
    rotation: 0,
  });
  const fsTransformRef = useRef({ scale: 1, tx: 0, ty: 0, rotation: 0 });
  const isPinchingRef = useRef(false);
  const pinchRef = useRef<{
    startDist: number;
    startAngle: number;
    startScale: number;
    startRot: number;
    startTx: number;
    startTy: number;
    midX: number;
    midY: number;
  } | null>(null);
  const isSpaceDownRef = useRef(false);
  const isFsPanningRef = useRef(false);

  // Bubble dimensions – keep in sync with the actual element
  const [bubbleRect, setBubbleRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const syncOverlay = () => {
      const rect = bubbleRef.getBoundingClientRect();
      setBubbleRect(rect);
      if (isFullscreenRef.current) return;
      // Directly sync overlay position to avoid React state delay
      // The -8 corrects for a persistent offset between the overlay
      // and the actual bubble (caused by the bubble's py-2 padding
      // interaction with the fixed positioning context).
      const el = overlayRef.current;
      if (el) {
        el.style.top = `${rect.top - 8}px`;
        el.style.left = `${rect.left}px`;
        el.style.width = `${rect.width}px`;
        el.style.height = `${rect.height}px`;
      }
    };
    syncOverlay();

    // Re-read on resize / scroll so the overlay stays locked to the bubble
    const ro = new ResizeObserver(syncOverlay);
    ro.observe(bubbleRef);

    // Scroll anywhere in the ancestor chain can move the bubble
    const scrollParents: (HTMLElement | Window)[] = [window];
    let el: HTMLElement | null = bubbleRef.parentElement;
    while (el) {
      if (
        el.scrollHeight > el.clientHeight ||
        el.scrollWidth > el.clientWidth
      ) {
        scrollParents.push(el);
      }
      el = el.parentElement;
    }
    for (const sp of scrollParents)
      sp.addEventListener("scroll", syncOverlay, { passive: true });

    return () => {
      ro.disconnect();
      for (const sp of scrollParents)
        sp.removeEventListener("scroll", syncOverlay);
    };
  }, [bubbleRef]);

  // Resize canvas to match bubble (tracks bubbleRect changes as trigger)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bubbleRect) return;
    const w = bubbleRef.offsetWidth;
    const h = bubbleRef.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    redrawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubbleRect]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = bubbleRef.offsetWidth;
    const h = bubbleRef.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // Only draw the active (in-progress) stroke on canvas;
    // completed strokes are rendered as SVG elements.
    ctx.restore();
  }, [bubbleRef]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // ── Drawing handlers (touch + mouse) ───────────────────────────
  const getRelPos = useCallback(
    (clientX: number, clientY: number) => {
      if (isFullscreenRef.current) {
        const t = fsTransformRef.current;
        const bw = bubbleRef.offsetWidth;
        const bh = bubbleRef.offsetHeight;
        const a = (clientX - t.tx - window.innerWidth / 2) / t.scale;
        const b = (clientY - t.ty - window.innerHeight / 2) / t.scale;
        const rad = (t.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const x = cos * a + sin * b + bw / 2;
        const y = -sin * a + cos * b + bh / 2;
        return {
          x: Math.max(0, Math.min(1, x / bw)),
          y: Math.max(0, Math.min(1, y / bh)),
        };
      }
      const r = bubbleRef.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1, (clientX - r.left) / r.width)),
        y: Math.max(0, Math.min(1, (clientY - r.top) / r.height)),
      };
    },
    [bubbleRef],
  );

  const startDraw = useCallback(
    (clientX: number, clientY: number) => {
      if (mode !== "draw") return;
      isDrawingRef.current = true;
      currentPointsRef.current = [getRelPos(clientX, clientY)];
    },
    [mode, getRelPos],
  );

  const moveDraw = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDrawingRef.current || mode !== "draw") return;
      const point = getRelPos(clientX, clientY);
      currentPointsRef.current.push(point);

      // Draw live stroke on canvas
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const cw = bubbleRef.offsetWidth;
      const ch = bubbleRef.offsetHeight;
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pts = currentPointsRef.current;
      if (pts.length >= 2) {
        const prev = pts[pts.length - 2];
        const curr = pts[pts.length - 1];
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(prev.x * cw, prev.y * ch);
        ctx.lineTo(curr.x * cw, curr.y * ch);
        ctx.stroke();
      }
      ctx.restore();
    },
    [mode, getRelPos, color, lineWidth, bubbleRef],
  );

  const endDraw = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const pts = currentPointsRef.current;
    if (pts.length >= 2) {
      setStrokes((prev) => [
        ...prev,
        { points: [...pts], color, width: lineWidth, zOrder: nextZ() },
      ]);
    }
    currentPointsRef.current = [];
    // Clear the active-stroke canvas (the completed stroke is now an SVG)
    redrawCanvas();
  }, [color, lineWidth, nextZ, redrawCanvas]);

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (mode !== "draw" || isPinchingRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const t = e.touches[0];
      startDraw(t.clientX, t.clientY);
    },
    [mode, startDraw],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (mode !== "draw" || isPinchingRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const t = e.touches[0];
      moveDraw(t.clientX, t.clientY);
    },
    [mode, moveDraw],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (mode !== "draw") return;
      e.preventDefault();
      endDraw();
    },
    [mode, endDraw],
  );

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (mode !== "draw" || isFsPanningRef.current || isSpaceDownRef.current)
        return;
      e.preventDefault();
      startDraw(e.clientX, e.clientY);
    },
    [mode, startDraw],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (mode !== "draw") return;
      moveDraw(e.clientX, e.clientY);
    },
    [mode, moveDraw],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (mode !== "draw") return;
      e.preventDefault();
      endDraw();
    },
    [mode, endDraw],
  );

  // ── Text box creation ──────────────────────────────────────────
  const addTextBox = useCallback(() => {
    const newBox: AnnotationTextBox = {
      x: 0.1,
      y: 0.3,
      text: "Text",
      color: color,
      colorLightness: 50,
      fontSize: 14,
      boxWidth: 0.6,
      borderColor: color,
      borderStyle: "solid",
      borderWidth: 1,
      borderRadius: 4,
      bgColor: "#000000",
      bgOpacity: 0,
      rotation: 0,
      zOrder: nextZ(),
    };
    setTextBoxes((prev) => [...prev, newBox]);
    setEditingTextIdx(textBoxes.length);
    setShowTextConfig(true);
    setMode("text");
  }, [color, textBoxes.length, nextZ]);

  // Update a text box field
  const updateTextBox = useCallback(
    (idx: number, updates: Partial<AnnotationTextBox>) => {
      setTextBoxes((prev) =>
        prev.map((box, i) => (i === idx ? { ...box, ...updates } : box)),
      );
    },
    [],
  );

  const deleteTextBox = useCallback((idx: number) => {
    setTextBoxes((prev) => prev.filter((_, i) => i !== idx));
    setEditingTextIdx(null);
    setShowTextConfig(false);
  }, []);

  // ── Draggable text box ─────────────────────────────────────────
  const dragRef = useRef<{
    idx: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const handleTextDragStart = useCallback(
    (idx: number, clientX: number, clientY: number) => {
      const box = textBoxes[idx];
      // If not in text mode, switch to it and just select (no drag)
      if (mode !== "text") {
        setMode("text");
        setEditingTextIdx(idx);
        setShowTextConfig(true);
        // Bump zOrder so moved/selected text box goes on top
        updateTextBox(idx, { zOrder: nextZ() });
        return;
      }
      dragRef.current = {
        idx,
        startX: clientX,
        startY: clientY,
        origX: box.x,
        origY: box.y,
      };
      setEditingTextIdx(idx);
      setShowTextConfig(true);
      // Bump zOrder so dragged text box goes on top
      updateTextBox(idx, { zOrder: nextZ() });
    },
    [mode, textBoxes, nextZ, updateTextBox],
  );

  useEffect(() => {
    if (mode !== "text") return;

    const handleMove = (clientX: number, clientY: number) => {
      const d = dragRef.current;
      if (!d) return;
      let dxPx = clientX - d.startX;
      let dyPx = clientY - d.startY;
      if (isFullscreenRef.current) {
        const t = fsTransformRef.current;
        const rad = (t.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rx = (cos * dxPx + sin * dyPx) / t.scale;
        const ry = (-sin * dxPx + cos * dyPx) / t.scale;
        dxPx = rx;
        dyPx = ry;
      }
      const bw = bubbleRef.offsetWidth;
      const bh = bubbleRef.offsetHeight;
      updateTextBox(d.idx, {
        x: Math.max(0, Math.min(1, d.origX + dxPx / bw)),
        y: Math.max(0, Math.min(1, d.origY + dyPx / bh)),
      });
    };

    const handleEnd = () => {
      dragRef.current = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (dragRef.current) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => handleEnd();
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [mode, updateTextBox, bubbleRef]);

  // ── Undo ───────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (mode === "draw") {
      setStrokes((prev) => prev.slice(0, -1));
    }
  }, [mode]);

  // ── Save ───────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const data: BubbleAnnotations = {};
    if (strokes.length > 0) data.strokes = strokes;
    if (textBoxes.length > 0) data.textBoxes = textBoxes;
    onSave(
      Object.keys(data).length > 0 ? data : { strokes: [], textBoxes: [] },
    );
    onClose();
  }, [strokes, textBoxes, onSave, onClose]);

  // ── Clear all ──────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setStrokes([]);
    setTextBoxes([]);
    setEditingTextIdx(null);
    setShowTextConfig(false);
    onSave({ strokes: [], textBoxes: [] });
    onClose();
  }, [onSave, onClose]);

  // ── Fullscreen toggle ──────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const entering = !isFullscreenRef.current;
    isFullscreenRef.current = entering;
    if (entering) {
      // Clone the bubble DOM node for pixel-perfect background
      const clone = bubbleRef.cloneNode(true) as HTMLDivElement;
      clone.style.position = "absolute";
      clone.style.top = "0";
      clone.style.left = "0";
      clone.style.width = `${bubbleRef.offsetWidth}px`;
      clone.style.height = `${bubbleRef.offsetHeight}px`;
      clone.style.pointerEvents = "none";
      clone.style.margin = "0";
      clone.style.boxSizing = "border-box";
      // Copy computed background since theme classes won't cascade into the clone's detached context
      const cs = getComputedStyle(bubbleRef);
      clone.style.background = cs.background;
      clone.style.color = cs.color;
      bubbleCloneRef.current = clone;
      const bw = bubbleRef.offsetWidth;
      const bh = bubbleRef.offsetHeight;
      const pad = 120;
      const maxW = window.innerWidth - pad * 2;
      const maxH = window.innerHeight - pad * 2;
      const scale = Math.min(maxW / bw, maxH / bh, 4);
      const t = { scale, tx: 0, ty: 0, rotation: 0 };
      fsTransformRef.current = t;
      setFsTransform(t);
    } else {
      bubbleCloneRef.current = null;
      const t = { scale: 1, tx: 0, ty: 0, rotation: 0 };
      fsTransformRef.current = t;
      setFsTransform(t);
    }
    setIsFullscreen(entering);
  }, [bubbleRef]);

  // ── Fullscreen gesture handlers ───────────────────────────────
  useEffect(() => {
    if (!isFullscreen) return;

    // Pinch-to-zoom/rotate/pan (touch)
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        if (isDrawingRef.current) {
          isDrawingRef.current = false;
          currentPointsRef.current = [];
          redrawCanvas();
        }
        isPinchingRef.current = true;
        const [a, b] = [e.touches[0], e.touches[1]];
        const dx = b.clientX - a.clientX;
        const dy = b.clientY - a.clientY;
        const ft = fsTransformRef.current;
        pinchRef.current = {
          startDist: Math.hypot(dx, dy),
          startAngle: Math.atan2(dy, dx),
          startScale: ft.scale,
          startRot: ft.rotation,
          startTx: ft.tx,
          startTy: ft.ty,
          midX: (a.clientX + b.clientX) / 2,
          midY: (a.clientY + b.clientY) / 2,
        };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isPinchingRef.current || e.touches.length < 2) return;
      e.preventDefault();
      const p = pinchRef.current;
      if (!p) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const newScale = Math.max(
        0.3,
        Math.min(10, p.startScale * (dist / p.startDist)),
      );
      const midX = (a.clientX + b.clientX) / 2;
      const midY = (a.clientY + b.clientY) / 2;
      const nt = {
        scale: newScale,
        tx: p.startTx + (midX - p.midX),
        ty: p.startTy + (midY - p.midY),
        rotation: p.startRot + ((angle - p.startAngle) * 180) / Math.PI,
      };
      fsTransformRef.current = nt;
      setFsTransform(nt);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinchingRef.current = false;
        pinchRef.current = null;
      }
    };

    // Wheel zoom / Alt+wheel rotate (desktop)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const ft = fsTransformRef.current;
      if (e.altKey) {
        const nt = {
          ...ft,
          rotation: ft.rotation + (e.deltaY > 0 ? -3 : 3),
        };
        fsTransformRef.current = nt;
        setFsTransform(nt);
        return;
      }
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const newScale = Math.max(0.3, Math.min(10, ft.scale * factor));
      const vcx = window.innerWidth / 2;
      const vcy = window.innerHeight / 2;
      const ratio = newScale / ft.scale;
      const nt = {
        scale: newScale,
        tx: (e.clientX - vcx) * (1 - ratio) + ft.tx * ratio,
        ty: (e.clientY - vcy) * (1 - ratio) + ft.ty * ratio,
        rotation: ft.rotation,
      };
      fsTransformRef.current = nt;
      setFsTransform(nt);
    };

    // Space + drag for pan (desktop)
    let panStart = { x: 0, y: 0, tx: 0, ty: 0 };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        isSpaceDownRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceDownRef.current = false;
        isFsPanningRef.current = false;
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && isSpaceDownRef.current)) {
        e.preventDefault();
        isFsPanningRef.current = true;
        const ft = fsTransformRef.current;
        panStart = { x: e.clientX, y: e.clientY, tx: ft.tx, ty: ft.ty };
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isFsPanningRef.current) return;
      const nt = {
        ...fsTransformRef.current,
        tx: panStart.tx + (e.clientX - panStart.x),
        ty: panStart.ty + (e.clientY - panStart.y),
      };
      fsTransformRef.current = nt;
      setFsTransform(nt);
    };
    const onMouseUp = () => {
      isFsPanningRef.current = false;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isFullscreen, redrawCanvas]);

  if (!bubbleRect) return null;

  const editingBox = editingTextIdx !== null ? textBoxes[editingTextIdx] : null;

  // ── Build sorted layers for interleaved rendering ──────────
  type LayerItem =
    | { kind: "stroke"; stroke: AnnotationStroke; idx: number; z: number }
    | { kind: "textbox"; box: AnnotationTextBox; idx: number; z: number };

  const sortedLayers: LayerItem[] = [
    ...strokes.map((stroke, idx) => ({
      kind: "stroke" as const,
      stroke,
      idx,
      z: stroke.zOrder ?? 0,
    })),
    ...textBoxes.map((box, idx) => ({
      kind: "textbox" as const,
      box,
      idx,
      z: box.zOrder ?? 0,
    })),
  ].sort((a, b) => a.z - b.z);

  // ── Viewport-safe panel positions ──────────────────────────
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const PAD = 8;

  // Toolbar (above bubble if room, else pushed down but still in viewport)
  const TOOLBAR_H = 52;
  const TOOLBAR_W = 330; // intrinsic width of toolbar buttons
  // Let toolbar use its intrinsic width; just clamp to viewport
  const toolbarTop = isFullscreen
    ? PAD
    : Math.max(PAD, Math.min(bubbleRect.top - TOOLBAR_H, vh - TOOLBAR_H - PAD));
  const bubbleCenterX = bubbleRect.left + bubbleRect.width / 2;
  const toolbarLeft = isFullscreen
    ? Math.max(PAD, (vw - TOOLBAR_W) / 2)
    : Math.max(
        PAD,
        Math.min(bubbleCenterX - TOOLBAR_W / 2, vw - TOOLBAR_W - PAD),
      );

  // Bottom panel (below bubble, scrollable if tight on space)
  const BP_MIN_W = 300;
  const bpWidth = Math.min(Math.max(bubbleRect.width, BP_MIN_W), vw - PAD * 2);
  const bpLeft = isFullscreen
    ? Math.max(PAD, (vw - bpWidth) / 2)
    : Math.max(PAD, Math.min(bubbleCenterX - bpWidth / 2, vw - bpWidth - PAD));
  const spaceBelow = vh - bubbleRect.bottom - PAD;
  const spaceAbove = bubbleRect.top - TOOLBAR_H - PAD * 2;
  const placeBelow = spaceBelow >= 120;
  const bpTop = isFullscreen
    ? vh - Math.min(280, vh * 0.35) - PAD
    : placeBelow
      ? bubbleRect.bottom + PAD
      : Math.max(PAD, toolbarTop - Math.min(spaceAbove, 400) - PAD);
  const bpMaxH = isFullscreen
    ? Math.min(280, vh * 0.35)
    : placeBelow
      ? vh - bpTop - PAD
      : Math.min(spaceAbove, toolbarTop - PAD - bpTop);

  return (
    <div
      className={`fixed inset-0 z-[400] ${isFullscreen ? "" : "pointer-events-none"}`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 pointer-events-none ${isFullscreen ? "bg-black" : "bg-black/50"}`}
      />

      {/* Transform wrapper (fullscreen: centered + scaled; normal: passthrough) */}
      <div
        style={
          isFullscreen
            ? {
                position: "absolute" as const,
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${fsTransform.tx}px, ${fsTransform.ty}px) scale(${fsTransform.scale}) rotate(${fsTransform.rotation}deg)`,
                transformOrigin: "center center",
                width: bubbleRef.offsetWidth,
                height: bubbleRef.offsetHeight,
                pointerEvents: "auto" as const,
              }
            : undefined
        }
      >
        {/* Annotation overlay */}
        <div
          ref={overlayRef}
          className={isFullscreen ? "relative" : "absolute"}
          style={
            isFullscreen
              ? {
                  width: "100%",
                  height: "100%",
                  borderRadius: "1rem",
                  overflow: "hidden",
                }
              : {
                  top: bubbleRect.top - 8,
                  left: bubbleRect.left,
                  width: bubbleRect.width,
                  height: bubbleRect.height,
                  borderRadius: "1rem",
                  overflow: "hidden",
                  zIndex: 0,
                  pointerEvents: "auto" as const,
                }
          }
          onClick={(e) => e.stopPropagation()}
        >
          {/* Bubble content clone (fullscreen only) */}
          {isFullscreen && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: -1, borderRadius: "1rem" }}
              ref={(el) => {
                if (el && bubbleCloneRef.current) {
                  el.innerHTML = "";
                  el.appendChild(bubbleCloneRef.current);
                }
              }}
            />
          )}
          {/* Interleaved layers: strokes (SVG) and text boxes sorted by zOrder */}
          {sortedLayers.map((layer) => {
            if (layer.kind === "stroke") {
              const stroke = layer.stroke;
              if (stroke.points.length < 2) return null;
              const bw = bubbleRef.offsetWidth;
              const bh = bubbleRef.offsetHeight;
              const d = stroke.points
                .map((p, pi) =>
                  pi === 0
                    ? `M${p.x * bw} ${p.y * bh}`
                    : `L${p.x * bw} ${p.y * bh}`,
                )
                .join(" ");
              return (
                <svg
                  key={`s-${layer.idx}`}
                  className="absolute inset-0 pointer-events-none"
                  viewBox={`0 0 ${bw} ${bh}`}
                  style={{ zIndex: layer.z }}
                >
                  <path
                    d={d}
                    fill="none"
                    stroke={stroke.color}
                    strokeWidth={stroke.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              );
            }
            // Text box
            const box = layer.box;
            const idx = layer.idx;
            return (
              <div
                key={`t-${idx}`}
                className="absolute"
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.boxWidth * 100}%`,
                  transform: box.rotation
                    ? `rotate(${box.rotation}deg)`
                    : undefined,
                  cursor: mode === "text" ? "move" : "pointer",
                  touchAction: "none",
                  pointerEvents: mode === "draw" ? "none" : "auto",
                  zIndex: layer.z,
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleTextDragStart(
                    idx,
                    e.touches[0].clientX,
                    e.touches[0].clientY,
                  );
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleTextDragStart(idx, e.clientX, e.clientY);
                }}
              >
                <div
                  style={{
                    color: adjustHexLightness(box.color, box.colorLightness),
                    fontSize: `${box.fontSize}px`,
                    lineHeight: 1.3,
                    borderColor:
                      box.borderStyle === "none"
                        ? "transparent"
                        : box.borderColor,
                    borderStyle:
                      box.borderStyle === "none" ? "none" : box.borderStyle,
                    borderWidth:
                      box.borderStyle === "none" ? 0 : `${box.borderWidth}px`,
                    borderRadius: `${box.borderRadius}px`,
                    backgroundColor: hexToRgba(box.bgColor, box.bgOpacity),
                    padding: "2px 4px",
                    wordBreak: "break-word",
                    userSelect: "none",
                  }}
                  className={
                    editingTextIdx === idx
                      ? "ring-1 ring-white/50 ring-dashed"
                      : ""
                  }
                >
                  {box.text}
                </div>
              </div>
            );
          })}

          {/* Active-drawing canvas — on top only in draw mode */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{
              touchAction: "none",
              cursor: mode === "draw" ? "crosshair" : "default",
              zIndex: 999999,
              pointerEvents: mode === "draw" ? "auto" : "none",
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />

          {/* Dashed border highlighting the editable region */}
          <div
            className="absolute inset-0 border-2 border-dashed border-white/40 rounded-2xl pointer-events-none"
            style={{ zIndex: 1000000 }}
          />
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div
        className="absolute z-[401] flex flex-col gap-2 items-center pointer-events-auto"
        style={{
          top: toolbarTop,
          left: toolbarLeft,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mode tabs + actions */}
        <div className="flex items-center gap-1.5 bg-neutral-900/95 backdrop-blur-md rounded-xl border border-white/10 px-2 py-1.5 shadow-xl whitespace-nowrap">
          {/* Draw mode */}
          <button
            type="button"
            onClick={() => {
              setMode("draw");
              setShowTextConfig(false);
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              mode === "draw"
                ? "bg-white/20 text-white"
                : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
            title="Draw"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>

          {/* Text mode */}
          <button
            type="button"
            onClick={() => {
              setMode("text");
              addTextBox();
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              mode === "text"
                ? "bg-white/20 text-white"
                : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
            title="Add text"
          >
            <span className="text-sm font-bold" style={{ fontFamily: "serif" }}>
              T
            </span>
          </button>

          <div className="w-px h-5 bg-white/10" />

          {/* Undo */}
          <button
            type="button"
            onClick={handleUndo}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
            title="Undo"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M3 10h10a5 5 0 015 5v2" />
              <polyline points="3 10 7 6" />
              <polyline points="3 10 7 14" />
            </svg>
          </button>

          {/* Clear all */}
          <button
            type="button"
            onClick={handleClear}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-400 hover:bg-white/10 transition-all"
            title="Clear all"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          <div className="w-px h-5 bg-white/10" />

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              {isFullscreen ? (
                <>
                  <polyline points="4 14 4 20 10 20" />
                  <polyline points="20 10 20 4 14 4" />
                  <polyline points="14 20 20 20 20 14" />
                  <polyline points="10 4 4 4 4 10" />
                </>
              ) : (
                <>
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <polyline points="21 15 21 21 15 21" />
                  <polyline points="3 9 3 3 9 3" />
                </>
              )}
            </svg>
          </button>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            className="px-3 h-8 flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-all"
          >
            Save
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
            title="Cancel"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Bottom panel: color picker + line width + text config ── */}
      <div
        className="absolute z-[401] pointer-events-auto"
        style={{
          top: bpTop,
          left: bpLeft,
          width: bpWidth,
          maxHeight: Math.max(bpMaxH, 100),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="bg-neutral-900/95 backdrop-blur-md rounded-xl border border-white/10 px-3 py-2.5 shadow-xl space-y-2.5 overflow-y-auto"
          style={{ maxHeight: Math.max(bpMaxH, 100) }}
        >
          {/* Color dots */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {DRAW_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  if (editingTextIdx !== null) {
                    updateTextBox(editingTextIdx, {
                      color: c,
                      borderColor: c,
                      bgColor: c,
                    });
                  }
                }}
                className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 shrink-0 ${
                  color === c ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            {/* T button to add text */}
            <button
              type="button"
              onClick={() => {
                setMode("text");
                addTextBox();
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-white/20 hover:border-white/50 hover:bg-white/10 transition-all text-neutral-400 hover:text-white shrink-0"
              title="Add text"
            >
              <span
                className="text-xs font-bold"
                style={{ fontFamily: "serif" }}
              >
                T
              </span>
            </button>
          </div>

          {/* Line width when drawing */}
          {mode === "draw" && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-500 shrink-0">
                Size
              </span>
              <input
                type="range"
                min={1}
                max={12}
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="flex-1 h-1 accent-white cursor-pointer"
              />
              <div
                className="rounded-full shrink-0"
                style={{
                  width: lineWidth + 2,
                  height: lineWidth + 2,
                  backgroundColor: color,
                }}
              />
            </div>
          )}

          {/* Text box config panel */}
          {mode === "text" &&
            showTextConfig &&
            editingBox &&
            editingTextIdx !== null && (
              <div className="space-y-2 border-t border-white/10 pt-2">
                {/* Text input */}
                <input
                  type="text"
                  value={editingBox.text}
                  onChange={(e) =>
                    updateTextBox(editingTextIdx, { text: e.target.value })
                  }
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Type text…"
                  className="w-full bg-white/8 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-white/25"
                />

                {/* Font size */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 shrink-0">
                    Font
                  </span>
                  <input
                    type="range"
                    min={8}
                    max={32}
                    value={editingBox.fontSize}
                    onChange={(e) =>
                      updateTextBox(editingTextIdx, {
                        fontSize: Number(e.target.value),
                      })
                    }
                    className="flex-1 h-1 accent-white cursor-pointer"
                  />
                  <span className="text-[10px] text-neutral-400 w-5 text-right">
                    {editingBox.fontSize}
                  </span>
                </div>

                {/* Color lightness */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 shrink-0">
                    Light
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={editingBox.colorLightness}
                    onChange={(e) =>
                      updateTextBox(editingTextIdx, {
                        colorLightness: Number(e.target.value),
                      })
                    }
                    className="flex-1 h-1 accent-white cursor-pointer"
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                    style={{
                      backgroundColor: adjustHexLightness(
                        editingBox.color,
                        editingBox.colorLightness,
                      ),
                    }}
                  />
                </div>

                {/* Box width */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 shrink-0">
                    Width
                  </span>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    value={Math.round(editingBox.boxWidth * 100)}
                    onChange={(e) =>
                      updateTextBox(editingTextIdx, {
                        boxWidth: Number(e.target.value) / 100,
                      })
                    }
                    className="flex-1 h-1 accent-white cursor-pointer"
                  />
                  <span className="text-[10px] text-neutral-400 w-6 text-right">
                    {Math.round(editingBox.boxWidth * 100)}%
                  </span>
                </div>

                {/* Border color dots */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-neutral-500 shrink-0 mr-1">
                    Border
                  </span>
                  {DRAW_COLORS.slice(0, 8).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        updateTextBox(editingTextIdx, { borderColor: c })
                      }
                      className={`w-5 h-5 rounded-full border transition-all ${
                        editingBox.borderColor === c
                          ? "border-white scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                {/* Border style */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-500 shrink-0">
                    Style
                  </span>
                  {(["solid", "dashed", "none"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        updateTextBox(editingTextIdx, { borderStyle: s })
                      }
                      className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                        editingBox.borderStyle === s
                          ? "bg-white/20 text-white"
                          : "bg-white/5 text-neutral-400 hover:bg-white/10"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Border width */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 shrink-0">
                    Thick
                  </span>
                  {[1, 2, 3, 4].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() =>
                        updateTextBox(editingTextIdx, { borderWidth: w })
                      }
                      className={`w-7 h-7 rounded text-[10px] transition-all flex items-center justify-center ${
                        editingBox.borderWidth === w
                          ? "bg-white/20 text-white"
                          : "bg-white/5 text-neutral-400 hover:bg-white/10"
                      }`}
                    >
                      {w}px
                    </button>
                  ))}
                </div>

                {/* Border radius */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 shrink-0">
                    Round
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={editingBox.borderRadius}
                    onChange={(e) =>
                      updateTextBox(editingTextIdx, {
                        borderRadius: Number(e.target.value),
                      })
                    }
                    className="flex-1 h-1 accent-white cursor-pointer"
                  />
                  <span className="text-[10px] text-neutral-400 w-5 text-right">
                    {editingBox.borderRadius}
                  </span>
                </div>

                {/* Background color */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-neutral-500 shrink-0">
                    Bg
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {DRAW_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          updateTextBox(editingTextIdx, { bgColor: c })
                        }
                        className="w-5 h-5 rounded-full border transition-all"
                        style={{
                          backgroundColor: c,
                          borderColor:
                            editingBox.bgColor === c ? "#fff" : "transparent",
                          boxShadow:
                            editingBox.bgColor === c
                              ? "0 0 0 2px rgba(255,255,255,0.5)"
                              : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Background opacity */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 shrink-0">
                    Bg
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(editingBox.bgOpacity * 100)}
                    onChange={(e) =>
                      updateTextBox(editingTextIdx, {
                        bgOpacity: Number(e.target.value) / 100,
                      })
                    }
                    className="flex-1 h-1 accent-white cursor-pointer"
                  />
                  <span className="text-[10px] text-neutral-400 w-6 text-right">
                    {Math.round(editingBox.bgOpacity * 100)}%
                  </span>
                </div>

                {/* Rotation */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 shrink-0">
                    Rotate
                  </span>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={editingBox.rotation}
                    onChange={(e) =>
                      updateTextBox(editingTextIdx, {
                        rotation: Number(e.target.value),
                      })
                    }
                    className="flex-1 h-1 accent-white cursor-pointer"
                  />
                  <span className="text-[10px] text-neutral-400 w-7 text-right">
                    {editingBox.rotation}°
                  </span>
                </div>

                {/* Delete text box */}
                <button
                  type="button"
                  onClick={() => deleteTextBox(editingTextIdx)}
                  className="w-full py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-all"
                >
                  Delete Text Box
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
