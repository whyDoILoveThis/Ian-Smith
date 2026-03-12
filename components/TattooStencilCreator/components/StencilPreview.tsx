/* ─────────────────────────────────────────────────────────────
   StencilPreview – shows the generated stencil with download
   Includes debug view: before/after toggle + unwrap parameters.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Download,
  Image as ImageIcon,
  FileCode,
  Clock,
  Ruler,
  ZoomIn,
  ZoomOut,
  Bug,
} from "lucide-react";
import type { StencilResult } from "../types";
import { downloadPng, downloadSvg } from "../utils/imageProcessing";

interface Props {
  result: StencilResult;
}

type PreviewMode = "png" | "svg" | "debug";

export default function StencilPreview({ result }: Props) {
  const [mode, setMode] = useState<PreviewMode>("png");
  const [zoomed, setZoomed] = useState(false);

  const pngSrc = useMemo(
    () => `data:image/png;base64,${result.pngBase64}`,
    [result.pngBase64],
  );

  const preStencilSrc = useMemo(
    () =>
      result.preStencilBase64
        ? `data:image/png;base64,${result.preStencilBase64}`
        : null,
    [result.preStencilBase64],
  );

  const hasSvg = !!result.svgData;
  const hasDebug = !!preStencilSrc;
  const meta = result.metadata;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header bar ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground">
          Stencil Result
        </h3>

        {/* Format toggle */}
        <div className="flex overflow-hidden rounded-lg border border-border text-xs font-medium">
          <button
            onClick={() => setMode("png")}
            className={`px-3 py-1.5 transition-colors ${
              mode === "png"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            PNG
          </button>
          {hasSvg && (
            <button
              onClick={() => setMode("svg")}
              className={`px-3 py-1.5 transition-colors ${
                mode === "svg"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              SVG
            </button>
          )}
          {hasDebug && (
            <button
              onClick={() => setMode("debug")}
              className={`px-3 py-1.5 transition-colors ${
                mode === "debug"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Bug className="inline h-3 w-3 mr-1" />
              Debug
            </button>
          )}
        </div>
      </div>

      {/* ── Debug view OR Preview area ─────────────────── */}
      {mode === "debug" && hasDebug ? (
        <DebugOverlay
          preStencilSrc={preStencilSrc!}
          unwrapDebug={meta.unwrapDebug}
        />
      ) : (
        <div
          className={`
            relative flex items-center justify-center overflow-hidden rounded-xl
            border border-border bg-white dark:bg-neutral-950
            ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}
          `}
          onClick={() => setZoomed((z) => !z)}
        >
          {mode === "png" || !hasSvg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pngSrc}
              alt="Generated tattoo stencil (PNG)"
              className={`transition-transform duration-300 ${
                zoomed ? "max-h-[700px] scale-100" : "max-h-[400px]"
              } object-contain p-4`}
            />
          ) : (
            <div
              className={`transition-transform duration-300 p-4 ${
                zoomed ? "max-h-[700px]" : "max-h-[400px]"
              } overflow-auto`}
              dangerouslySetInnerHTML={{ __html: result.svgData! }}
            />
          )}

          {/* Zoom hint */}
          <button
            className="absolute bottom-3 right-3 rounded-md bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground"
            aria-label={zoomed ? "Zoom out" : "Zoom in"}
            onClick={(e) => {
              e.stopPropagation();
              setZoomed((z) => !z);
            }}
          >
            {zoomed ? (
              <ZoomOut className="h-4 w-4" />
            ) : (
              <ZoomIn className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {/* ── Metadata chips ────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Chip icon={<Ruler className="h-3 w-3" />}>
          {meta.stencilWidth} × {meta.stencilHeight}
        </Chip>
        <Chip icon={<Clock className="h-3 w-3" />}>
          {meta.processingTimeMs} ms
        </Chip>
        {meta.limbDetected && meta.limbType && (
          <Chip icon={<ImageIcon className="h-3 w-3" />}>
            {meta.limbType.replace("_", " ")}
          </Chip>
        )}
      </div>

      {/* ── Download buttons ──────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <DownloadBtn
          label="Download PNG"
          icon={<ImageIcon className="h-4 w-4" />}
          onClick={() => downloadPng(result.pngBase64)}
        />
        {hasSvg && (
          <DownloadBtn
            label="Download SVG"
            icon={<FileCode className="h-4 w-4" />}
            onClick={() => downloadSvg(result.svgData!)}
            secondary
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function Chip({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1">
      {icon} {children}
    </span>
  );
}

function DownloadBtn({
  label,
  icon,
  onClick,
  secondary,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all
        active:scale-[0.97]
        ${
          secondary
            ? "border border-border bg-muted/50 text-foreground hover:bg-muted"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }
      `}
    >
      <Download className="h-4 w-4" />
      {icon}
      {label}
    </button>
  );
}

