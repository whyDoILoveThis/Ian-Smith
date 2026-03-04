/* ─────────────────────────────────────────────────────────────
   StencilPreview – shows the generated stencil with download
   Includes debug view: before/after toggle + unwrap parameters.
   ───────────────────────────────────────────────────────────── */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Image as ImageIcon, FileCode, Clock, Ruler, ZoomIn, ZoomOut, Bug } from 'lucide-react';
import type { StencilResult, WrapBoundary } from '../types';
import { downloadPng, downloadSvg } from '../utils/imageProcessing';

interface Props {
  result: StencilResult;
  /** Pass the boundary the user drew so the debug overlay can render it. */
  wrapBoundary?: WrapBoundary | null;
}

type PreviewMode = 'png' | 'svg' | 'debug';

export default function StencilPreview({ result, wrapBoundary }: Props) {
  const [mode, setMode] = useState<PreviewMode>('png');
  const [zoomed, setZoomed] = useState(false);

  const pngSrc = useMemo(
    () => `data:image/png;base64,${result.pngBase64}`,
    [result.pngBase64],
  );

  const preStencilSrc = useMemo(
    () => result.preStencilBase64
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
        <h3 className="text-lg font-semibold text-foreground">Stencil Result</h3>

        {/* Format toggle */}
        <div className="flex overflow-hidden rounded-lg border border-border text-xs font-medium">
          <button
            onClick={() => setMode('png')}
            className={`px-3 py-1.5 transition-colors ${
              mode === 'png'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            PNG
          </button>
          {hasSvg && (
            <button
              onClick={() => setMode('svg')}
              className={`px-3 py-1.5 transition-colors ${
                mode === 'svg'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              SVG
            </button>
          )}
          {hasDebug && (
            <button
              onClick={() => setMode('debug')}
              className={`px-3 py-1.5 transition-colors ${
                mode === 'debug'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              <Bug className="inline h-3 w-3 mr-1" />
              Debug
            </button>
          )}
        </div>
      </div>

      {/* ── Debug view OR Preview area ─────────────────── */}
      {mode === 'debug' && hasDebug ? (
        <DebugOverlay
          preStencilSrc={preStencilSrc!}
          unwrapDebug={meta.unwrapDebug}
          wrapBoundary={wrapBoundary}
        />
      ) : (
        <div
          className={`
            relative flex items-center justify-center overflow-hidden rounded-xl
            border border-border bg-white dark:bg-neutral-950
            ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}
          `}
          onClick={() => setZoomed((z) => !z)}
        >
          {mode === 'png' || !hasSvg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pngSrc}
              alt="Generated tattoo stencil (PNG)"
              className={`transition-transform duration-300 ${
                zoomed ? 'max-h-[700px] scale-100' : 'max-h-[400px]'
              } object-contain p-4`}
            />
          ) : (
            <div
              className={`transition-transform duration-300 p-4 ${
                zoomed ? 'max-h-[700px]' : 'max-h-[400px]'
              } overflow-auto`}
              dangerouslySetInnerHTML={{ __html: result.svgData! }}
            />
          )}

          {/* Zoom hint */}
          <button
            className="absolute bottom-3 right-3 rounded-md bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground"
            aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
            onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
          >
            {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
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
            {meta.limbType.replace('_', ' ')}
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

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
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
        ${secondary
          ? 'border border-border bg-muted/50 text-foreground hover:bg-muted'
          : 'bg-primary text-primary-foreground hover:bg-primary/90'}
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
  wrapBoundary,
}: {
  preStencilSrc: string;
  unwrapDebug?: { applied: boolean; source: string; centerX?: number; centerY?: number; radius?: number; angle?: number; imageW?: number; imageH?: number };
  wrapBoundary?: WrapBoundary | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw grid + boundary overlay on the pre-stencil image
  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const img = container.querySelector('img');
    if (!img || !img.naturalWidth) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const scaleX = rect.width / (unwrapDebug?.imageW ?? img.naturalWidth);
    const scaleY = rect.height / (unwrapDebug?.imageH ?? img.naturalHeight);

    // Draw boundary points if available
    if (wrapBoundary) {
      const iW = unwrapDebug?.imageW ?? img.naturalWidth;
      const iH = unwrapDebug?.imageH ?? img.naturalHeight;
      const pts = [
        { p: wrapBoundary.axisStart, c: '#22d3ee', l: 'Axis top' },
        { p: wrapBoundary.axisEnd,   c: '#22d3ee', l: 'Axis bottom' },
        { p: wrapBoundary.leftEdge,  c: '#f97316', l: 'Left edge' },
        { p: wrapBoundary.rightEdge, c: '#a855f7', l: 'Right edge' },
      ];
      for (const { p, c, l } of pts) {
        const px = p.x * iW * scaleX;
        const py = p.y * iH * scaleY;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = c + '55';
        ctx.fill();
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(l, px + 10, py + 3);
        ctx.fillText(l, px + 10, py + 3);
      }

      // Axis line
      const a1 = { x: wrapBoundary.axisStart.x * iW * scaleX, y: wrapBoundary.axisStart.y * iH * scaleY };
      const a2 = { x: wrapBoundary.axisEnd.x * iW * scaleX, y: wrapBoundary.axisEnd.y * iH * scaleY };
      ctx.beginPath();
      ctx.moveTo(a1.x, a1.y);
      ctx.lineTo(a2.x, a2.y);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw sample unwrap grid if parameters are available
    if (unwrapDebug?.applied && unwrapDebug.centerX != null && unwrapDebug.radius) {
      const cx = unwrapDebug.centerX * scaleX;
      const cy = unwrapDebug.centerY! * scaleY;
      const R = unwrapDebug.radius;
      const angle = unwrapDebug.angle ?? 0;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const maxArc = (Math.PI / 2) * R;

      ctx.strokeStyle = '#4ade8066';
      ctx.lineWidth = 0.8;

      // Draw vertical iso-θ lines (where angle is constant)
      for (let t = -6; t <= 6; t++) {
        const theta = (t / 6) * (Math.PI / 2);
        const across = R * Math.sin(theta);
        ctx.beginPath();
        for (let a = -200; a <= 200; a += 4) {
          const px = cx + a * cosA * scaleX - across * sinA * scaleX;
          const py = cy + a * sinA * scaleY + across * cosA * scaleY;
          if (a === -200) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // Draw horizontal iso-height lines
      for (let a = -200; a <= 200; a += 40) {
        ctx.beginPath();
        for (let t = -6; t <= 6; t++) {
          const theta = (t / 6) * (Math.PI / 2);
          const across = R * Math.sin(theta);
          const px = cx + a * cosA * scaleX - across * sinA * scaleX;
          const py = cy + a * sinA * scaleY + across * cosA * scaleY;
          if (t === -6) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
  }, [unwrapDebug, wrapBoundary]);

  useEffect(() => {
    // Redraw when the image loads or window resizes
    const timer = setTimeout(drawOverlay, 100);
    window.addEventListener('resize', drawOverlay);
    return () => { clearTimeout(timer); window.removeEventListener('resize', drawOverlay); };
  }, [drawOverlay]);

  return (
    <div className="flex flex-col gap-3">
      {/* Before/after image with grid overlay */}
      <div ref={containerRef} className="relative overflow-hidden rounded-xl border border-border bg-neutral-900">
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
            Unwrap: {unwrapDebug.applied ? `applied (${unwrapDebug.source})` : 'skipped'}
          </p>
          {unwrapDebug.applied && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span>Center:</span>
              <span>{unwrapDebug.centerX?.toFixed(1)}, {unwrapDebug.centerY?.toFixed(1)} px</span>
              <span>Radius:</span>
              <span>{unwrapDebug.radius?.toFixed(1)} px</span>
              <span>Angle:</span>
              <span>{((unwrapDebug.angle ?? 0) * 180 / Math.PI).toFixed(1)}°</span>
              <span>Image:</span>
              <span>{unwrapDebug.imageW} × {unwrapDebug.imageH}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
