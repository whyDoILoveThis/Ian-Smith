"use client";

/**
 * app/components/OverlapView.tsx
 *
 * - Dual canvas visualizer: left = Dish A perspective (Tech A), right = Dish B perspective (Tech B).
 * - Each pixel shows the actual physical received power (dBm) computed with rfEngine.computeOneWay...
 * - Includes AGC smoothing (displayed meters lag), wind sway oscillation, rain attenuation, MCS mapping.
 * - Explicit variable names and comments for readability.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  dishGainDb,
  fsplDb,
  computeOneWayRxPowerDbm,
  computeBidirectionalLink,
  RF_CONSTANTS,
  computeSnrDb,
  mapSnrToMcsRecommendation,
  boresightVectorFromAzEl,
  degToRad,
  radToDeg,
} from "@/components/PathLock/v2/rfEnginev2";

// Utility helpers
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
  // "insane neon" ramp
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

  // Displayed (smoothed) meter values — what the tech's voltmeter shows (lagging)
  const [displayedRxDbmDishA, setDisplayedRxDbmDishA] = useState<number>(-9999);
  const [displayedRxDbmDishB, setDisplayedRxDbmDishB] = useState<number>(-9999);

  // Internal refs for smoothing and animation
  const latestActualRxDbmARef = useRef<number>(-9999);
  const latestActualRxDbmBRef = useRef<number>(-9999);
  const lastAnimationFrameRef = useRef<number | null>(null);
  const simStartTimeRef = useRef<number | null>(null);

  // Random phase for wind sway per dish (so they don't move in lock-step)
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
    const peakGainDb = dishGainDb(0); // peak gain used to normalize color scale
    const peakGainLinear = dbToLinear(peakGainDb);
    const maxPossibleReceivedDbmForNormalization =
      RF_CONSTANTS.txPowerDbm +
      2 * peakGainDb -
      fsplDb(distanceMeters, frequencyGHz) -
      RF_CONSTANTS.systemLossDb;

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

      // Compute bidirectional boresight angles (center-to-center)
      // We assume the world frame where Dish1 faces +X and Dish2 faces -X by convention.
      const centralThetaADeg = angleBetweenBoresightAndLos(
        instantDish1Az,
        instantDish1El,
        1
      ); // dish1 relative
      const centralThetaBDeg = angleBetweenBoresightAndLos(
        instantDish2Az,
        instantDish2El,
        2
      );

      // For per-canvas rendering we'll create tangent plane basis for top dish and loop over pixels.
      // Reusable function to render one canvas for one top-dish perspective.
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

        // Top boresight vector in 3D
        const topBoresight = boresightVectorFromAzEl(
          topAzInstant,
          topElInstant
        );
        const otherBoresight = boresightVectorFromAzEl(
          otherAzInstant + 180,
          otherElInstant
        ); // other faces opposite direction

        // Create tangent plane axes u,v (orthonormal) for projecting small angular offsets to 3D
        let upReference = [0, 0, 1];
        if (Math.abs(topBoresight[2]) > 0.999) upReference = [0, 1, 0];
        const uAxis = norm(cross(upReference, topBoresight));
        const vAxis = norm(cross(topBoresight, uAxis));

        // Precompute FSPL and rain loss for the current instantaneous state
        const fsplCurrentDb = fsplDb(distanceMeters, frequencyGHz);
        const rainLossDb = rainAttenuationApprox(
          distanceMeters,
          rainRateMmPerHour,
          frequencyGHz
        );

        // For normalization, compute peak theoretical Pr (both boresights aligned)
        const peakPrDbm =
          RF_CONSTANTS.txPowerDbm +
          dishGainDb(0) +
          dishGainDb(0) -
          fsplCurrentDb -
          RF_CONSTANTS.systemLossDb -
          rainLossDb;
        const minShownDbm = peakPrDbm - 50.0; // show down to -50 dB below peak for contrast

        // Loop through pixel grid and compute per-pixel received power (dBm)
        for (let py = 0; py < pixelSize; py += step) {
          for (let px = 0; px < pixelSize; px += step) {
            // Compute angular offset (degrees) from top boresight for this pixel
            const offsetXDeg = (px - halfPixel) * degPerPixel;
            const offsetYDeg = (py - halfPixel) * degPerPixel;
            const radialAngleDeg = Math.hypot(offsetXDeg, offsetYDeg);

            // direction vector for this pixel (approx small-angle expansion):
            const offsetXRad = degToRad(offsetXDeg);
            const offsetYRad = degToRad(offsetYDeg);
            const approxDirection = norm([
              topBoresight[0] + offsetXRad * uAxis[0] + offsetYRad * vAxis[0],
              topBoresight[1] + offsetXRad * uAxis[1] + offsetYRad * vAxis[1],
              topBoresight[2] + offsetXRad * uAxis[2] + offsetYRad * vAxis[2],
            ]);

            // Compute angular offset between this pixel ray and the other dish boresight
            const cosAngleToOther = clamp(
              dot(approxDirection, otherBoresight),
              -1,
              1
            );
            const angleToOtherDeg = radToDeg(Math.acos(cosAngleToOther));

            // --- Replace ad-hoc per-pixel arithmetic with engine call for consistency
            const perPixelResult = computeOneWayRxPowerDbm(
              radialAngleDeg, // tx off-axis
              angleToOtherDeg, // rx off-axis (angle to other boresight)
              distanceMeters,
              { useRainRateMmPerHour: rainRateMmPerHour }
            );
            const perPixelReceivedDbm = perPixelResult.receivedPowerDbm;

            // Map perPixelReceivedDbm to 0..1 for color
            const normalizedForColor = clamp(
              (perPixelReceivedDbm - minShownDbm) / (peakPrDbm - minShownDbm),
              0,
              1
            );

            ctx.fillStyle = heatmapColorForNormalizedValue(
              Math.sqrt(normalizedForColor)
            ); // sqrt for better visual contrast
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

        // compute and return boresight one-way Rx power (this is what the tech's meter reads for center)
        const boresightAngleTopToOtherDeg = angleBetweenVectors(
          topBoresight,
          otherBoresight
        ); // should be ~0 when perfectly aligned

        // Use engine to compute boresight readout so it includes all losses consistently
        const boresightRxObj = computeOneWayRxPowerDbm(
          0, // transmitter is on boresight
          boresightAngleTopToOtherDeg,
          distanceMeters,
          { useRainRateMmPerHour: rainRateMmPerHour }
        );
        return boresightRxObj;
      }

      // ...existing checks ...
      const boresightRxForLeft = renderCanvasForTopDish(
        leftCtx!,
        true,
        instantDish1Az,
        instantDish1El,
        instantDish2Az,
        instantDish2El
      );
      const boresightRxForRight = renderCanvasForTopDish(
        rightCtx!,
        false,
        instantDish2Az,
        instantDish2El,
        instantDish1Az,
        instantDish1El
      );

      // Update latest actual (unstable direct physics reading)
      latestActualRxDbmARef.current = boresightRxForRight.receivedPowerDbm; // Tech A reads what dish A receives (i.e. B->A)
      latestActualRxDbmBRef.current = boresightRxForLeft.receivedPowerDbm; // Tech B reads what dish B receives (i.e. A->B)

      // AGC smoothing: displayedValue := lerp(prevDisplayed, actual, agcResponse)
      setDisplayedRxDbmDishA((prev) => {
        const actual = latestActualRxDbmARef.current;
        if (!isFinite(prev) || Math.abs(prev) > 1e8) return actual;
        return prev + (actual - prev) * clamp(agcResponse, 0.01, 0.9);
      });
      setDisplayedRxDbmDishB((prev) => {
        const actual = latestActualRxDbmBRef.current;
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

  // For UI summary metrics, compute instantaneous bidirectional center metrics (non-smoothed)
  const instantaneousBidirectional = computeBidirectionalLink(
    dish1AzimuthDeg,
    dish2AzimuthDeg,
    distanceMeters,
    { rainRateMmPerHour }
  );
  const snrForA = computeSnrDb(
    instantaneousBidirectional.bToA.receivedPowerDbm,
    RF_CONSTANTS.bandwidthMHz,
    RF_CONSTANTS.noiseFigureDb
  ).snrDb;
  const snrForB = computeSnrDb(
    instantaneousBidirectional.aToB.receivedPowerDbm,
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
              📟 <strong>Displayed Rx (smoothed):</strong>{" "}
              <span className="font-mono">
                {displayedRxDbmDishA.toFixed(3)} dBm
              </span>
            </div>
            <div>
              ⚡ <strong>Instant Rx (physics):</strong>{" "}
              <span className="font-mono">
                {instantaneousBidirectional.bToA.receivedPowerDbm.toFixed(3)}{" "}
                dBm
              </span>
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
              📟 <strong>Displayed Rx (smoothed):</strong>{" "}
              <span className="font-mono">
                {displayedRxDbmDishB.toFixed(3)} dBm
              </span>
            </div>
            <div>
              ⚡ <strong>Instant Rx (physics):</strong>{" "}
              <span className="font-mono">
                {instantaneousBidirectional.aToB.receivedPowerDbm.toFixed(3)}{" "}
                dBm
              </span>
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
            Heatmaps show per-direction received power (dBm) at each angular
            direction — this is physics, not a normalized UI score.
          </li>
          <li>
            Displayed Rx values are smoothed using AGC smoothing (adjust with
            the AGC slider in the control panel).
          </li>
          <li>
            Wind sway and rain fade affect instantaneous physics; meters reflect
            smoothed measurement like a real voltmeter.
          </li>
        </ul>
      </div>
    </div>
  );
}

// -----------------------------
// Helper wrappers used by this visualizer file
// (kept local to keep main loop readable)
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
  // Delegate to engine's function if available (kept as same behavior). For clarity we compute here:
  // Use small tuned model consistent with lib/rfEngine
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

// angleBetweenBoresightAndLos: convenience approximating boresight->LOS angle for central boresight readouts
function angleBetweenBoresightAndLos(
  azDeg: number,
  elDeg: number,
  dishIndex: 1 | 2
) {
  // Convention: Dish1 faces +X (LOS), Dish2 faces -X. For central LOS use fixed LOS vectors.
  const boresightVec = boresightVectorFromAzEl(azDeg, elDeg);
  const losVecForDish = dishIndex === 1 ? [1, 0, 0] : [-1, 0, 0];
  return angleBetweenVectors(boresightVec, losVecForDish);
}
