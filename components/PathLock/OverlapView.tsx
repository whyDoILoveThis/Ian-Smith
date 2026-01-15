// app/components/PathLock/OverlapView.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MechanicalState,
  RFFieldAtPoint,
  pointingRFfromTo,
  generateIsoRadii,
  TARGET_DB,
  NULL_DB,
  boresightVectorFromAzTilt,
  bearingElevationFromLOS,
  gainToAppDb,
  captureGate,
  pairedDbFromGains,
} from "./rfEngine";
import PathLearner from "./PathLearner";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * OverlapView — fixed so:
 * - Raw top-dish Airy pattern ALWAYS drawn (faint).
 * - Visual gating (overlay) follows UI slider.
 * - PHYSICAL gating (effective link numbers) uses a safe minimum sharpness
 *   to avoid broken physics when visual sharpness = 0.
 * - Only per-dish intrinsic + per-direction effective dBs shown (no single "live dB").
 */
export default function OverlapView({
  dishA,
  dishB,
}: {
  dishA: MechanicalState;
  dishB: MechanicalState;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [dishOnTop, setDishOnTop] = useState<"A" | "B">("A");
  const [resolution, setResolution] = useState<number>(2);
  const [zoomDeg, setZoomDeg] = useState<number>(12);

  // UI tuning
  const [gateCenter, setGateCenter] = useState<number>(0.6);
  const [gateSharpness, setGateSharpness] = useState<number>(18); // visual sharpness
  const [mapExponent, setMapExponent] = useState<number>(2.2);

  // minimum physical sharpness to avoid broken physics when visual sharpness = 0
  const MIN_PHYSICAL_SHARPNESS = 1.0;

  const debugRef = useRef({
    thetaA: 0,
    thetaB: 0,
    gA: 0,
    gB: 0,
    productRaw: 0,
    productGated: 0,
    usingPositions: false,
    dbA_intrinsic: 0,
    dbB_intrinsic: 0,
    dbAtoB_effective: 0,
    dbBtoA_effective: 0,
    visualSharpness: gateSharpness,
    physicalSharpness: Math.max(gateSharpness, MIN_PHYSICAL_SHARPNESS),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = 420;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const CENTER = SIZE / 2;

    const FIELD_OF_VIEW_DEG = zoomDeg;
    const DEG_PER_PX = FIELD_OF_VIEW_DEG / SIZE;
    const STEP = Math.max(1, resolution);

    ctx.fillStyle = "#020616";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const centerDish = dishOnTop === "A" ? dishA : dishB;
    const otherDish = dishOnTop === "A" ? dishB : dishA;

    const offset = pointingRFfromTo(centerDish, otherDish);
    const dx = offset.x;
    const dy = offset.y;

    const REF_POWER = RFFieldAtPoint({ x: 0, y: 0 }) || 1;

    const rfCache = new Map<string, number>();
    const cachedRF = (x: number, y: number) => {
      const key = `${x.toFixed(4)},${y.toFixed(4)}`;
      const v = rfCache.get(key);
      if (v !== undefined) return v;
      const val = RFFieldAtPoint({ x, y });
      rfCache.set(key, val);
      return val;
    };

    const MIN_DB = -80;
    const MAX_DB = 0;
    function colorForRel(rel: number) {
      const dbRel = 10 * Math.log10(Math.max(rel, 1e-12));
      const t = Math.min(1, Math.max(0, (dbRel - MIN_DB) / (MAX_DB - MIN_DB)));
      if (t <= 0.5) {
        const u = t / 0.5;
        const r = Math.round(3 + (123 - 3) * u);
        const g = Math.round(6 + (57 - 6) * u);
        const b = Math.round(26 + (255 - 26) * u);
        return `rgb(${r},${g},${b})`;
      } else {
        const u = (t - 0.5) / 0.5;
        const r = Math.round(123 + (255 - 123) * u);
        const g = Math.round(57 + (213 - 57) * u);
        const b = Math.round(255 + (77 - 255) * u);
        return `rgb(${r},${g},${b})`;
      }
    }

    // ----------------
    // LAYER 1: raw top-dish Airy pattern (faint) — ALWAYS draw (so lobes are visible)
    // ----------------
    ctx.globalAlpha = 0.28;
    for (let py = 0; py < SIZE; py += STEP) {
      for (let px = 0; px < SIZE; px += STEP) {
        const fx = (px - CENTER) * DEG_PER_PX;
        const fy = (py - CENTER) * DEG_PER_PX;
        const pC = cachedRF(fx, fy);
        if (pC <= 1e-12) continue;
        const rel = pC / REF_POWER;
        ctx.fillStyle = colorForRel(rel);
        ctx.fillRect(px, py, STEP, STEP);
      }
    }
    ctx.globalAlpha = 1;

    // ----------------
    // LAYER 2: gated coupled overlay (visual gating uses UI slider)
    // ----------------
    for (let py = 0; py < SIZE; py += STEP) {
      for (let px = 0; px < SIZE; px += STEP) {
        const fx = (px - CENTER) * DEG_PER_PX;
        const fy = (py - CENTER) * DEG_PER_PX;

        const pC = cachedRF(fx, fy);
        const pO = cachedRF(fx - dx, fy - dy);

        // visual gate (uses UI slider directly so the overlay looks as you set it)
        const visualGateC = captureGate(pC, gateCenter, gateSharpness);
        const visualGateO = captureGate(pO, gateCenter, gateSharpness);

        const coupledVisual = pC * pO * visualGateC * visualGateO;
        if (coupledVisual <= 1e-12) continue;

        const rel = coupledVisual / (REF_POWER * REF_POWER);
        const color = colorForRel(rel);
        ctx.fillStyle = color;
        ctx.fillRect(px, py, STEP, STEP);
      }
    }

    // ----------------
    // iso-rings (per-dish LUT radii remain truthful)
    // ----------------
    const ringThresholds = [
      TARGET_DB + 0.02,
      (TARGET_DB + NULL_DB) / 2,
      NULL_DB - 0.02,
    ];
    const isoCenter =
      generateIsoRadii(centerDish, ringThresholds, {
        maxRadius: Math.max(zoomDeg, 30),
      }) || [];
    const isoOther =
      generateIsoRadii(otherDish, ringThresholds, {
        maxRadius: Math.max(zoomDeg, 30),
      }) || [];

    const drawIso = (
      arr: { db: number; radius: number }[],
      cx: number,
      cy: number,
      stroke: string
    ) => {
      arr.forEach((rObj) => {
        const rPx = Math.max(1, rObj.radius / (DEG_PER_PX || 1));
        ctx.beginPath();
        ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });
    };
    drawIso(isoCenter, CENTER, CENTER, "rgba(255,120,120,0.6)");
    const otherPxX = CENTER + dx / DEG_PER_PX;
    const otherPxY = CENTER + dy / DEG_PER_PX;
    drawIso(isoOther, otherPxX, otherPxY, "rgba(120,255,180,0.55)");

    // boresight cross + optional label
    function drawCross(x: number, y: number, color: string, label?: string) {
      if (!ctx) return;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x + 6, y);
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
      ctx.stroke();
      if (label) {
        ctx.fillStyle = color;
        ctx.font = "bold 11px monospace";
        ctx.fillText(label, x + 8, y - 8);
      }
    }
    if (dishOnTop === "A") {
      drawCross(CENTER, CENTER, "#ff6b6b", "A (TOP)");
      drawCross(otherPxX, otherPxY, "#7ef5c2", "B (OTHER)");
    } else {
      drawCross(CENTER, CENTER, "#ff6b6b", "B (TOP)");
      drawCross(otherPxX, otherPxY, "#7ef5c2", "A (OTHER)");
    }

    // ----------------
    // Debug numbers (use PHYSICAL gating for effective link numbers)
    // ----------------
    const offAtoB = pointingRFfromTo(dishA, dishB);
    const offBtoA = pointingRFfromTo(dishB, dishA);
    const gA = RFFieldAtPoint(offAtoB);
    const gB = RFFieldAtPoint(offBtoA);

    const productRaw = clamp(gA * gB, 0, 1);

    // physical sharpness (clamped to avoid broken physics)
    const physicalSharpness = Math.max(gateSharpness, MIN_PHYSICAL_SHARPNESS);

    const productGated = clamp(
      gA *
        gB *
        captureGate(gA, gateCenter, physicalSharpness) *
        captureGate(gB, gateCenter, physicalSharpness),
      0,
      1
    );

    const dbA_intrinsic = gainToAppDb(gA);
    const dbB_intrinsic = gainToAppDb(gB);

    const dbAtoB_effective = pairedDbFromGains(gA, gB, {
      center: gateCenter,
      sharpness: physicalSharpness,
      exponent: mapExponent,
    });
    const dbBtoA_effective = dbAtoB_effective;

    debugRef.current = {
      thetaA: Math.hypot(offAtoB.x, offAtoB.y),
      thetaB: Math.hypot(offBtoA.x, offBtoA.y),
      gA,
      gB,
      productRaw,
      productGated,
      usingPositions: !!(dishA.position && dishB.position),
      dbA_intrinsic,
      dbB_intrinsic,
      dbAtoB_effective,
      dbBtoA_effective,
      visualSharpness: gateSharpness,
      physicalSharpness,
    };

    // done drawing
  }, [
    dishA,
    dishB,
    dishOnTop,
    resolution,
    zoomDeg,
    gateCenter,
    gateSharpness,
    mapExponent,
  ]);

  // UI & display (neon style)
  const buttonStyle: React.CSSProperties = {
    padding: "6px 10px",
    background: "#071127",
    border: "1px solid #164aee",
    color: "#bfe0ff",
    borderRadius: 8,
    cursor: "pointer",
  };
  const inputStyle: React.CSSProperties = {
    width: 80,
    padding: "6px 8px",
    borderRadius: 8,
    border: "1px solid #164aee",
    background: "#071127",
    color: "#cff0ff",
    outline: "none",
  };

  const dbg = debugRef.current;

  return (
    <div
      style={{
        width: 640,
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#cfe8ff",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: "2px 0 6px 0", color: "#dbeeff" }}>
            📡 Overlap — RF Iso-Ring View
          </h3>
          <div style={{ color: "#9fb", fontSize: 12 }}>
            Fixed-site LOS-aware angular map — zoom, resolution and gate tuning
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            style={buttonStyle}
            onClick={() => setDishOnTop((d) => (d === "A" ? "B" : "A"))}
          >
            Top: {dishOnTop}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 12, color: "#9fb" }}>Zoom°</div>
            <input
              type="range"
              min={4}
              max={40}
              value={zoomDeg}
              onChange={(e) => setZoomDeg(Number(e.target.value))}
              style={{ width: 140 }}
            />
            <input
              type="number"
              value={zoomDeg}
              onChange={(e) =>
                setZoomDeg(clamp(Number(e.target.value) || 4, 4, 40))
              }
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ display: "flex", gap: 6 }}>
              {[4, 2, 1].map((r) => (
                <button
                  key={r}
                  onClick={() => setResolution(r)}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 8,
                    border:
                      resolution === r
                        ? "1px solid #3bd1ff"
                        : "1px solid #164aee",
                    background: resolution === r ? "#03233a" : "#071127",
                    color: resolution === r ? "#bff8ff" : "#9fb",
                    cursor: "pointer",
                  }}
                >
                  {r === 1 ? "MAX" : r === 2 ? "MED" : "LOW"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          width: 420,
          height: 420,
          borderRadius: 8,
          border: "1px solid #203a55",
          display: "block",
        }}
      />

      {/* controls + debug */}
      <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
        <div
          style={{
            padding: 10,
            background: "linear-gradient(180deg,#061221,#04101a)",
            borderRadius: 8,
            border: "1px solid #123b69",
            minWidth: 360,
          }}
        >
          <div style={{ color: "#9fb", fontSize: 12, marginBottom: 6 }}>
            ⚙️ Gate & Mapping Tuning
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div style={{ width: 120, color: "#cfe8ff", fontSize: 12 }}>
              Gate Center
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={gateCenter}
              onChange={(e) => setGateCenter(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              value={gateCenter}
              onChange={(e) =>
                setGateCenter(clamp(Number(e.target.value) || 0, 0, 1))
              }
              style={{ width: 60, ...inputStyle }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div style={{ width: 120, color: "#cfe8ff", fontSize: 12 }}>
              Gate Sharpness (visual)
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={gateSharpness}
              onChange={(e) => setGateSharpness(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              value={gateSharpness}
              onChange={(e) =>
                setGateSharpness(clamp(Number(e.target.value) || 0, 0, 200))
              }
              style={{ width: 60, ...inputStyle }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 120, color: "#cfe8ff", fontSize: 12 }}>
              Map Exponent
            </div>
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={mapExponent}
              onChange={(e) => setMapExponent(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              value={mapExponent}
              onChange={(e) =>
                setMapExponent(clamp(Number(e.target.value) || 1, 1, 6))
              }
              style={{ width: 60, ...inputStyle }}
            />
          </div>

          <div style={{ marginTop: 8, color: "#9fb", fontSize: 12 }}>
            Tip: visual sharpness = 0 looks pretty (overlay glows) but physics
            uses a minimum sharpness so link numbers remain honest.
          </div>
        </div>

        <div
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #123b69",
            background: "#041219",
            color: "#bfeaff",
            minWidth: 240,
          }}
        >
          <div style={{ color: "#9fb", fontSize: 12, marginBottom: 6 }}>
            🔎 Link Metrics
          </div>
          <div style={{ fontSize: 12, color: "#dbeeff" }}>
            Using positions: {dbg.usingPositions ? "yes" : "no"}
          </div>

          <div style={{ fontSize: 12, marginTop: 8 }}>
            θ<sub>A</sub>: <b>{dbg.thetaA.toFixed(3)}°</b> &nbsp; gA:{" "}
            <b>{dbg.gA?.toFixed(6) ?? "0.000000"}</b>
          </div>
          <div style={{ fontSize: 12 }}>
            θ<sub>B</sub>: <b>{dbg.thetaB.toFixed(3)}°</b> &nbsp; gB:{" "}
            <b>{dbg.gB?.toFixed(6) ?? "0.000000"}</b>
          </div>

          <div style={{ fontSize: 12, marginTop: 8 }}>
            product raw: <b>{dbg.productRaw.toFixed(6)}</b>
          </div>
          <div style={{ fontSize: 12 }}>
            product gated (physics): <b>{dbg.productGated.toFixed(6)}</b>
          </div>

          <div style={{ fontSize: 12, marginTop: 10 }}>
            A intrinsic dB: <b>{(dbg.dbA_intrinsic ?? 0).toFixed(4)}</b>
          </div>
          <div style={{ fontSize: 12 }}>
            B intrinsic dB: <b>{(dbg.dbB_intrinsic ?? 0).toFixed(4)}</b>
          </div>

          <div style={{ fontSize: 12, marginTop: 8 }}>
            A→B effective dB: <b>{(dbg.dbAtoB_effective ?? 0).toFixed(4)}</b>
          </div>
          <div style={{ fontSize: 12 }}>
            B→A effective dB: <b>{(dbg.dbBtoA_effective ?? 0).toFixed(4)}</b>
          </div>

          <div style={{ fontSize: 11, marginTop: 8, color: "#9fb" }}>
            visual sharpness: {dbg.visualSharpness.toFixed(2)} • physical
            sharpness used: {dbg.physicalSharpness?.toFixed(2)}
          </div>
        </div>
      </div>
      <PathLearner dishA={dishA} dishB={dishB} />
    </div>
  );
}
