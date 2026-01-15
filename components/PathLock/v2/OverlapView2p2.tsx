"use client";

/**
 * app/components/OverlapView.tsx
 *
 * Fixed to use fixed 3D positions for Dish1 and Dish2 and compute line-of-sight (LOS)
 * vectors from those positions. Per-pixel physics uses the LOS, so moving one dish
 * cannot be "recovered" by arbitrarily pointing the other dish unless the boresights
 * align with the true LOS.
 *
 * Kept: AGC smoothing, wind sway, rain fade, MCS mapping, visuals.
 * Removed: separate "instant rx" UI readout. Smoothed state renamed to `db`.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  dishGainDb,
  fsplDb,
  computeOneWayRxPowerDbm,
  RF_CONSTANTS,
  computeSnrDb,
  mapSnrToMcsRecommendation,
  boresightVectorFromAzEl,
  degToRad,
  radToDeg,
} from "@/components/PathLock/v2/rfEnginev2";

// Utility helpers (kept local)
function clamp(value: number, min = -Infinity, max = Infinity) {
  return Math.max(min, Math.min(max, value));
}
function dbToLinear(db: number) {
  return Math.pow(10, db / 10.0);
}
function linearToDb(lin: number) {
  return 10 * Math.log10(Math.max(lin, 1e-30));
}

// Color ramp for heatmap — more contrast near peak
function heatmapColorForNormalizedValue(normalizedValue: number) {
  const v = clamp(normalizedValue, 0, 1);
  const r = Math.round(30 + 225 * v);
  const g = Math.round(20 + 200 * (1 - Math.abs(v - 0.5) * 2));
  const b = Math.round(70 + 160 * (1 - v));
  return `rgb(${r}, ${g}, ${b})`;
}

// Small vector helpers
function dot(a: number[], b: number[]) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function norm(a: number[]) {
  const n = Math.sqrt(dot(a, a)) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
}
function cross(a: number[], b: number[]) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function subtract(a: number[], b: number[]) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function add(a: number[], b: number[]) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function mulScalar(a: number[], s: number) {
  return [a[0] * s, a[1] * s, a[2] * s];
}

// Props for the visualizer
export default function OverlapView({
  dish1AzimuthDeg,
  dish1ElevationDeg,
  dish2AzimuthDeg,
  dish2ElevationDeg,
  distanceMeters,
  topDish = 1,
  canvasPixelSize = 420,
  fieldOfViewDeg = 12,
  rainRateMmPerHour = 0,
  windStrength = 0.0,
  agcResponse = 0.12, // smoothing factor for displayed meters (0..1) higher = faster
}: {
  dish1AzimuthDeg: number;
  dish1ElevationDeg: number;
  dish2AzimuthDeg: number;
  dish2ElevationDeg: number;
  distanceMeters: number;
  topDish?: 1 | 2;
  canvasPixelSize?: number;
  fieldOfViewDeg?: number;
  rainRateMmPerHour?: number;
  windStrength?: number;
  agcResponse?: number;
}) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Displayed (smoothed) meter values — now just called db
  const [dbDishA, setDbDishA] = useState<number>(-9999);
  const [dbDishB, setDbDishB] = useState<number>(-9999);

  // Internal refs for smoothing and animation
  const latestActualDbARef = useRef<number>(-9999);
  const latestActualDbBRef = useRef<number>(-9999);
  const lastAnimationFrameRef = useRef<number | null>(null);
  const simStartTimeRef = useRef<number | null>(null);

  // Random phase for wind sway per dish
  const dishAWindPhase = useRef(Math.random() * Math.PI * 2);
  const dishBWindPhase = useRef(Math.random() * Math.PI * 2);

  // main render + animation loop
  useEffect(() => {
    const leftCanvas = leftCanvasRef.current;
    const rightCanvas = rightCanvasRef.current;
    if (!leftCanvas || !rightCanvas) return;

    const leftCtx = leftCanvas.getContext("2d");
    const rightCtx = rightCanvas.getContext("2d");
    if (!leftCtx || !rightCtx) return;

    const pixelSize = canvasPixelSize;
    leftCanvas.width = pixelSize;
    leftCanvas.height = pixelSize;
    rightCanvas.width = pixelSize;
    rightCanvas.height = pixelSize;

    const halfPixel = pixelSize / 2;
    const degPerPixel = fieldOfViewDeg / pixelSize;
    const step = 3; // pixel step for speed / fidelity tradeoff

    // Prepare static constants
    const frequencyGHz = RF_CONSTANTS.frequencyGHz;
    const peakGainDb = dishGainDb(0); // for potential normalization
    const fsplCurrentDbConst = fsplDb(distanceMeters, frequencyGHz);

    // Fixed positions in 3D (Dish1 at origin, Dish2 at +X distance)
    const dish1Pos = [0, 0, 0] as [number, number, number];
    const dish2Pos = [distanceMeters, 0, 0] as [number, number, number];

    // compute LOS vectors once per frame (unit vectors)
    function computeLosVectors() {
      const losAtoB = norm(subtract(dish2Pos, dish1Pos));
      const losBtoA = norm(subtract(dish1Pos, dish2Pos));
      return { losAtoB, losBtoA };
    }

    // animation function
    function drawFrame(timestampMs: number) {
      if (simStartTimeRef.current === null)
        simStartTimeRef.current = timestampMs;
      const elapsedSeconds =
        (timestampMs - (simStartTimeRef.current || 0)) / 1000.0;

      // Apply wind sway as tiny angular oscillation (deg)
      const windOscillationDishADeg =
        Math.sin(elapsedSeconds * 0.4 + dishAWindPhase.current) * windStrength;
      const windOscillationDishBDeg =
        Math.cos(elapsedSeconds * 0.33 + dishBWindPhase.current) * windStrength;

      // Effective instantaneous pointing angles including wind sway
      const instantDish1Az = dish1AzimuthDeg + windOscillationDishADeg;
      const instantDish1El = dish1ElevationDeg + windOscillationDishADeg * 0.15; // tilt coupling small
      const instantDish2Az = dish2AzimuthDeg + windOscillationDishBDeg;
      const instantDish2El = dish2ElevationDeg + windOscillationDishBDeg * 0.15;

      // Compute LOS vectors (true geometry)
      const { losAtoB, losBtoA } = computeLosVectors();

      // For per-canvas rendering we'll create tangent plane basis for top dish and loop over pixels.
      function renderCanvasForTopDish(
        ctx: CanvasRenderingContext2D,
        topIsDish1: boolean,
        topAzInstant: number,
        topElInstant: number,
        otherAzInstant: number,
        otherElInstant: number
      ) {
        // Clear background
        ctx.fillStyle = "#03061a";
        ctx.fillRect(0, 0, pixelSize, pixelSize);

        // Top boresight vector in 3D (unit)
        const topBoresight = boresightVectorFromAzEl(
          topAzInstant,
          topElInstant
        );
        const otherBoresight = boresightVectorFromAzEl(
          otherAzInstant,
          otherElInstant
        );

        // Which LOS applies here?
        const losFromTopToOther = topIsDish1 ? losAtoB : losBtoA;
        const losFromOtherToTop = topIsDish1 ? losBtoA : losAtoB;

        // Create tangent plane axes u,v (orthonormal) for projecting small angular offsets to 3D
        let upReference = [0, 0, 1];
        if (Math.abs(topBoresight[2]) > 0.999) upReference = [0, 1, 0];
        const uAxis = norm(cross(upReference, topBoresight));
        const vAxis = norm(cross(topBoresight, uAxis));

        // Precompute rain loss for the current instantaneous state
        const rainLossDb = rainAttenuationApprox(
          distanceMeters,
          rainRateMmPerHour,
          frequencyGHz
        );

        // For normalization, compute peak theoretical Pr (both boresights aligned to LOS)
        const peakPrDbm =
          RF_CONSTANTS.txPowerDbm +
          dishGainDb(0) +
          dishGainDb(0) -
          fsplCurrentDbConst -
          RF_CONSTANTS.systemLossDb -
          rainLossDb;
        const minShownDbm = peakPrDbm - 50.0; // show down to -50 dB below peak for contrast

        // Precompute the rx off-axis angle for the other dish relative to true LOS (constant across pixels)
        const otherRxOffAxisDeg = angleBetweenVectors(
          otherBoresight,
          losFromOtherToTop
        );

        // Loop through pixel grid and compute per-pixel received power (dBm)
        for (let py = 0; py < pixelSize; py += step) {
          for (let px = 0; px < pixelSize; px += step) {
            // Compute angular offset (degrees) from top boresight for this pixel
            const offsetXDeg = (px - halfPixel) * degPerPixel;
            const offsetYDeg = (py - halfPixel) * degPerPixel;
            const radialAngleDeg = Math.hypot(offsetXDeg, offsetYDeg);

            // Small-angle approx direction vector for this pixel
            const offsetXRad = degToRad(offsetXDeg);
            const offsetYRad = degToRad(offsetYDeg);
            const approxDirection = norm([
              topBoresight[0] + offsetXRad * uAxis[0] + offsetYRad * vAxis[0],
              topBoresight[1] + offsetXRad * uAxis[1] + offsetYRad * vAxis[1],
              topBoresight[2] + offsetXRad * uAxis[2] + offsetYRad * vAxis[2],
            ]);

            // --- CORRECT PHYSICS: angles computed RELATIVE TO TRUE LOS BETWEEN FIXED POSITIONS
            const perPixelTxOffAxisDeg = angleBetweenVectors(
              approxDirection,
              losFromTopToOther
            );
            const perPixelRxOffAxisDeg = otherRxOffAxisDeg;

            // Compute physics via engine
            const perPixelResult = computeOneWayRxPowerDbm(
              perPixelTxOffAxisDeg,
              perPixelRxOffAxisDeg,
              distanceMeters,
              { useRainRateMmPerHour: rainRateMmPerHour }
            );
            const perPixelReceivedDbm = perPixelResult.receivedPowerDbm;

            // Map to 0..1 for color
            const normalizedForColor = clamp(
              (perPixelReceivedDbm - minShownDbm) / (peakPrDbm - minShownDbm),
              0,
              1
            );

            ctx.fillStyle = heatmapColorForNormalizedValue(
              Math.sqrt(normalizedForColor)
            );
            ctx.fillRect(px, py, step, step);
          }
        }

        // draw crosshair for boresight center
        ctx.strokeStyle = "rgba(255,255,255,0.92)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(halfPixel - 10, halfPixel);
        ctx.lineTo(halfPixel + 10, halfPixel);
        ctx.moveTo(halfPixel, halfPixel - 10);
        ctx.lineTo(halfPixel, halfPixel + 10);
        ctx.stroke();

        // compute and return boresight one-way Rx power (what the tech's meter should read for center)
        const boresightTxOffAxisDeg = angleBetweenVectors(
          topBoresight,
          losFromTopToOther
        );
        const boresightRxOffAxisDeg = angleBetweenVectors(
          otherBoresight,
          losFromOtherToTop
        );

        const boresightRxObj = computeOneWayRxPowerDbm(
          boresightTxOffAxisDeg,
          boresightRxOffAxisDeg,
          distanceMeters,
          { useRainRateMmPerHour: rainRateMmPerHour }
        );

        return boresightRxObj;
      }

      if (!leftCtx || !rightCtx) return;
      // render both canvases
      const boresightRxForLeft = renderCanvasForTopDish(
        leftCtx,
        true,
        instantDish1Az,
        instantDish1El,
        instantDish2Az,
        instantDish2El
      );
      const boresightRxForRight = renderCanvasForTopDish(
        rightCtx,
        false,
        instantDish2Az,
        instantDish2El,
        instantDish1Az,
        instantDish1El
      );

      // Update latest actual (physics)
      // NOTE: mapping: Tech A reads what Dish1 receives (i.e. from Dish2 -> Dish1)
      latestActualDbARef.current = boresightRxForLeft.receivedPowerDbm; // left canvas is Dish1 view -> this is Dish1 receive power
      latestActualDbBRef.current = boresightRxForRight.receivedPowerDbm; // right canvas is Dish2 view -> Dish2 receive power

      // AGC smoothing: displayedValue := lerp(prevDisplayed, actual, agcResponse)
      setDbDishA((prev) => {
        const actual = latestActualDbARef.current;
        if (!isFinite(prev) || Math.abs(prev) > 1e8) return actual;
        return prev + (actual - prev) * clamp(agcResponse, 0.01, 0.9);
      });
      setDbDishB((prev) => {
        const actual = latestActualDbBRef.current;
        if (!isFinite(prev) || Math.abs(prev) > 1e8) return actual;
        return prev + (actual - prev) * clamp(agcResponse, 0.01, 0.9);
      });

      // schedule next frame
      lastAnimationFrameRef.current = requestAnimationFrame(drawFrame);
    }

    // start
    lastAnimationFrameRef.current = requestAnimationFrame(drawFrame);

    // cleanup
    return () => {
      if (lastAnimationFrameRef.current)
        cancelAnimationFrame(lastAnimationFrameRef.current);
      lastAnimationFrameRef.current = null;
      simStartTimeRef.current = null;
    };
    // re-run effect if key props change
  }, [
    dish1AzimuthDeg,
    dish1ElevationDeg,
    dish2AzimuthDeg,
    dish2ElevationDeg,
    distanceMeters,
    canvasPixelSize,
    fieldOfViewDeg,
    rainRateMmPerHour,
    windStrength,
    agcResponse,
  ]);

  // For UI summary metrics, compute instantaneous bidirectional center metrics correctly using fixed positions
  // Use same LOS model as the render loop
  const dish1Pos = [0, 0, 0] as [number, number, number];
  const dish2Pos = [distanceMeters, 0, 0] as [number, number, number];
  const losAtoB = norm(subtract(dish2Pos, dish1Pos));
  const losBtoA = norm(subtract(dish1Pos, dish2Pos));
  const boresightA = boresightVectorFromAzEl(
    dish1AzimuthDeg,
    dish1ElevationDeg
  );
  const boresightB = boresightVectorFromAzEl(
    dish2AzimuthDeg,
    dish2ElevationDeg
  );
  const thetaAtoB = angleBetweenVectors(boresightA, losAtoB);
  const thetaBtoA = angleBetweenVectors(boresightB, losBtoA);
  const aToBObj = computeOneWayRxPowerDbm(
    thetaAtoB,
    thetaBtoA,
    distanceMeters,
    { useRainRateMmPerHour: rainRateMmPerHour }
  );
  const bToAObj = computeOneWayRxPowerDbm(
    thetaBtoA,
    thetaAtoB,
    distanceMeters,
    { useRainRateMmPerHour: rainRateMmPerHour }
  );
  const snrForA = computeSnrDb(
    bToAObj.receivedPowerDbm,
    RF_CONSTANTS.bandwidthMHz,
    RF_CONSTANTS.noiseFigureDb
  ).snrDb;
  const snrForB = computeSnrDb(
    aToBObj.receivedPowerDbm,
    RF_CONSTANTS.bandwidthMHz,
    RF_CONSTANTS.noiseFigureDb
  ).snrDb;
  const mcsForA = mapSnrToMcsRecommendation(snrForA);
  const mcsForB = mapSnrToMcsRecommendation(snrForB);

  // UI rendering (two canvases + metrics)
  return (
    <div className="bg-zinc-900 p-3 rounded-xl border border-sky-800 text-sky-100 flex flex-col gap-3">
      <div className="flex gap-4">
        {/* Left: Tech A (Dish 1) canvas and meter */}
        <div className="flex flex-col items-center">
          <div className="text-sm mb-2 font-semibold">Tech A — Dish 1 View</div>
          <canvas
            ref={leftCanvasRef}
            style={{
              width: canvasPixelSize,
              height: canvasPixelSize,
              borderRadius: 8,
              border: "1px solid #123a55",
            }}
          />
          <div className="mt-2 w-[320px] p-2 bg-zinc-800 rounded text-xs">
            <div>
              📟 <strong>Db (smoothed):</strong>{" "}
              <span className="font-mono">{dbDishA.toFixed(3)} dBm</span>
            </div>
            <div>
              🔊 <strong>SNR:</strong> {snrForA.toFixed(2)} dB •{" "}
              {mcsForA.mcsName} • {mcsForA.comment}
            </div>
          </div>
        </div>

        {/* Right: Tech B (Dish 2) canvas and meter */}
        <div className="flex flex-col items-center">
          <div className="text-sm mb-2 font-semibold">Tech B — Dish 2 View</div>
          <canvas
            ref={rightCanvasRef}
            style={{
              width: canvasPixelSize,
              height: canvasPixelSize,
              borderRadius: 8,
              border: "1px solid #123a55",
            }}
          />
          <div className="mt-2 w-[320px] p-2 bg-zinc-800 rounded text-xs">
            <div>
              📟 <strong>Db (smoothed):</strong>{" "}
              <span className="font-mono">{dbDishB.toFixed(3)} dBm</span>
            </div>
            <div>
              🔊 <strong>SNR:</strong> {snrForB.toFixed(2)} dB •{" "}
              {mcsForB.mcsName} • {mcsForB.comment}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-zinc-400">
        Notes:
        <ul className="list-disc ml-5 mt-1">
          <li>
            Heatmaps now use the <strong>true LOS</strong> between fixed dish
            positions; moving one dish off the true LOS cannot be magically
            recovered by rotating the other.
          </li>
          <li>
            AGC smoothing, wind sway, rain fade, and MCS mapping preserved.
          </li>
        </ul>
      </div>
    </div>
  );
}

// -----------------------------
// Helper wrappers used by this visualizer file
// -----------------------------

function angleBetweenVectors(a: number[], b: number[]) {
  const dotProd = clamp(dot(norm(a), norm(b)), -1, 1);
  return radToDeg(Math.acos(dotProd));
}

// quick rain attenuation approx used in render loop (kept local wrapper to keep code compact)
function rainAttenuationApprox(
  distanceMeters: number,
  rainRateMmPerHour: number,
  frequencyGigahertz: number
) {
  if (rainRateMmPerHour <= 0) return 0;
  const distanceKilometers = Math.max(distanceMeters / 1000.0, 1e-6);
  const coefficientA = 0.0006;
  const exponentB = 1.16;
  const specificAttenuationDbPerKm =
    coefficientA *
    Math.pow(rainRateMmPerHour, exponentB) *
    Math.pow(frequencyGigahertz / 10.0, 0.9);
  return Math.max(0, specificAttenuationDbPerKm * distanceKilometers);
}