// ── Debug overlay: before/after + unwrap parameters + grid ───

function DebugOverlay({
  preStencilSrc,
  unwrapDebug,
}: {
  preStencilSrc: string;
  unwrapDebug?: {
    applied: boolean;
    source: string;
    centerX?: number;
    centerY?: number;
    radius?: number;
    angle?: number;
    imageW?: number;
    imageH?: number;
    halfLength?: number;
    outlinePoints?: { x: number; y: number }[];
    tattooHighlightBase64?: string;
    curveHighlightBase64?: string;
    curvaturePercent?: number;
  };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const highlightImgRef = useRef<HTMLImageElement | null>(null);
  const curveImgRef = useRef<HTMLImageElement | null>(null);

  // Pre-load highlight mask image
  useEffect(() => {
    if (unwrapDebug?.tattooHighlightBase64) {
      const img = new Image();
      img.onload = () => {
        highlightImgRef.current = img;
        // Trigger redraw after image loads
        drawOverlay();
      };
      img.src = `data:image/png;base64,${unwrapDebug.tattooHighlightBase64}`;
    } else {
      highlightImgRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unwrapDebug?.tattooHighlightBase64]);

  // Pre-load curve highlight mask image
  useEffect(() => {
    if (unwrapDebug?.curveHighlightBase64) {
      const img = new Image();
      img.onload = () => {
        curveImgRef.current = img;
        drawOverlay();
      };
      img.src = `data:image/png;base64,${unwrapDebug.curveHighlightBase64}`;
    } else {
      curveImgRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unwrapDebug?.curveHighlightBase64]);

  // Draw grid + boundary overlay on the pre-stencil image
  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const img = container.querySelector("img");
    if (!img || !img.naturalWidth) return;

    // Use the image element rect (avoids container border offset)
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    // Offset of image within the container (accounts for border/padding)
    const offsetX = imgRect.left - containerRect.left;
    const offsetY = imgRect.top - containerRect.top;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = imgRect.width * dpr;
    canvas.height = imgRect.height * dpr;
    canvas.style.width = `${imgRect.width}px`;
    canvas.style.height = `${imgRect.height}px`;
    canvas.style.left = `${offsetX}px`;
    canvas.style.top = `${offsetY}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, imgRect.width, imgRect.height);

    const imgW = unwrapDebug?.imageW ?? img.naturalWidth;
    const imgH = unwrapDebug?.imageH ?? img.naturalHeight;
    const scaleX = imgRect.width / imgW;
    const scaleY = imgRect.height / imgH;

    // ── Draw tattoo highlight mask (semi-transparent red) ──
    const hlImg = highlightImgRef.current;
    if (hlImg && hlImg.complete && hlImg.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.globalCompositeOperation = "source-over";
      // Draw the mask image stretched to fill the canvas,
      // then tint it via a colored rectangle with 'source-atop'
      ctx.drawImage(hlImg, 0, 0, imgRect.width, imgRect.height);
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "#ff3333";
      ctx.fillRect(0, 0, imgRect.width, imgRect.height);
      ctx.restore();
    }

    // ── Draw curve highlight mask (semi-transparent yellow) ──
    const cvImg = curveImgRef.current;
    if (cvImg && cvImg.complete && cvImg.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(cvImg, 0, 0, imgRect.width, imgRect.height);
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "#ffdd22";
      ctx.fillRect(0, 0, imgRect.width, imgRect.height);
      ctx.restore();
    }

    // ── Draw user polygon outline ────────────────────────
    const pts = unwrapDebug?.outlinePoints;
    if (pts && pts.length >= 3) {
      ctx.strokeStyle = "#22d3ee"; // cyan
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const x = pts[i].x * imgW * scaleX;
        const y = pts[i].y * imgH * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Draw cylinder grid if parameters are available ───
    if (
      unwrapDebug?.applied &&
      unwrapDebug.centerX != null &&
      unwrapDebug.radius
    ) {
      const cx = unwrapDebug.centerX * scaleX;
      const cy = unwrapDebug.centerY! * scaleY;
      const R = unwrapDebug.radius;
      const angle = unwrapDebug.angle ?? 0;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Adaptive half-length based on polygon extent (fallback 200)
      const halfLen = unwrapDebug.halfLength ?? 200;

      ctx.strokeStyle = "#4ade8066";
      ctx.lineWidth = 0.8;

      // Iso-θ lines (along-axis direction)
      for (let t = -6; t <= 6; t++) {
        const theta = (t / 6) * (Math.PI / 2);
        const across = R * Math.sin(theta);
        ctx.beginPath();
        const step = Math.max(4, halfLen / 50);
        for (let a = -halfLen; a <= halfLen; a += step) {
          const px = cx + a * cosA * scaleX - across * sinA * scaleX;
          const py = cy + a * sinA * scaleY + across * cosA * scaleY;
          if (a === -halfLen) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // Iso-height lines (across-axis direction)
      const hStep = Math.max(40, halfLen / 5);
      for (let a = -halfLen; a <= halfLen; a += hStep) {
        ctx.beginPath();
        for (let t = -6; t <= 6; t++) {
          const theta = (t / 6) * (Math.PI / 2);
          const across = R * Math.sin(theta);
          const px = cx + a * cosA * scaleX - across * sinA * scaleX;
          const py = cy + a * sinA * scaleY + across * cosA * scaleY;
          if (t === -6) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // Center crosshair
      ctx.strokeStyle = "#f97316aa"; // orange
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.lineTo(cx + 8, cy);
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx, cy + 8);
      ctx.stroke();
    }
  }, [unwrapDebug]);

  useEffect(() => {
    // Redraw when the image loads or window resizes
    const timer = setTimeout(drawOverlay, 100);
    window.addEventListener("resize", drawOverlay);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", drawOverlay);
    };
  }, [drawOverlay]);

  return (
    <div className="flex flex-col gap-3">
      {/* Before/after image with grid overlay */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border border-border bg-neutral-900"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preStencilSrc}
          alt="Pre-stencil grayscale (debug)"
          className="block w-full"
          onLoad={drawOverlay}
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>

      {/* Unwrap parameter readout */}
      {unwrapDebug && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs font-mono text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">
            Unwrap:{" "}
            {unwrapDebug.applied
              ? `applied (${unwrapDebug.source})`
              : "skipped"}
          </p>
          {unwrapDebug.applied && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span>Center:</span>
              <span>
                {unwrapDebug.centerX?.toFixed(1)},{" "}
                {unwrapDebug.centerY?.toFixed(1)} px
              </span>
              <span>Radius:</span>
              <span>{unwrapDebug.radius?.toFixed(1)} px</span>
              <span>Angle:</span>
              <span>
                {(((unwrapDebug.angle ?? 0) * 180) / Math.PI).toFixed(1)}°
              </span>
              <span>Half-length:</span>
              <span>{unwrapDebug.halfLength?.toFixed(1) ?? "—"} px</span>
              <span>Image:</span>
              <span>
                {unwrapDebug.imageW} × {unwrapDebug.imageH}
              </span>
              {unwrapDebug.outlinePoints && (
                <>
                  <span>Polygon:</span>
                  <span>{unwrapDebug.outlinePoints.length} vertices</span>
                </>
              )}
              {unwrapDebug.curvaturePercent != null && (
                <>
                  <span>Curvature:</span>
                  <span>{unwrapDebug.curvaturePercent}%</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
