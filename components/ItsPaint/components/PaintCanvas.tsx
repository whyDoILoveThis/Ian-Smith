"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { usePaintState } from "../hooks/usePaintState";
import { useCanvasRenderer } from "../hooks/useCanvasRenderer";
import { useToolHandler } from "../hooks/useToolHandler";
import { ZOOM_STEP } from "../lib/constants";
import { TOOLS } from "../lib/constants";
import { CanvasPointerEvent } from "../types/types";

export default function PaintCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch } = usePaintState();
  const { screenToCanvas } = useCanvasRenderer(canvasRef);
  const { handlePointerDown, handlePointerMove, handlePointerUp } =
    useToolHandler(screenToCanvas);

  const makeEvent = useCallback(
    (e: React.PointerEvent | PointerEvent): CanvasPointerEvent | null => {
      const pos = screenToCanvas(e.clientX, e.clientY);
      if (!pos) return null;
      return {
        canvasX: pos.x,
        canvasY: pos.y,
        pressure: e.pressure,
        button: e.button,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey || e.metaKey,
        altKey: e.altKey,
        movementX: e.movementX,
        movementY: e.movementY,
      };
    },
    [screenToCanvas],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      if (state.activeTool === "pan") {
        canvasRef.current?.requestPointerLock();
      }
      const ev = makeEvent(e);
      if (ev) handlePointerDown(ev);
    },
    [makeEvent, handlePointerDown, state.activeTool],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Update cursor position
      const pos = screenToCanvas(e.clientX, e.clientY);
      if (pos) {
        dispatch({
          type: "SET_CURSOR_POS",
          pos: { x: Math.floor(pos.x), y: Math.floor(pos.y) },
        });
      }

      const ev = makeEvent(e);
      if (ev) handlePointerMove(ev);
    },
    [makeEvent, handlePointerMove, screenToCanvas, dispatch],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      const ev = makeEvent(e);
      if (ev) handlePointerUp(ev);
    },
    [makeEvent, handlePointerUp],
  );

  const onPointerLeave = useCallback(() => {
    dispatch({ type: "SET_CURSOR_POS", pos: null });
  }, [dispatch]);

  // Zoom with mouse wheel
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const delta = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
        dispatch({ type: "SET_ZOOM", zoom: state.zoom * delta });
      } else {
        // Pan
        dispatch({
          type: "SET_PAN",
          x: state.panX - e.deltaX,
          y: state.panY - e.deltaY,
        });
      }
    },
    [state.zoom, state.panX, state.panY, dispatch],
  );

  // Prevent context menu on canvas
  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Get cursor style based on active tool
  const getCursor = (): string => {
    switch (state.activeTool) {
      case "brush":
      case "pencil":
      case "eraser":
        return "crosshair";
      case "colorPicker":
        return "crosshair";
      case "move":
        return state.isDrawing ? "grabbing" : "grab";
      case "pan":
        return state.isDrawing ? "grabbing" : "grab";
      case "zoom":
        return "zoom-in";
      case "paintBucket":
        return "crosshair";
      case "text":
        return "text";
      default:
        return "crosshair";
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative bg-black/20"
      style={{ cursor: getCursor() }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onWheel={onWheel}
        onContextMenu={onContextMenu}
      />
    </div>
  );
}
