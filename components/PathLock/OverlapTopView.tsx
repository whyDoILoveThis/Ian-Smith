"use client";

import React, { useEffect, useRef, useState } from "react";
import { MechanicalState, RFFieldAtPoint } from "./rfEngine";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * OverlapTopView
 * - Top-down view of two dish cones
 * - Shows approximate intersection with color intensity
 * - Adjustable zoom
 */
export default function OverlapTopView({
  dishA,
  dishB,
  size = 400,
}: {
  dishA: MechanicalState;
  dishB: MechanicalState;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(20); // degrees / map units

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // high-DPI support
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#020616";
    ctx.fillRect(0, 0, size, size);

    const CENTER = size / 2;
    const UNIT_PER_PX = zoom / size; // how many degrees per pixel

    const rfCache = new Map<string, number>();
    const cachedRF = (x: number, y: number) => {
      const key = `${x.toFixed(4)},${y.toFixed(4)}`;
      const v = rfCache.get(key);
      if (v !== undefined) return v;
      const val = RFFieldAtPoint({ x, y });
      rfCache.set(key, val);
      return val;
    };

    function colorForRel(rel: number) {
      const dbRel = 10 * Math.log10(Math.max(rel, 1e-12));
      let t = (dbRel + 60) / 60; // -60dB -> 0, 0dB -> 1
      t = clamp(t, 0, 1);
      const contrastT = Math.pow(t, 0.35);
      if (contrastT <= 0.6) {
        const u = contrastT / 0.6;
        const r = Math.round(6 + (140 - 6) * u);
        const g = Math.round(10 + (40 - 10) * u);
        const b = Math.round(30 + (255 - 30) * u);
        return `rgb(${r},${g},${b})`;
      } else {
        const u = (contrastT - 0.6) / 0.4;
        const r = Math.round(140 + (255 - 140) * u);
        const g = Math.round(40 + (220 - 40) * u);
        const b = Math.round(255 - 200 * u);
        return `rgb(${r},${g},${b})`;
      }
    }

    const STEP = zoom <= 12 ? 1 : 2;

    // draw each pixel by sampling both RF patterns
    for (let py = 0; py < size; py += STEP) {
      for (let px = 0; px < size; px += STEP) {
        // map px,py -> dish-relative degrees
        const xDeg = (px - CENTER) * UNIT_PER_PX;
        const yDeg = (py - CENTER) * UNIT_PER_PX;

        // relative to dish A
        const pA = cachedRF(xDeg, yDeg);
        // relative to dish B
        const pB = cachedRF(
          xDeg - (dishB.azimuth - dishA.azimuth),
          yDeg - (dishB.tilt - dishA.tilt)
        );

        const coupled = pA * pB;
        if (coupled < 1e-6) continue;

        ctx.fillStyle = colorForRel(coupled);
        ctx.fillRect(px, py, STEP, STEP);
      }
    }

    // center cross for each dish
    const drawCross = (x: number, y: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y + 5);
      ctx.stroke();
    };
    drawCross(CENTER, CENTER, "#ff6b6b"); // dish A
    const bX = CENTER + (dishB.azimuth - dishA.azimuth) / UNIT_PER_PX;
    const bY = CENTER + (dishB.tilt - dishA.tilt) / UNIT_PER_PX;
    drawCross(bX, bY, "#7ef5c2"); // dish B
  }, [dishA, dishB, size, zoom]);

  const inputStyle: React.CSSProperties = {
    width: 140,
    padding: "4px 6px",
    borderRadius: 8,
    border: "1px solid #164aee",
    background: "#071127",
    color: "#cff0ff",
    outline: "none",
  };

  return (
    <div
      style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#cfe8ff" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h4 style={{ marginBottom: 6 }}>🗺️ Top-Down RF Intersection</h4>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#9fb" }}>Zoom°</div>
          <input
            type="range"
            min={4}
            max={40}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={inputStyle}
          />
          <input
            type="number"
            value={zoom}
            onChange={(e) => setZoom(clamp(Number(e.target.value) || 4, 4, 40))}
            style={{ ...inputStyle, width: 50 }}
          />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          border: "1px solid #203a55",
          display: "block",
        }}
      />
    </div>
  );
}
