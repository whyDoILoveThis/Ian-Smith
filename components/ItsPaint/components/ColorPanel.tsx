"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePaintState } from "../hooks/usePaintState";
import { RGBAColor, HSLColor } from "../types/types";
import {
  hslToRgba,
  rgbaToHex,
  rgbaToHsl,
  rgbaToString,
  hexToRgba,
} from "../utils/colorUtils";
import { DEFAULT_PALETTE } from "../lib/constants";
import { savePalette, loadPalette } from "../utils/storageUtils";

const rangeCls =
  "appearance-none h-1 rounded-full bg-white/10 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(139,92,246,0.5)]";

function ColorWheel({
  color,
  onChange,
}: {
  color: RGBAColor;
  onChange: (c: RGBAColor) => void;
}) {
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const svRef = useRef<HTMLCanvasElement>(null);
  const [hue, setHue] = useState(() => rgbaToHsl(color).h);
  const HSL = rgbaToHsl(color);

  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const size = canvas.width;
    const center = size / 2;
    const outerR = center - 2;
    const innerR = outerR - 16;

    ctx.clearRect(0, 0, size, size);

    for (let angle = 0; angle < 360; angle++) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(center, center, outerR, startAngle, endAngle);
      ctx.arc(center, center, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }

    const indicatorAngle = ((hue - 90) * Math.PI) / 180;
    const indicatorR = (outerR + innerR) / 2;
    const ix = center + Math.cos(indicatorAngle) * indicatorR;
    const iy = center + Math.sin(indicatorAngle) * indicatorR;
    ctx.beginPath();
    ctx.arc(ix, iy, 6, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ix, iy, 5, 0, Math.PI * 2);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hue]);

  useEffect(() => {
    const canvas = svRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const size = canvas.width;

    const imgData = ctx.createImageData(size, size);
    const half = size / 2;
    const rSq = half * half;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - half;
        const dy = y - half;
        const idx = (y * size + x) * 4;
        if (dx * dx + dy * dy > rSq) {
          imgData.data[idx + 3] = 0;
          continue;
        }
        const s = (x / size) * 100;
        const l = 100 - (y / size) * 100;
        const c = hslToRgba({ h: hue, s, l });
        imgData.data[idx] = c.r;
        imgData.data[idx + 1] = c.g;
        imgData.data[idx + 2] = c.b;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const ix = (HSL.s / 100) * size;
    const iy = ((100 - HSL.l) / 100) * size;
    ctx.beginPath();
    ctx.arc(ix, iy, 5, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ix, iy, 4, 0, Math.PI * 2);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hue, HSL.s, HSL.l]);

  const handleWheelClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = wheelRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - canvas.width / 2;
      const y = e.clientY - rect.top - canvas.height / 2;
      const angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
      const newHue = (angle + 360) % 360;
      setHue(Math.round(newHue));
      onChange(
        hslToRgba({ h: Math.round(newHue), s: HSL.s, l: HSL.l }, color.a),
      );
    },
    [HSL.s, HSL.l, color.a, onChange],
  );

  const handleSVClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = svRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      if (nx * nx + ny * ny > 1) return; // outside circle
      const x = Math.max(0, Math.min(1, (nx + 1) / 2));
      const y = Math.max(0, Math.min(1, (ny + 1) / 2));
      const s = Math.round(x * 100);
      const l = Math.round((1 - y) * 100);
      onChange(hslToRgba({ h: hue, s, l }, color.a));
    },
    [hue, color.a, onChange],
  );

  const handleWheelDrag = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.buttons !== 1) return;
      handleWheelClick(e);
    },
    [handleWheelClick],
  );

  const handleSVDrag = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.buttons !== 1) return;
      handleSVClick(e);
    },
    [handleSVClick],
  );

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <canvas
          ref={wheelRef}
          width={140}
          height={140}
          className="cursor-crosshair rounded-full"
          onClick={handleWheelClick}
          onMouseMove={handleWheelDrag}
        />
        <canvas
          ref={svRef}
          width={80}
          height={80}
          className="absolute cursor-crosshair rounded-full"
          style={{ top: 30, left: 30 }}
          onClick={handleSVClick}
          onMouseMove={handleSVDrag}
        />
      </div>
    </div>
  );
}

const RGB_COLORS: Record<string, string> = {
  r: "rose",
  g: "emerald",
  b: "blue",
};
const RGB_THUMB: Record<string, string> = {
  r: "[&::-webkit-slider-thumb]:bg-rose-400 [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(244,63,94,0.5)]",
  g: "[&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(52,211,153,0.5)]",
  b: "[&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(96,165,250,0.5)]",
};

