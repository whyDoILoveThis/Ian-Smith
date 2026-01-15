"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  RFFieldAtPoint,
  MechanicalState,
  TARGET_DB,
  NULL_DB,
} from "./rfEngine";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * DishRFField — visualizes a single dish RF pattern
 * - No on-canvas textual labels
 * - Higher contrast color mapping to emphasize Airy pattern
 * - Stronger iso-ring rendering (no labels)
 * - Zoom slider (degrees)
 */
export default function DishRFField({
  dish,
  title,
  size = 300,
}: {
  dish: MechanicalState;
  title: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomDeg, setZoomDeg] = useState<number>(20);

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

    const CENTER = size / 2;
    const FIELD_OF_VIEW_DEG = zoomDeg;
    const DEG_PER_PX = FIELD_OF_VIEW_DEG / size;

    // background
    ctx.fillStyle = "#020616";
    ctx.fillRect(0, 0, size, size);

    // small per-render cache for RFFieldAtPoint
    const rfCache = new Map<string, number>();
    const cachedRF = (x: number, y: number) => {
      const key = `${x.toFixed(4)},${y.toFixed(4)}`;
      const v = rfCache.get(key);
      if (v !== undefined) return v;
      const val = RFFieldAtPoint({ x, y });
      rfCache.set(key, val);
      return val;
    };

    // Make heatmap more contrasty and emphasize Airy lobes:
    // - use a narrower dynamic range (MIN_DB closer to 0)
    // - apply a nonlinear boost to highlight peaks
    const MIN_DB = -60; // tighter floor => more visible main lobe and near sidelobes
    const MAX_DB = 0;

    function colorForRel(rel: number) {
      const dbRel = 10 * Math.log10(Math.max(rel, 1e-12));
      let t = (dbRel - MIN_DB) / (MAX_DB - MIN_DB);
      t = Math.min(1, Math.max(0, t));

      // nonlinear contrast boost (makes peaks pop)
      // smaller exponent -> brighter highlight
      const contrastT = Math.pow(t, 0.35);

      // richer, higher-contrast palette
      if (contrastT <= 0.6) {
        const u = contrastT / 0.6;
        // dark-blue -> vibrant purple
        const r = Math.round(6 + (140 - 6) * u);
        const g = Math.round(10 + (40 - 10) * u);
        const b = Math.round(30 + (255 - 30) * u);
        return `rgb(${r},${g},${b})`;
      } else {
        const u = (contrastT - 0.6) / 0.4;
        // purple -> saturated yellow
        const r = Math.round(140 + (255 - 140) * u);
        const g = Math.round(40 + (220 - 40) * u);
        const b = Math.round(255 - 200 * u);
        return `rgb(${r},${g},${b})`;
      }
    }

    // raster sample density: finer when zoomed in
    const STEP = zoomDeg <= 12 ? 1 : 2;

    // heatmap render (centered dish frame)
    for (let py = 0; py < size; py += STEP) {
      for (let px = 0; px < size; px += STEP) {
        const fx = (px - CENTER) * DEG_PER_PX;
        const fy = (py - CENTER) * DEG_PER_PX;

        const pC = cachedRF(fx, fy);
        const rel = pC / (RFFieldAtPoint({ x: 0, y: 0 }) || 1);
        // skip ultra-quiet pixels to save fill calls
        if (rel < 1e-6) continue;

        ctx.fillStyle = colorForRel(rel);
        ctx.fillRect(px, py, STEP, STEP);
      }
    }

    // iso-rings (no textual labels). choose more thresholds to accentuate Airy lobes
    const ringDbLevels = [-1, -3, -6, -10, -15, -22, -30, -40]; // tighter progression shows more lobes

    // function that returns radius in degrees where on-axis decays to given dB
    const radiusFromDb = (db: number) => {
      // search for radius where 10*log10(RFFieldAtPoint) <= db
      let r = 0;
      // fine scan — Airy rings are near main beam so 0..10 deg usually enough
      const maxSearch = Math.max(10, FIELD_OF_VIEW_DEG * 0.75);
      for (let t = 0; t <= maxSearch; t += 0.02) {
        const rel = RFFieldAtPoint({ x: t, y: 0 });
        const val = 10 * Math.log10(rel + 1e-12);
        if (val <= db) {
          r = t;
          break;
        }
      }
      return r;
    };

    // draw rings with increasing thinness and alternating opacity to highlight lobes
    ringDbLevels.forEach((db, i) => {
      const rDeg = radiusFromDb(db);
      if (rDeg <= 0) return;
      const rPx = Math.max(1, rDeg / DEG_PER_PX);

      // ring styling: inner rings bright & thicker, outer rings finer
      const alpha = clamp(0.9 - i * 0.11, 0.15, 0.9);
      const width = clamp(2.2 - i * 0.18, 0.6, 2.2);

      // color shifts slightly with index to make lobes distinct
      const tint = Math.round(160 + i * 18);
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, rPx, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${tint},${220 - i * 16},${
        200 - i * 18
      },${alpha})`;
      ctx.lineWidth = width;
      ctx.stroke();
    });

    // bright crosshair only (no textual label)
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CENTER - 6, CENTER);
    ctx.lineTo(CENTER + 6, CENTER);
    ctx.moveTo(CENTER, CENTER - 6);
    ctx.lineTo(CENTER, CENTER + 6);
    ctx.stroke();

    // subtle vignette to increase perceived contrast
    const grad = ctx.createRadialGradient(
      CENTER,
      CENTER,
      size * 0.1,
      CENTER,
      CENTER,
      size * 0.9
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // (no live dB text — intentionally removed)
  }, [dish, size, zoomDeg]);

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
        <h4 style={{ marginBottom: 6 }}>📡 {title}</h4>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#9fb" }}>Zoom°</div>
          <input
            type="range"
            min={4}
            max={40}
            value={zoomDeg}
            onChange={(e) => setZoomDeg(Number(e.target.value))}
            style={inputStyle}
          />
          <input
            type="number"
            value={zoomDeg}
            onChange={(e) =>
              setZoomDeg(clamp(Number(e.target.value) || 4, 4, 40))
            }
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
