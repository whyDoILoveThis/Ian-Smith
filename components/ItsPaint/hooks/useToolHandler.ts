'use client';

import { useCallback, useRef } from 'react';
import { usePaintState } from './usePaintState';
import { CanvasPointerEvent, RGBAColor, ToolType } from '../types/types';
import { clearCanvas, createCanvas, drawBrushStamp, interpolatePoints } from '../utils/canvasUtils';
import { getPixelColor, rgbaToString } from '../utils/colorUtils';
import {
  createEllipseSelection,
  createLassoSelection,
  createRectSelection,
  floodFill,
  magicWandSelection,
} from '../utils/selectionUtils';

interface ToolState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  points: Array<{ x: number; y: number }>;
  isActive: boolean;
}

export function useToolHandler(
  screenToCanvas: (sx: number, sy: number) => { x: number; y: number } | null
) {
  const {
    state,
    dispatch,
    getLayerCanvas,
    previewCanvasRef,
    pushHistory,
    requestRender,
  } = usePaintState();

  const toolStateRef = useRef<ToolState>({
    startX: 0, startY: 0, lastX: 0, lastY: 0,
    points: [], isActive: false,
  });

  // Ensure preview canvas exists
  const ensurePreview = useCallback(() => {
    if (!previewCanvasRef.current) {
      previewCanvasRef.current = createCanvas(state.width, state.height);
    } else if (
      previewCanvasRef.current.width !== state.width ||
      previewCanvasRef.current.height !== state.height
    ) {
      previewCanvasRef.current.width = state.width;
      previewCanvasRef.current.height = state.height;
    }
    return previewCanvasRef.current;
  }, [previewCanvasRef, state.width, state.height]);

  const commitPreview = useCallback(() => {
    const preview = previewCanvasRef.current;
    const layerCanvas = getLayerCanvas(state.activeLayerId);
    if (!preview || !layerCanvas) return;

    const ctx = layerCanvas.getContext('2d')!;
    ctx.drawImage(preview, 0, 0);
    clearCanvas(preview);
    requestRender();
  }, [previewCanvasRef, getLayerCanvas, state.activeLayerId, requestRender]);

  // ─── MOUSE DOWN ────────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: CanvasPointerEvent) => {
      const { activeTool, toolOptions, primaryColor, secondaryColor, activeLayerId, width, height, selection } = state;
      const activeLayer = state.layers.find((l) => l.id === activeLayerId);
      if (!activeLayer || activeLayer.locked) return;

      const cx = Math.floor(e.canvasX);
      const cy = Math.floor(e.canvasY);
      const color = e.button === 2 ? secondaryColor : primaryColor;

      toolStateRef.current = {
        startX: cx, startY: cy,
        lastX: cx, lastY: cy,
        points: [{ x: cx, y: cy }],
        isActive: true,
      };

      dispatch({ type: 'SET_IS_DRAWING', drawing: true });
      const layerCanvas = getLayerCanvas(activeLayerId);

      switch (activeTool) {
        case 'pencil':
        case 'brush': {
          pushHistory('Draw');
          const preview = ensurePreview();
          const ctx = preview.getContext('2d')!;
          const opacity = toolOptions.opacity / 100;
          const colorStr = rgbaToString({ ...color, a: color.a * opacity });
          drawBrushStamp(ctx, cx, cy, toolOptions.brushSize, toolOptions.brushHardness, colorStr);
          requestRender();
          break;
        }

        case 'eraser': {
          pushHistory('Erase');
          if (layerCanvas) {
            const ctx = layerCanvas.getContext('2d')!;
            const size = toolOptions.brushSize;
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            requestRender();
          }
          break;
        }

        case 'paintBucket': {
          if (!layerCanvas) break;
          if (cx < 0 || cx >= width || cy < 0 || cy >= height) break;
          pushHistory('Fill');
          const imgData = layerCanvas.getContext('2d')!.getImageData(0, 0, width, height);
          const filled = floodFill(
            imgData, cx, cy, color, toolOptions.tolerance,
            selection?.mask ?? null
          );
          layerCanvas.getContext('2d')!.putImageData(filled, 0, 0);
          requestRender();
          break;
        }

        case 'colorPicker': {
          if (!layerCanvas) break;
          if (cx < 0 || cx >= width || cy < 0 || cy >= height) break;
          const imgData = layerCanvas.getContext('2d')!.getImageData(0, 0, width, height);
          const pickedColor = getPixelColor(imgData, cx, cy);
          if (e.button === 2) {
            dispatch({ type: 'SET_SECONDARY_COLOR', color: pickedColor });
          } else {
            dispatch({ type: 'SET_PRIMARY_COLOR', color: pickedColor });
          }
          break;
        }

        case 'magicWand': {
          if (!layerCanvas) break;
          if (cx < 0 || cx >= width || cy < 0 || cy >= height) break;
          const imgData = layerCanvas.getContext('2d')!.getImageData(0, 0, width, height);
          const sel = magicWandSelection(imgData, cx, cy, toolOptions.tolerance, toolOptions.contiguous);
          dispatch({ type: 'SET_SELECTION', selection: sel });
          requestRender();
          break;
        }

        case 'rectSelect':
        case 'ellipseSelect':
        case 'lassoSelect':
        case 'crop':
          // Selection starts on mousedown, drawn on mousemove
          break;

        case 'line':
        case 'rectangle':
        case 'ellipse':
          pushHistory('Shape');
          break;

        case 'text':
          // Text will be handled by a dialog
          break;

        case 'gradient': {
          pushHistory('Gradient');
          break;
        }

        case 'move': {
          // Will handle moving on mousemove
          break;
        }

        case 'zoom': {
          const newZoom = e.shiftKey ? state.zoom / 1.5 : state.zoom * 1.5;
          dispatch({ type: 'SET_ZOOM', zoom: newZoom });
          break;
        }
      }
    },
    [state, dispatch, getLayerCanvas, pushHistory, ensurePreview, requestRender]
  );

  // ─── MOUSE MOVE ────────────────────────────────────────────────────────
  const handlePointerMove = useCallback(
    (e: CanvasPointerEvent) => {
      const ts = toolStateRef.current;
      if (!ts.isActive) return;

      const { activeTool, toolOptions, primaryColor, secondaryColor, activeLayerId, width, height } = state;
      const cx = Math.floor(e.canvasX);
      const cy = Math.floor(e.canvasY);
      const color = e.button === 2 ? secondaryColor : primaryColor;

      switch (activeTool) {
        case 'pencil':
        case 'brush': {
          const preview = ensurePreview();
          const ctx = preview.getContext('2d')!;
          const opacity = toolOptions.opacity / 100;
          const colorStr = rgbaToString({ ...color, a: color.a * opacity });
          const spacing = Math.max(1, toolOptions.brushSize / 4);
          const points = interpolatePoints(ts.lastX, ts.lastY, cx, cy, spacing);
          for (const pt of points) {
            drawBrushStamp(ctx, pt.x, pt.y, toolOptions.brushSize, toolOptions.brushHardness, colorStr);
          }
          requestRender();
          break;
        }

        case 'eraser': {
          const layerCanvas = getLayerCanvas(activeLayerId);
          if (!layerCanvas) break;
          const ctx = layerCanvas.getContext('2d')!;
          const spacing = Math.max(1, toolOptions.brushSize / 4);
          const points = interpolatePoints(ts.lastX, ts.lastY, cx, cy, spacing);
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          for (const pt of points) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, toolOptions.brushSize / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          requestRender();
          break;
        }

        case 'rectSelect':
        case 'crop': {
          const preview = ensurePreview();
          const ctx = preview.getContext('2d')!;
          clearCanvas(preview);
          const x = Math.min(ts.startX, cx);
          const y = Math.min(ts.startY, cy);
          const w = Math.abs(cx - ts.startX);
          const h = Math.abs(cy - ts.startY);
          ctx.strokeStyle = '#0078d4';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x, y, w, h);
          ctx.setLineDash([]);
          requestRender();
          break;
        }

        case 'ellipseSelect': {
          const preview = ensurePreview();
          const ctx = preview.getContext('2d')!;
          clearCanvas(preview);
          const ecx = (ts.startX + cx) / 2;
          const ecy = (ts.startY + cy) / 2;
          const erx = Math.abs(cx - ts.startX) / 2;
          const ery = Math.abs(cy - ts.startY) / 2;
          ctx.strokeStyle = '#0078d4';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.ellipse(ecx, ecy, erx, ery, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          requestRender();
          break;
        }

        case 'lassoSelect': {
          ts.points.push({ x: cx, y: cy });
          const preview = ensurePreview();
          const ctx = preview.getContext('2d')!;
          clearCanvas(preview);
          ctx.strokeStyle = '#0078d4';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < ts.points.length; i++) {
            if (i === 0) ctx.moveTo(ts.points[i].x, ts.points[i].y);
            else ctx.lineTo(ts.points[i].x, ts.points[i].y);
          }
          ctx.stroke();
          requestRender();
          break;
        }

        case 'line': {
          const preview = ensurePreview();
          const ctx = preview.getContext('2d')!;
          clearCanvas(preview);
          const opacity = toolOptions.opacity / 100;
          ctx.strokeStyle = rgbaToString({ ...color, a: color.a * opacity });
          ctx.lineWidth = toolOptions.strokeWidth;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ts.startX, ts.startY);
          ctx.lineTo(cx, cy);
          ctx.stroke();
          requestRender();
          break;
        }

        case 'rectangle': {
          const preview = ensurePreview();
          const ctx = preview.getContext('2d')!;
          clearCanvas(preview);
          const opacity = toolOptions.opacity / 100;
          const x = Math.min(ts.startX, cx);
          const y = Math.min(ts.startY, cy);
          const w = Math.abs(cx - ts.startX);
          const h = Math.abs(cy - ts.startY);

          if (toolOptions.fillStyle === 'solid') {
            ctx.fillStyle = rgbaToString({ ...color, a: color.a * opacity });
            ctx.fillRect(x, y, w, h);
          }
          if (toolOptions.strokeStyle === 'solid') {
            ctx.strokeStyle = rgbaToString({ ...color, a: color.a * opacity });
            ctx.lineWidth = toolOptions.strokeWidth;
            ctx.strokeRect(x, y, w, h);
          }
          requestRender();
          break;
        }

        case 'ellipse': {
          const preview = ensurePreview();
          const ctx = preview.getContext('2d')!;
          clearCanvas(preview);
          const opacity = toolOptions.opacity / 100;
          const ecx = (ts.startX + cx) / 2;
          const ecy = (ts.startY + cy) / 2;
          const erx = Math.abs(cx - ts.startX) / 2;
          const ery = Math.abs(cy - ts.startY) / 2;

          ctx.beginPath();
          ctx.ellipse(ecx, ecy, Math.max(1, erx), Math.max(1, ery), 0, 0, Math.PI * 2);
          if (toolOptions.fillStyle === 'solid') {
            ctx.fillStyle = rgbaToString({ ...color, a: color.a * opacity });
            ctx.fill();
          }
          if (toolOptions.strokeStyle === 'solid') {
            ctx.strokeStyle = rgbaToString({ ...color, a: color.a * opacity });
            ctx.lineWidth = toolOptions.strokeWidth;
            ctx.stroke();
          }
          requestRender();
          break;
        }

        case 'gradient': {
          const preview = ensurePreview();
          const ctx = preview.getContext('2d')!;
          clearCanvas(preview);
          const opacity = toolOptions.opacity / 100;
          let gradient: CanvasGradient;
          if (toolOptions.gradientType === 'radial') {
            const dist = Math.sqrt((cx - ts.startX) ** 2 + (cy - ts.startY) ** 2);
            gradient = ctx.createRadialGradient(ts.startX, ts.startY, 0, ts.startX, ts.startY, dist);
          } else {
            gradient = ctx.createLinearGradient(ts.startX, ts.startY, cx, cy);
          }
          gradient.addColorStop(0, rgbaToString({ ...primaryColor, a: primaryColor.a * opacity }));
          gradient.addColorStop(1, rgbaToString({ ...secondaryColor, a: secondaryColor.a * opacity }));
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
          requestRender();
          break;
        }

        case 'move': {
          const dx = cx - ts.lastX;
          const dy = cy - ts.lastY;
          dispatch({ type: 'SET_PAN', x: state.panX + dx * state.zoom, y: state.panY + dy * state.zoom });
          break;
        }
      }

      ts.lastX = cx;
      ts.lastY = cy;
    },
    [state, dispatch, getLayerCanvas, ensurePreview, requestRender]
  );

  // ─── MOUSE UP ──────────────────────────────────────────────────────────
  const handlePointerUp = useCallback(
    (e: CanvasPointerEvent) => {
      const ts = toolStateRef.current;
      if (!ts.isActive) return;
      ts.isActive = false;

      dispatch({ type: 'SET_IS_DRAWING', drawing: false });

      const { activeTool, width, height } = state;
      const cx = Math.floor(e.canvasX);
      const cy = Math.floor(e.canvasY);

      switch (activeTool) {
        case 'pencil':
        case 'brush':
        case 'line':
        case 'rectangle':
        case 'ellipse':
        case 'gradient':
          commitPreview();
          break;

        case 'rectSelect': {
          const x = Math.max(0, Math.min(ts.startX, cx));
          const y = Math.max(0, Math.min(ts.startY, cy));
          const w = Math.min(width, Math.abs(cx - ts.startX));
          const h = Math.min(height, Math.abs(cy - ts.startY));
          if (w > 1 && h > 1) {
            const sel = createRectSelection(width, height, x, y, w, h);
            dispatch({ type: 'SET_SELECTION', selection: sel });
          } else {
            dispatch({ type: 'SET_SELECTION', selection: null });
          }
          clearCanvas(ensurePreview());
          requestRender();
          break;
        }

        case 'ellipseSelect': {
          const ecx = (ts.startX + cx) / 2;
          const ecy = (ts.startY + cy) / 2;
          const erx = Math.abs(cx - ts.startX) / 2;
          const ery = Math.abs(cy - ts.startY) / 2;
          if (erx > 1 && ery > 1) {
            const sel = createEllipseSelection(width, height, ecx, ecy, erx, ery);
            dispatch({ type: 'SET_SELECTION', selection: sel });
          } else {
            dispatch({ type: 'SET_SELECTION', selection: null });
          }
          clearCanvas(ensurePreview());
          requestRender();
          break;
        }

        case 'lassoSelect': {
          if (ts.points.length >= 3) {
            const sel = createLassoSelection(width, height, ts.points);
            dispatch({ type: 'SET_SELECTION', selection: sel });
          } else {
            dispatch({ type: 'SET_SELECTION', selection: null });
          }
          clearCanvas(ensurePreview());
          requestRender();
          break;
        }

        case 'crop': {
          const x = Math.max(0, Math.min(ts.startX, cx));
          const y = Math.max(0, Math.min(ts.startY, cy));
          const w = Math.min(width - x, Math.abs(cx - ts.startX));
          const h = Math.min(height - y, Math.abs(cy - ts.startY));
          if (w > 1 && h > 1) {
            // Create crop selection for MenuBar to use
            const sel = createRectSelection(width, height, x, y, w, h);
            dispatch({ type: 'SET_SELECTION', selection: sel });
          }
          clearCanvas(ensurePreview());
          requestRender();
          break;
        }
      }
    },
    [state, dispatch, commitPreview, ensurePreview, requestRender]
  );

  return { handlePointerDown, handlePointerMove, handlePointerUp, commitPreview };
}