export default function ColorPanel() {
  const { state, dispatch } = usePaintState();
  const { primaryColor, secondaryColor, savedPalette } = state;
  const [hexInput, setHexInput] = useState(rgbaToHex(primaryColor));
  const [alphaInput, setAlphaInput] = useState(
    Math.round(primaryColor.a * 100),
  );

  useEffect(() => {
    setHexInput(rgbaToHex(primaryColor));
    setAlphaInput(Math.round(primaryColor.a * 100));
  }, [primaryColor]);

  useEffect(() => {
    const saved = loadPalette();
    if (saved && saved.length > 0) {
      // placeholder
    }
  }, []);

  const handleHexChange = useCallback(
    (hex: string) => {
      setHexInput(hex);
      if (/^#?[0-9a-fA-F]{6}$/.test(hex)) {
        const c = hexToRgba(hex, primaryColor.a);
        dispatch({ type: "SET_PRIMARY_COLOR", color: c });
      }
    },
    [primaryColor.a, dispatch],
  );

  const handleAlphaChange = useCallback(
    (val: number) => {
      setAlphaInput(val);
      dispatch({
        type: "SET_PRIMARY_COLOR",
        color: { ...primaryColor, a: val / 100 },
      });
    },
    [primaryColor, dispatch],
  );

  const handleSwap = useCallback(() => {
    dispatch({ type: "SWAP_COLORS" });
  }, [dispatch]);

  const addToPalette = useCallback(() => {
    dispatch({ type: "ADD_PALETTE_COLOR", color: { ...primaryColor } });
    savePalette([...savedPalette, primaryColor]);
  }, [primaryColor, savedPalette, dispatch]);

  return (
    <div className="w-full md:w-56 backdrop-blur-xl bg-white/[0.03] md:border-l border-white/[0.06] flex flex-col select-none">
      <div className="px-3 py-2 border-b border-white/[0.06] hidden md:block">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
          Colors
        </span>
      </div>

      <div className="p-3 flex flex-col gap-3 overflow-y-auto">
        {/* Color wheel */}
        <ColorWheel
          color={primaryColor}
          onChange={(c) => dispatch({ type: "SET_PRIMARY_COLOR", color: c })}
        />

        {/* Primary / Secondary color boxes */}
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12">
            <div
              className="absolute top-0 left-0 w-8 h-8 rounded-lg border-2 border-white/40 shadow-lg z-10 cursor-pointer ring-1 ring-white/10"
              style={{ backgroundColor: rgbaToString(primaryColor) }}
              title="Primary color"
            />
            <div
              className="absolute bottom-0 right-0 w-8 h-8 rounded-lg border-2 border-white/20 shadow cursor-pointer ring-1 ring-white/5"
              style={{ backgroundColor: rgbaToString(secondaryColor) }}
              title="Secondary color"
              onClick={() =>
                dispatch({ type: "SET_PRIMARY_COLOR", color: secondaryColor })
              }
            />
          </div>
          <button
            onClick={handleSwap}
            className="text-[10px] text-white/50 hover:text-white/80 bg-white/[0.06] hover:bg-white/[0.1] rounded-full px-3 py-1 border border-white/[0.06] transition-all active:scale-95"
            title="Swap colors (X)"
          >
            ⇄ Swap
          </button>
        </div>

        {/* Hex */}
        <div className="flex gap-1.5 items-center">
          <label className="text-[10px] text-white/30">Hex</label>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            className="flex-1 bg-white/[0.06] text-white/80 text-[11px] rounded-full px-2.5 py-1 font-mono border border-white/[0.06] outline-none focus:border-violet-400/40"
            maxLength={7}
          />
        </div>
        {/* Alpha */}
        <div className="flex gap-1.5 items-center">
          <label className="text-[10px] text-white/30">Alpha</label>
          <input
            type="number"
            min={0}
            max={100}
            value={alphaInput}
            onChange={(e) => handleAlphaChange(+e.target.value)}
            className="flex-1 bg-white/[0.06] text-white/80 text-[11px] rounded-full px-2.5 py-1 tabular-nums border border-white/[0.06] outline-none text-center focus:border-violet-400/40"
          />
          <span className="text-[10px] text-white/30">%</span>
        </div>

        {/* RGB sliders */}
        <div className="flex flex-col gap-1.5">
          {(["r", "g", "b"] as const).map((ch) => (
            <div key={ch} className="flex items-center gap-1.5">
              <span
                className={`text-[10px] w-3 uppercase font-bold text-${RGB_COLORS[ch]}-400/60`}
              >
                {ch}
              </span>
              <input
                type="range"
                min={0}
                max={255}
                value={primaryColor[ch]}
                onChange={(e) =>
                  dispatch({
                    type: "SET_PRIMARY_COLOR",
                    color: { ...primaryColor, [ch]: +e.target.value },
                  })
                }
                className={`flex-1 h-1.5 ${rangeCls} ${RGB_THUMB[ch]}`}
              />
              <span className="text-[10px] text-white/40 w-6 text-right tabular-nums">
                {primaryColor[ch]}
              </span>
            </div>
          ))}
        </div>

        {/* Palette */}
        <div className="border-t border-white/[0.06] pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-white/30 uppercase tracking-wider">
              Palette
            </span>
            <button
              onClick={addToPalette}
              className="text-[10px] text-violet-400/70 hover:text-violet-400 transition-colors"
              title="Add current color to palette"
            >
              + Add
            </button>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {savedPalette.map((c, i) => (
              <button
                key={i}
                className="w-4 h-4 rounded-full border border-white/10 hover:border-white/40 transition-all hover:scale-125 hover:shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                style={{ backgroundColor: rgbaToString(c) }}
                onClick={() =>
                  dispatch({ type: "SET_PRIMARY_COLOR", color: c })
                }
                onContextMenu={(e) => {
                  e.preventDefault();
                  dispatch({ type: "SET_SECONDARY_COLOR", color: c });
                }}
                title={rgbaToHex(c)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
