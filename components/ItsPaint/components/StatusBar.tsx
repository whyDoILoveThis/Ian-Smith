"use client";

import React from "react";
import { usePaintState } from "../hooks/usePaintState";

export default function StatusBar() {
  const { state } = usePaintState();
  const {
    cursorPos,
    width,
    height,
    zoom,
    activeTool,
    selection,
    activeLayerId,
    layers,
  } = state;

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const zoomPercent = Math.round(zoom * 100);
  const toolLabel = activeTool
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase());

  const pill =
    "bg-white/[0.05] rounded-full px-2.5 py-0.5 border border-white/[0.04]";

  return (
    <div className="h-7 backdrop-blur-xl bg-white/[0.03] border-t border-white/[0.06] flex items-center px-3 gap-2 select-none text-[10px] text-white/35">
      <span className={`${pill} tabular-nums min-w-[80px]`}>
        {cursorPos ? `X: ${cursorPos.x}, Y: ${cursorPos.y}` : "X: —, Y: —"}
      </span>

      <span className={`${pill} tabular-nums`}>
        {width} × {height}
      </span>

      <span className={`${pill} tabular-nums`}>{zoomPercent}%</span>

      <span className="text-white/50 text-[10px]">{toolLabel}</span>

      <span className="text-white/30 truncate max-w-[120px]">
        {activeLayer?.name ?? "—"}
      </span>

      {selection && (
        <span className="text-cyan-400/60 tabular-nums text-[10px]">
          Sel: {selection.bounds.width}×{selection.bounds.height}
        </span>
      )}

      {state.isDirty && (
        <span className="bg-amber-400/10 text-amber-400/60 rounded-full px-2 py-0.5 border border-amber-400/10">
          ● Modified
        </span>
      )}

      <div className="flex-1" />

      <span className="tabular-nums text-white/25">
        {state.historyIndex + 1}/{state.history.length}
      </span>
    </div>
  );
}
