'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePaintState } from './usePaintState';
import { compositeLayers, drawCheckerboard } from '../utils/canvasUtils';
import { drawMarchingAnts } from '../utils/selectionUtils';

export function useCanvasRenderer(displayCanvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const { state, layerCanvasMap, previewCanvasRef, renderCallbackRef } = usePaintState();
  const animFrameRef = useRef<number>(0);
  const antOffsetRef = useRef(0);
  const lastRenderRef = useRef(0);

  const render = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return;

    const ctx = displayCanvas.getContext('2d');
    if (!ctx) return;

    const { width, height, zoom, panX, panY, layers, selection, showGrid } = state;
    const dpr = window.devicePixelRatio || 1;

    // Size the display canvas to fill its container
    const rect = displayCanvas.getBoundingClientRect();
    displayCanvas.width = rect.width * dpr;
    displayCanvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear display
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Calculate canvas position (centered + pan)
    const canvasDisplayW = width * zoom;
    const canvasDisplayH = height * zoom;
    const offsetX = (rect.width - canvasDisplayW) / 2 + panX;
    const offsetY = (rect.height - canvasDisplayH) / 2 + panY;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(zoom, zoom);

    // Draw checkerboard background (transparency indicator)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    drawCheckerboard(ctx, width, height, zoom);
    ctx.restore();

    // Composite all layers
    const layerData = layers.map((meta) => ({
      canvas: layerCanvasMap.current.get(meta.id)!,
      visible: meta.visible,
      opacity: meta.opacity,
      blendMode: meta.blendMode,
    })).filter((l) => l.canvas);

    // Draw composited layers
    for (const layer of layerData) {
      if (!layer.visible || layer.opacity <= 0) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
      ctx.imageSmoothingEnabled = zoom < 2;
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }

    // Draw preview layer (current tool operation)
    const preview = previewCanvasRef.current;
    if (preview && preview.width > 0) {
      ctx.imageSmoothingEnabled = zoom < 2;
      ctx.drawImage(preview, 0, 0);
    }

    // Draw grid if enabled
    if (showGrid && zoom >= 4) {
      ctx.save();
      ctx.strokeStyle = 'rgba(128,128,128,0.3)';
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      for (let x = 0; x <= width; x++) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y++) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw selection marching ants
    if (selection) {
      drawMarchingAnts(ctx, selection.mask, width, height, antOffsetRef.current, zoom);
    }

    ctx.restore();

    // Draw canvas border shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, canvasDisplayW, canvasDisplayH);
    ctx.restore();
  }, [state, layerCanvasMap, previewCanvasRef, displayCanvasRef]);

  // Animation loop for marching ants
  useEffect(() => {
    let running = true;

    const animate = () => {
      if (!running) return;
      const now = performance.now();

      // Animate marching ants
      if (state.selection) {
        antOffsetRef.current = (now / 100) % 16;
      }

      // Throttle to ~60fps
      if (now - lastRenderRef.current >= 16) {
        render();
        lastRenderRef.current = now;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [render, state.selection]);

  // Register render callback so other hooks can trigger re-render
  useEffect(() => {
    renderCallbackRef.current = render;
    return () => {
      renderCallbackRef.current = null;
    };
  }, [render, renderCallbackRef]);

  /** Convert screen coordinates to canvas coordinates */
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } | null => {
      const displayCanvas = displayCanvasRef.current;
      if (!displayCanvas) return null;

      const rect = displayCanvas.getBoundingClientRect();
      const { width, height, zoom, panX, panY } = state;
      const canvasDisplayW = width * zoom;
      const canvasDisplayH = height * zoom;
      const offsetX = (rect.width - canvasDisplayW) / 2 + panX;
      const offsetY = (rect.height - canvasDisplayH) / 2 + panY;

      const x = (screenX - rect.left - offsetX) / zoom;
      const y = (screenY - rect.top - offsetY) / zoom;

      return { x, y };
    },
    [displayCanvasRef, state]
  );

  return { render, screenToCanvas };
}
