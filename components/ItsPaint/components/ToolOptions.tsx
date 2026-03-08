"use client";

import React from "react";
import { usePaintState } from "../hooks/usePaintState";
import { ToolType } from "../types/types";

/* ── Shared styled building blocks ──────────────────────────────────────── */
const pillCls =
  "bg-white/[0.07] backdrop-blur-sm rounded-full px-3 py-1.5 md:py-1 flex items-center gap-2 text-[12px] md:text-[11px] text-white/80 border border-white/[0.06]";
const rangeCls =
  "appearance-none h-2 md:h-1 rounded-full bg-white/10 accent-violet-400 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 md:[&::-webkit-slider-thumb]:w-3 md:[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(139,92,246,0.6)]";
const selCls =
  "bg-white/[0.08] text-white/80 text-[12px] md:text-[11px] rounded-full px-2 py-1 md:py-0.5 border border-white/[0.06] outline-none cursor-pointer";
const checkCls = "accent-violet-400 rounded w-5 h-5 md:w-4 md:h-4";
const numCls =
  "w-14 md:w-12 bg-white/[0.08] text-white/80 text-[12px] md:text-[11px] rounded-full px-2 py-1 md:py-0.5 border border-white/[0.06] outline-none text-center tabular-nums";

export default function ToolOptions() {
  const { state, dispatch } = usePaintState();
  const { activeTool, toolOptions } = state;

  const setOpt = (options: Partial<typeof toolOptions>) => {
    dispatch({ type: "SET_TOOL_OPTIONS", options });
  };

  const renderBrushOptions = () => (
    <>
      <div className={pillCls}>
        <span className="text-white/50">Size</span>
        <input
          type="range"
          min={1}
          max={200}
          value={toolOptions.brushSize}
          onChange={(e) => setOpt({ brushSize: +e.target.value })}
          className={`flex-1 min-w-[80px] md:min-w-0 md:w-20 md:flex-none ${rangeCls}`}
        />
        <span className="w-6 text-right tabular-nums text-white/60">
          {toolOptions.brushSize}
        </span>
      </div>
      <div className={pillCls}>
        <span className="text-white/50">Hard</span>
        <input
          type="range"
          min={0}
          max={100}
          value={toolOptions.brushHardness}
          onChange={(e) => setOpt({ brushHardness: +e.target.value })}
          className={`flex-1 min-w-[60px] md:min-w-0 md:w-14 md:flex-none ${rangeCls}`}
        />
        <span className="w-8 text-right tabular-nums text-white/60">
          {toolOptions.brushHardness}%
        </span>
      </div>
    </>
  );

  const renderOpacity = () => (
    <div className={pillCls}>
      <span className="text-white/50">Opacity</span>
      <input
        type="range"
        min={1}
        max={100}
        value={toolOptions.opacity}
        onChange={(e) => setOpt({ opacity: +e.target.value })}
        className={`flex-1 min-w-[70px] md:min-w-0 md:w-16 md:flex-none ${rangeCls}`}
      />
      <span className="w-8 text-right tabular-nums text-white/60">
        {toolOptions.opacity}%
      </span>
    </div>
  );

  const renderTolerance = () => (
    <div className={pillCls}>
      <span className="text-white/50">Tolerance</span>
      <input
        type="range"
        min={0}
        max={255}
        value={toolOptions.tolerance}
        onChange={(e) => setOpt({ tolerance: +e.target.value })}
        className={`flex-1 min-w-[80px] md:min-w-0 md:w-20 md:flex-none ${rangeCls}`}
      />
      <span className="w-6 text-right tabular-nums text-white/60">
        {toolOptions.tolerance}
      </span>
    </div>
  );

  const renderContiguous = () => (
    <label className={`${pillCls} cursor-pointer`}>
      <input
        type="checkbox"
        checked={toolOptions.contiguous}
        onChange={(e) => setOpt({ contiguous: e.target.checked })}
        className={checkCls}
      />
      Contiguous
    </label>
  );

  const renderAntiAlias = () => (
    <label className={`${pillCls} cursor-pointer`}>
      <input
        type="checkbox"
        checked={toolOptions.antiAlias}
        onChange={(e) => setOpt({ antiAlias: e.target.checked })}
        className={checkCls}
      />
      Anti-alias
    </label>
  );

  const renderShapeOptions = () => (
    <>
      <div className={pillCls}>
        <span className="text-white/50">Fill</span>
        <select
          value={toolOptions.fillStyle}
          onChange={(e) =>
            setOpt({ fillStyle: e.target.value as "solid" | "none" })
          }
          className={selCls}
        >
          <option value="solid">Solid</option>
          <option value="none">None</option>
        </select>
      </div>
      <div className={pillCls}>
        <span className="text-white/50">Stroke</span>
        <select
          value={toolOptions.strokeStyle}
          onChange={(e) =>
            setOpt({ strokeStyle: e.target.value as "solid" | "none" })
          }
          className={selCls}
        >
          <option value="solid">Solid</option>
          <option value="none">None</option>
        </select>
      </div>
      <div className={pillCls}>
        <span className="text-white/50">W</span>
        <input
          type="range"
          min={1}
          max={50}
          value={toolOptions.strokeWidth}
          onChange={(e) => setOpt({ strokeWidth: +e.target.value })}
          className={`flex-1 min-w-[60px] md:min-w-0 md:w-14 md:flex-none ${rangeCls}`}
        />
        <span className="w-5 text-right tabular-nums text-white/60">
          {toolOptions.strokeWidth}
        </span>
      </div>
    </>
  );

  const renderGradientOptions = () => (
    <div className={pillCls}>
      <span className="text-white/50">Type</span>
      <select
        value={toolOptions.gradientType}
        onChange={(e) =>
          setOpt({ gradientType: e.target.value as "linear" | "radial" })
        }
        className={selCls}
      >
        <option value="linear">Linear</option>
        <option value="radial">Radial</option>
      </select>
    </div>
  );

  const renderTextOptions = () => (
    <>
      <div className={pillCls}>
        <span className="text-white/50">Font</span>
        <select
          value={toolOptions.fontFamily}
          onChange={(e) => setOpt({ fontFamily: e.target.value })}
          className={selCls}
        >
          {[
            "Arial",
            "Helvetica",
            "Georgia",
            "Times New Roman",
            "Courier New",
            "Verdana",
            "Impact",
          ].map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <div className={pillCls}>
        <span className="text-white/50">Size</span>
        <input
          type="number"
          min={8}
          max={200}
          value={toolOptions.fontSize}
          onChange={(e) => setOpt({ fontSize: +e.target.value })}
          className={numCls}
        />
      </div>
    </>
  );

  const toolLabel = activeTool
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase());

  return (
    <div className="min-h-[44px] md:h-11 backdrop-blur-xl bg-white/[0.03] border-b border-white/[0.06] flex items-center gap-2 px-3 md:px-4 select-none overflow-x-auto flex-wrap md:flex-nowrap py-1 md:py-0">
      <span className="text-[11px] font-semibold tracking-wide bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent whitespace-nowrap">
        {toolLabel}
      </span>
      <div className="w-px h-5 bg-white/10 mx-1" />

      {(activeTool === "brush" ||
        activeTool === "pencil" ||
        activeTool === "eraser") && (
        <>
          {renderBrushOptions()}
          {renderOpacity()}
        </>
      )}

      {(activeTool === "magicWand" || activeTool === "paintBucket") && (
        <>
          {renderTolerance()}
          {renderContiguous()}
          {renderAntiAlias()}
        </>
      )}

      {(activeTool === "line" ||
        activeTool === "rectangle" ||
        activeTool === "ellipse") && (
        <>
          {renderShapeOptions()}
          {renderOpacity()}
        </>
      )}

      {activeTool === "gradient" && (
        <>
          {renderGradientOptions()}
          {renderOpacity()}
        </>
      )}

      {activeTool === "text" && renderTextOptions()}
    </div>
  );
}
