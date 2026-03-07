"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import OverlapView2p2 from "@/components/PathLock/v2/OverlapView2p2";
import {
  computeOneWayRxPowerDbm,
  boresightVectorFromAzEl,
} from "@/components/PathLock/v2/rfEnginev2";
import { useGyroscope } from "@/hooks/useGyroscope";

/**
 * LearningLobeOverlay — true observational learning system
 *
 * Architecture: Two separate layers with a strict information boundary.
 *
 * SIMULATION LAYER (this component):
 *   - Manages dish state (az/el) and calls rfEnginev2 to compute received power.
 *   - This is the "real world" — it knows everything about the RF environment.
 *
 * LEARNING LAYER (LearningLobeEngine class):
 *   - Receives ONLY: movement direction (up/down/left/right) + resulting signal (dBm).
 *   - Does NOT know: absolute azimuth, elevation, LOS direction, or RF model params.
 *   - Tracks a cursor in relative grid space (starting at center).
 *   - Builds a heatmap of observed signal strength from cumulative movement + observations.
 *   - Computes gradient at the cursor for movement suggestions.
 */

// ---------- helpers ----------
type MoveDirection = "up" | "down" | "left" | "right";

function clamp(n: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, n));
}
function radToDeg(rad: number) {
  return (rad * 180) / Math.PI;
}
function dot(a: number[], b: number[]) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function angleBetweenVectorsDeg(a: number[], b: number[]) {
  const da = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1;
  const db = Math.sqrt(b[0] * b[0] + b[1] * b[1] + b[2] * b[2]) || 1;
  const cosv = Math.max(-1, Math.min(1, dot(a, b) / (da * db)));
  return radToDeg(Math.acos(cosv));
}
function heatmapColorForNormalizedValue(vIn: number) {
  const v = clamp(vIn, 0, 1);
  const r = Math.round(30 + 225 * v);
  const g = Math.round(20 + 200 * (1 - Math.abs(v - 0.5) * 2));
  const b = Math.round(70 + 160 * (1 - v));
  return `rgb(${r}, ${g}, ${b})`;
}
function gaussianKernel(radius = 2, sigma = 1.0) {
  const size = radius * 2 + 1;
  const kernel: number[] = new Array(size * size).fill(0);
  const twoSigmaSq = 2 * sigma * sigma;
  let sum = 0;
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const v = Math.exp(-(x * x + y * y) / twoSigmaSq);
      kernel[(y + radius) * size + (x + radius)] = v;
      sum += v;
    }
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
  return { kernel, size, radius };
}

// ---------- learning engine ----------
interface LobeCell {
  estimatedDbm: number;
  confidence: number;
}
interface LearningEngineOptions {
  gridSize: number;
  degreesPerCell: number;
  emaAlpha: number;
  confidenceGain: number;
  confidenceDecay: number;
}
const DEFAULT_OPTIONS: LearningEngineOptions = {
  gridSize: 121,
  degreesPerCell: 0.1,
  emaAlpha: 0.6,
  confidenceGain: 1.0,
  confidenceDecay: 0.08,
};

class LearningLobeEngine {
  grid: LobeCell[][];
  centerIndex: number;
  options: LearningEngineOptions;
  /** Cursor tracks current position in grid space — starts at center, moves with each step */
  cursorX: number;
  cursorY: number;

  constructor(opts?: Partial<LearningEngineOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...(opts ?? {}) };
    this.centerIndex = Math.floor(this.options.gridSize / 2);
    this.cursorX = this.centerIndex;
    this.cursorY = this.centerIndex;
    this.grid = Array.from({ length: this.options.gridSize }, () =>
      Array.from({ length: this.options.gridSize }, () => ({
        estimatedDbm: NaN,
        confidence: 0,
      })),
    );
  }

  /** Record a signal observation at the current cursor position */
  recordObservation(measuredDbm: number) {
    const ix = Math.round(this.cursorX);
    const iy = Math.round(this.cursorY);
    if (
      ix < 0 ||
      ix >= this.options.gridSize ||
      iy < 0 ||
      iy >= this.options.gridSize
    )
      return;

    const cell = this.grid[iy][ix];
    if (!isFinite(cell.estimatedDbm)) cell.estimatedDbm = measuredDbm;
    else
      cell.estimatedDbm =
        cell.estimatedDbm +
        (measuredDbm - cell.estimatedDbm) * this.options.emaAlpha;
    cell.confidence += this.options.confidenceGain;
  }

  /** Move cursor one grid cell in the given direction, then record the observation */
  moveAndRecord(direction: MoveDirection, measuredDbm: number) {
    switch (direction) {
      case "left":
        this.cursorX -= 1;
        break;
      case "right":
        this.cursorX += 1;
        break;
      case "up":
        this.cursorY -= 1;
        break;
      case "down":
        this.cursorY += 1;
        break;
    }
    this.cursorX = clamp(this.cursorX, 0, this.options.gridSize - 1);
    this.cursorY = clamp(this.cursorY, 0, this.options.gridSize - 1);
    this.recordObservation(measuredDbm);
    this.decayConfidence();
  }

  /** Finite-difference gradient at the current cursor position */
  getGradientAtCursor(): { dx: number; dy: number } | null {
    const ix = Math.round(this.cursorX);
    const iy = Math.round(this.cursorY);
    const N = this.options.gridSize;
    const valAt = (x: number, y: number): number => {
      if (x < 0 || x >= N || y < 0 || y >= N) return NaN;
      const c = this.grid[y][x];
      return c.confidence > 0 && isFinite(c.estimatedDbm)
        ? c.estimatedDbm
        : NaN;
    };

    const right = valAt(ix + 1, iy);
    const left = valAt(ix - 1, iy);
    const up = valAt(ix, iy - 1);
    const down = valAt(ix, iy + 1);
    const center = valAt(ix, iy);
    let dx = 0,
      dy = 0,
      hasDx = false,
      hasDy = false;

    if (isFinite(right) && isFinite(left)) {
      dx = right - left;
      hasDx = true;
    } else if (isFinite(right) && isFinite(center)) {
      dx = right - center;
      hasDx = true;
    } else if (isFinite(center) && isFinite(left)) {
      dx = center - left;
      hasDx = true;
    }

    if (isFinite(down) && isFinite(up)) {
      dy = down - up;
      hasDy = true;
    } else if (isFinite(down) && isFinite(center)) {
      dy = down - center;
      hasDy = true;
    } else if (isFinite(center) && isFinite(up)) {
      dy = center - up;
      hasDy = true;
    }

    if (!hasDx && !hasDy) return null;
    return { dx: hasDx ? dx : 0, dy: hasDy ? dy : 0 };
  }

  decayConfidence() {
    const d = this.options.confidenceDecay;
    for (let y = 0; y < this.options.gridSize; y++) {
      for (let x = 0; x < this.options.gridSize; x++) {
        const c = this.grid[y][x];
        c.confidence = Math.max(0, c.confidence - d);
        if (c.confidence === 0) c.estimatedDbm = NaN;
      }
    }
  }

  getSnapshot() {
    let peakDbm = -Infinity;
    let peakX = this.centerIndex;
    let peakY = this.centerIndex;
    let minDbm = Infinity;
    let maxDbm = -Infinity;
    let totalConf = 0;
    for (let y = 0; y < this.options.gridSize; y++) {
      for (let x = 0; x < this.options.gridSize; x++) {
        const c = this.grid[y][x];
        if (c.confidence > 0 && isFinite(c.estimatedDbm)) {
          totalConf += c.confidence;
          if (c.estimatedDbm > peakDbm) {
            peakDbm = c.estimatedDbm;
            peakX = x;
            peakY = y;
          }
          minDbm = Math.min(minDbm, c.estimatedDbm);
          maxDbm = Math.max(maxDbm, c.estimatedDbm);
        }
      }
    }
    if (!isFinite(minDbm)) minDbm = 0;
    if (!isFinite(maxDbm)) maxDbm = 0;
    return {
      grid: this.grid,
      peakX,
      peakY,
      peakDbm: isFinite(peakDbm) ? peakDbm : NaN,
      minDbm,
      maxDbm,
      totalConf,
      centerIndex: this.centerIndex,
      cursorX: this.cursorX,
      cursorY: this.cursorY,
      degreesPerCell: this.options.degreesPerCell,
    };
  }

  reset() {
    for (let y = 0; y < this.options.gridSize; y++) {
      for (let x = 0; x < this.options.gridSize; x++) {
        this.grid[y][x].estimatedDbm = NaN;
        this.grid[y][x].confidence = 0;
      }
    }
    this.cursorX = this.centerIndex;
    this.cursorY = this.centerIndex;
  }
}

// ---------- component ----------
export default function LearningLobeOverlay({
  initialDish1AzimuthDeg = 0,
  initialDish1ElevationDeg = 0,
  initialDish2AzimuthDeg = 180,
  initialDish2ElevationDeg = 0,
  distanceMeters = 1000,
  gridSize = 121,
  degreesPerCell = 0.1,
  canvasSize = 320,
}: {
  initialDish1AzimuthDeg?: number;
  initialDish1ElevationDeg?: number;
  initialDish2AzimuthDeg?: number;
  initialDish2ElevationDeg?: number;
  distanceMeters?: number;
  gridSize?: number;
  degreesPerCell?: number;
  canvasSize?: number;
}) {
  const [dish1Az, setDish1Az] = useState(initialDish1AzimuthDeg);
  const [dish1El, setDish1El] = useState(initialDish1ElevationDeg);
  const [dish2Az, setDish2Az] = useState(initialDish2AzimuthDeg);
  const [dish2El, setDish2El] = useState(initialDish2ElevationDeg);

  const [activeDish, setActiveDish] = useState<"A" | "B">("A");

  // Gyro mode state
  const [gyroMode, setGyroMode] = useState(false);
  const [gyroMoveCount, setGyroMoveCount] = useState(0);

  // Stable ref for performMove so the gyro hook always calls the latest version
  const performMoveRef = useRef<
    (dir: "up" | "down" | "left" | "right") => void
  >(() => {});

  const learnerARef = useRef<LearningLobeEngine | null>(null);
  const learnerBRef = useRef<LearningLobeEngine | null>(null);

  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // smoothed EMA per-dish reading used for learning
  const smoothedARef = useRef<number | null>(null);
  const smoothedBRef = useRef<number | null>(null);
  const smoothedAlpha = 0.25;

  const lastSmoothedOutRef = useRef<{
    out: number[] | null;
    N: number;
    minV: number;
    maxV: number;
  } | null>(null);

  // Gyro hook — quantizes phone rotation into discrete steps matching degreesPerCell
  const gyroStepCallback = useCallback(
    (dir: "up" | "down" | "left" | "right") => {
      performMoveRef.current(dir);
      setGyroMoveCount((c) => c + 1);
    },
    [],
  );

  const gyro = useGyroscope({
    stepDeg: degreesPerCell,
    onStep: gyroStepCallback,
    enabled: gyroMode,
  });

  // helper: compute both directions properly using boresight vectors and computeOneWayRxPowerDbm
  function computeTwoWayReadings(
    aAz: number,
    aEl: number,
    bAz: number,
    bEl: number,
  ) {
    // boresight vectors
    const aBoresight = boresightVectorFromAzEl(aAz, aEl);
    const bBoresight = boresightVectorFromAzEl(bAz, bEl);

    // LOS directions in world frame (convention: Dish1 faces +X towards Dish2; Dish2 faces -X toward Dish1)
    const losFromAtoB = [1, 0, 0]; // vector from dish A toward dish B
    const losFromBtoA = [-1, 0, 0]; // vector from dish B toward dish A

    // Off-axis angles (deg)
    const aToB_txOffAxisDeg = angleBetweenVectorsDeg(aBoresight, losFromAtoB); // A as transmitter -> angle to LOS
    const bToA_txOffAxisDeg = angleBetweenVectorsDeg(bBoresight, losFromBtoA); // B as transmitter -> angle to LOS

    const aToB_rxOffAxisDeg = angleBetweenVectorsDeg(bBoresight, losFromAtoB); // A receives from B: rx off-axis is angle between A's receiving boresight and LOS? careful:
    // For computeOneWayRxPowerDbm(txOff, rxOff, ...) we need tx off-axis (how off B's boresight is relative to LOS) and rx off-axis (how off A's boresight is relative to LOS)
    // So:
    const a_rxOffAxisDeg = angleBetweenVectorsDeg(aBoresight, losFromAtoB); // A's boresight vs LOS to B
    const b_rxOffAxisDeg = angleBetweenVectorsDeg(bBoresight, losFromBtoA); // B's boresight vs LOS to A

    // Now compute one-way using engine: for A receives (B->A): tx=B's off-axis, rx=A's off-axis
    const bToA = computeOneWayRxPowerDbm(
      bToA_txOffAxisDeg,
      a_rxOffAxisDeg,
      distanceMeters,
      { useRainRateMmPerHour: 0 },
    );
    // For B receives (A->B): tx=A's off-axis, rx=B's off-axis
    const aToB = computeOneWayRxPowerDbm(
      aToB_txOffAxisDeg,
      b_rxOffAxisDeg,
      distanceMeters,
      { useRainRateMmPerHour: 0 },
    );

    // Return numeric received dBm values along with objects if needed
    return { aToB, bToA };
  }

  // init learners and seed with initial readings
  useEffect(() => {
    learnerARef.current = new LearningLobeEngine({
      gridSize,
      degreesPerCell,
      emaAlpha: 0.6,
      confidenceGain: 1.0,
      confidenceDecay: 0.0005,
    });
    learnerBRef.current = new LearningLobeEngine({
      gridSize,
      degreesPerCell,
      emaAlpha: 0.6,
      confidenceGain: 1.0,
      confidenceDecay: 0.0005,
    });

    // Seed learners with the initial signal reading (observation at starting position)
    const two = computeTwoWayReadings(
      initialDish1AzimuthDeg,
      initialDish1ElevationDeg,
      initialDish2AzimuthDeg,
      initialDish2ElevationDeg,
    );
    const initialA = two.bToA.receivedPowerDbm;
    const initialB = two.aToB.receivedPowerDbm;

    smoothedARef.current = initialA;
    smoothedBRef.current = initialB;

    // Learner only receives the scalar dBm reading — no coordinates
    learnerARef.current.recordObservation(initialA);
    learnerBRef.current.recordObservation(initialB);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      learnerARef.current = null;
      learnerBRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize, degreesPerCell]);

  // instant reading wrapper (returns smoothed if available fallback to instant)
  function instantReading(
    dish: "A" | "B",
    aAz = dish1Az,
    aEl = dish1El,
    bAz = dish2Az,
    bEl = dish2El,
  ) {
    const two = computeTwoWayReadings(aAz, aEl, bAz, bEl);
    if (dish === "A") return two.bToA.receivedPowerDbm;
    return two.aToB.receivedPowerDbm;
  }

  // animation tick: update smoothed EMA readings, decay learners, draw heatmap
  useEffect(() => {
    let last = performance.now();
    const g = gaussianKernel(2, 1.0);

    function step(now: number) {
      const instA = instantReading("A", dish1Az, dish1El, dish2Az, dish2El);
      const instB = instantReading("B", dish1Az, dish1El, dish2Az, dish2El);

      if (!smoothedARef.current || !smoothedBRef.current) return;
      if (!isFinite(smoothedARef.current)) smoothedARef.current = instA;
      else
        smoothedARef.current =
          smoothedARef.current + (instA - smoothedARef.current) * smoothedAlpha;
      if (!isFinite(smoothedBRef.current)) smoothedBRef.current = instB;
      else
        smoothedBRef.current =
          smoothedBRef.current + (instB - smoothedBRef.current) * smoothedAlpha;

      drawHeatmapSmoothed(g);

      last = now;
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dish1Az, dish1El, dish2Az, dish2El]);

  // perform move: update boresight state, compute new smoothed instant, feed learner with smoothed sample
  function performMove(dir: MoveDirection) {
    const stepDeg = learnerARef.current
      ? learnerARef.current.options.degreesPerCell
      : degreesPerCell;

    let newAaz = dish1Az;
    let newAel = dish1El;
    let newBaz = dish2Az;
    let newBel = dish2El;

    if (activeDish === "A") {
      newAaz =
        dir === "left"
          ? dish1Az - stepDeg
          : dir === "right"
            ? dish1Az + stepDeg
            : dish1Az;
      newAel =
        dir === "up"
          ? dish1El + stepDeg
          : dir === "down"
            ? dish1El - stepDeg
            : dish1El;
      setDish1Az(newAaz);
      setDish1El(newAel);
    } else {
      newBaz =
        dir === "left"
          ? dish2Az - stepDeg
          : dir === "right"
            ? dish2Az + stepDeg
            : dish2Az;
      newBel =
        dir === "up"
          ? dish2El + stepDeg
          : dir === "down"
            ? dish2El - stepDeg
            : dish2El;
      setDish2Az(newBaz);
      setDish2El(newBel);
    }

    // read after move
    const twoAfter = computeTwoWayReadings(newAaz, newAel, newBaz, newBel);
    const afterAinst = twoAfter.bToA.receivedPowerDbm;
    const afterBinst = twoAfter.aToB.receivedPowerDbm;

    // EMA smooth the signal, then pass ONLY direction + dBm to the learner
    if (activeDish === "A") {
      smoothedARef.current = isFinite(smoothedARef.current!)
        ? smoothedARef.current! +
          (afterAinst - smoothedARef.current!) * smoothedAlpha
        : afterAinst;
      // Learner receives only: movement direction + resulting signal
      learnerARef.current?.moveAndRecord(dir, smoothedARef.current!);
    } else {
      smoothedBRef.current = isFinite(smoothedBRef.current!)
        ? smoothedBRef.current! +
          (afterBinst - smoothedBRef.current!) * smoothedAlpha
        : afterBinst;
      // Learner receives only: movement direction + resulting signal
      learnerBRef.current?.moveAndRecord(dir, smoothedBRef.current!);
    }
  }

  // Keep performMoveRef current so gyro callback always calls latest version
  performMoveRef.current = performMove;

  // prevent page scroll on arrow keys and use arrows for moves
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        performMove("up");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        performMove("down");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        performMove("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        performMove("right");
      }
    };
    window.addEventListener("keydown", handler as any, { passive: false });
    return () => window.removeEventListener("keydown", handler as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dish1Az, dish1El, dish2Az, dish2El, activeDish]);

  // draw heatmap (gaussian smoothed) and store lastSmoothedOutRef
  function drawHeatmapSmoothed(kernelSpec: {
    kernel: number[];
    size: number;
    radius: number;
  }) {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const learner =
      activeDish === "A" ? learnerARef.current : learnerBRef.current;
    if (!learner) return;
    const snap = learner.getSnapshot();
    const N = learner.options.gridSize;
    const grid = snap.grid;

    const values = new Array(N * N).fill(NaN);
    const conf = new Array(N * N).fill(0);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const c = grid[y][x];
        values[y * N + x] = isFinite(c.estimatedDbm) ? c.estimatedDbm : NaN;
        conf[y * N + x] = c.confidence;
      }

    const out = new Array(N * N).fill(NaN);
    const { kernel, size, radius } = kernelSpec;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let numer = 0;
        let denom = 0;
        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const sx = x + kx;
            const sy = y + ky;
            if (sx < 0 || sx >= N || sy < 0 || sy >= N) continue;
            const kval = kernel[(ky + radius) * size + (kx + radius)];
            const idx = sy * N + sx;
            const v = values[idx];
            const cc = conf[idx];
            if (!isFinite(v) || cc <= 0) continue;
            const wgt = kval * cc;
            numer += v * wgt;
            denom += wgt;
          }
        }
        out[y * N + x] = denom > 0 ? numer / denom : NaN;
      }
    }

    let minV = Infinity,
      maxV = -Infinity;
    for (let i = 0; i < out.length; i++) {
      const v = out[i];
      if (isFinite(v)) {
        minV = Math.min(minV, v);
        maxV = Math.max(maxV, v);
      }
    }
    if (!isFinite(minV)) {
      ctx.fillStyle = "#071126";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "12px ui-monospace, monospace";
      ctx.fillText("No learned data yet — move active dish with arrows", 8, 20);
      lastSmoothedOutRef.current = { out: null, N, minV: 0, maxV: 0 };
      return;
    }
    if (minV === maxV) maxV = minV + 1e-6;

    const pxPerCellX = w / N,
      pxPerCellY = h / N;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const v = out[y * N + x];
        const norm = isFinite(v) ? (v - minV) / (maxV - minV) : 0;
        ctx.fillStyle = heatmapColorForNormalizedValue(Math.sqrt(norm));
        ctx.fillRect(
          x * pxPerCellX,
          y * pxPerCellY,
          Math.ceil(pxPerCellX),
          Math.ceil(pxPerCellY),
        );
      }
    }

    // legend
    const legendW = 10,
      legendH = Math.min(120, h - 24),
      legendX = w - legendW - 8,
      legendY = 8;
    for (let i = 0; i < legendH; i++) {
      const t = 1 - i / (legendH - 1);
      ctx.fillStyle = heatmapColorForNormalizedValue(Math.sqrt(t));
      ctx.fillRect(legendX, legendY + i, legendW, 1);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.strokeRect(legendX - 1, legendY - 1, legendW + 2, legendH + 2);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillText(`${maxV.toFixed(1)} dBm`, legendX - 58, legendY + 10);
    ctx.fillText(`${minV.toFixed(1)} dBm`, legendX - 58, legendY + legendH - 2);

    // peak
    let peakIdx = 0,
      peakVal = -Infinity;
    for (let i = 0; i < out.length; i++) {
      const v = out[i];
      if (isFinite(v) && v > peakVal) {
        peakVal = v;
        peakIdx = i;
      }
    }
    const peakY = Math.floor(peakIdx / N),
      peakX = peakIdx % N;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      peakX * pxPerCellX,
      peakY * pxPerCellY,
      pxPerCellX,
      pxPerCellY,
    );

    // Start position crosshair (dim white — where the dish started)
    const startPxX = learner.centerIndex * pxPerCellX + pxPerCellX / 2,
      startPxY = learner.centerIndex * pxPerCellY + pxPerCellY / 2;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startPxX - 6, startPxY);
    ctx.lineTo(startPxX + 6, startPxY);
    ctx.moveTo(startPxX, startPxY - 6);
    ctx.lineTo(startPxX, startPxY + 6);
    ctx.stroke();

    // Current cursor crosshair (green — where the dish is NOW)
    const curPxX = learner.cursorX * pxPerCellX + pxPerCellX / 2,
      curPxY = learner.cursorY * pxPerCellY + pxPerCellY / 2;
    ctx.strokeStyle = "rgba(0,255,128,0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(curPxX - 8, curPxY);
    ctx.lineTo(curPxX + 8, curPxY);
    ctx.moveTo(curPxX, curPxY - 8);
    ctx.lineTo(curPxX, curPxY + 8);
    ctx.stroke();

    // Arrow from cursor to peak
    const peakCenterX = peakX * pxPerCellX + pxPerCellX / 2,
      peakCenterY = peakY * pxPerCellY + pxPerCellY / 2;
    const dx = peakCenterX - curPxX,
      dy = peakCenterY - curPxY;
    const dist = Math.hypot(dx, dy);
    if (dist > 2) {
      ctx.strokeStyle = "rgba(0,255,255,0.95)";
      ctx.fillStyle = "rgba(0,255,255,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(curPxX, curPxY);
      const arrowToX =
        curPxX + (dx * (dist - Math.max(pxPerCellX, pxPerCellY) * 0.5)) / dist;
      const arrowToY =
        curPxY + (dy * (dist - Math.max(pxPerCellX, pxPerCellY) * 0.5)) / dist;
      ctx.lineTo(arrowToX, arrowToY);
      ctx.stroke();
      const angle = Math.atan2(dy, dx);
      const headSize = 8;
      ctx.beginPath();
      ctx.moveTo(arrowToX, arrowToY);
      ctx.lineTo(
        arrowToX - headSize * Math.cos(angle - Math.PI / 6),
        arrowToY - headSize * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        arrowToX - headSize * Math.cos(angle + Math.PI / 6),
        arrowToY - headSize * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillText(`Peak: ${peakVal.toFixed(2)} dBm`, 8, 16);
    ctx.fillText(`Active: Dish ${activeDish}`, 8, 32);
    const curRelAz = (
      (learner.cursorX - learner.centerIndex) *
      learner.options.degreesPerCell
    ).toFixed(2);
    const curRelEl = (
      (learner.centerIndex - learner.cursorY) *
      learner.options.degreesPerCell
    ).toFixed(2);
    ctx.fillText(
      `Cursor: \u0394az ${curRelAz}\u00B0 \u0394el ${curRelEl}\u00B0`,
      8,
      48,
    );

    lastSmoothedOutRef.current = { out, N, minV, maxV };
  }

  // Recommended move: gradient at cursor position using only learned observations
  function recommendedMoveForActive(): MoveDirection | null {
    const learner =
      activeDish === "A" ? learnerARef.current : learnerBRef.current;
    if (!learner) return null;

    const grad = learner.getGradientAtCursor();
    if (!grad) {
      // No gradient data at cursor — try pointing toward peak if known
      const snap = learner.getSnapshot();
      if (isFinite(snap.peakDbm)) {
        const ddx = snap.peakX - learner.cursorX;
        const ddy = snap.peakY - learner.cursorY;
        if (Math.abs(ddx) < 1 && Math.abs(ddy) < 1) return null;
        if (Math.abs(ddx) > Math.abs(ddy)) return ddx > 0 ? "right" : "left";
        return ddy > 0 ? "down" : "up";
      }
      return null;
    }

    const { dx, dy } = grad;
    const absDx = Math.abs(dx),
      absDy = Math.abs(dy);
    if (absDx < 0.05 && absDy < 0.05) return null; // plateau
    if (absDx > absDy) return dx > 0 ? "right" : "left";
    return dy > 0 ? "down" : "up";
  }

  const recMove = recommendedMoveForActive();

  function resetLearners() {
    learnerARef.current?.reset();
    learnerBRef.current?.reset();
    // Reset dish angles back to initial positions
    setDish1Az(initialDish1AzimuthDeg);
    setDish1El(initialDish1ElevationDeg);
    setDish2Az(initialDish2AzimuthDeg);
    setDish2El(initialDish2ElevationDeg);
    // Re-seed with initial signal reading
    const two = computeTwoWayReadings(
      initialDish1AzimuthDeg,
      initialDish1ElevationDeg,
      initialDish2AzimuthDeg,
      initialDish2ElevationDeg,
    );
    smoothedARef.current = two.bToA.receivedPowerDbm;
    smoothedBRef.current = two.aToB.receivedPowerDbm;
    learnerARef.current?.recordObservation(smoothedARef.current);
    learnerBRef.current?.recordObservation(smoothedBRef.current);
    lastSmoothedOutRef.current = null;
  }

  return (
    <div className="p-4 lg:p-5 rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] text-sky-100 w-full max-w-7xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-wide bg-gradient-to-r from-sky-300 to-cyan-400 bg-clip-text text-transparent">
            🎯 Learning Lobe Overlay
          </h2>
          <div className="text-[10px] sm:text-xs text-sky-400/50 mt-0.5">
            Active dish: <strong className="text-sky-300">{activeDish}</strong>{" "}
            • Grid: {gridSize} • Δ°/cell: {degreesPerCell}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveDish((d) => (d === "A" ? "B" : "A"))}
            className="px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/25 text-sky-300 text-xs font-medium hover:bg-sky-500/25 hover:border-sky-400/40 active:scale-95 transition-all duration-150"
          >
            Toggle Active Dish
          </button>
          <button
            onClick={async () => {
              if (!gyroMode) {
                // Turning ON — request permission if needed (iOS)
                if (gyro.needsPermission && !gyro.permissionGranted) {
                  const ok = await gyro.requestPermission();
                  if (!ok) return;
                }
                gyro.resetZero();
                setGyroMoveCount(0);
                setGyroMode(true);
              } else {
                setGyroMode(false);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium active:scale-95 transition-all duration-150 ${
              gyroMode
                ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-amber-500/15 border border-amber-500/25 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400/40"
            }`}
          >
            {gyroMode ? "📱 Gyro ON" : "📱 Gyro Mode"}
          </button>
          <button
            onClick={() => resetLearners()}
            className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/25 text-red-300 text-xs font-medium hover:bg-red-500/25 hover:border-red-400/40 active:scale-95 transition-all duration-150"
          >
            Reset Learners
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="w-full">
          <OverlapView2p2
            dish1AzimuthDeg={dish1Az}
            dish1ElevationDeg={dish1El}
            dish2AzimuthDeg={dish2Az}
            dish2ElevationDeg={dish2El}
            distanceMeters={distanceMeters}
            canvasPixelSize={420}
            fieldOfViewDeg={12}
            rainRateMmPerHour={0}
            windStrength={0.0}
            agcResponse={0.12}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 backdrop-blur-sm bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-sky-400/50 uppercase tracking-wider font-medium">
                Active Dish (sim angles)
              </div>
              <div className="font-mono text-xs sm:text-sm text-sky-100 mt-0.5">
                {activeDish === "A"
                  ? `Dish A — az ${dish1Az.toFixed(3)}° / el ${dish1El.toFixed(
                      3,
                    )}°`
                  : `Dish B — az ${dish2Az.toFixed(3)}° / el ${dish2El.toFixed(
                      3,
                    )}°`}
              </div>
              <div className="font-mono text-[10px] sm:text-xs text-emerald-400/80 mt-0.5">
                {(() => {
                  const l =
                    activeDish === "A"
                      ? learnerARef.current
                      : learnerBRef.current;
                  if (!l) return "";
                  const dAz = (
                    (l.cursorX - l.centerIndex) *
                    l.options.degreesPerCell
                  ).toFixed(2);
                  const dEl = (
                    (l.centerIndex - l.cursorY) *
                    l.options.degreesPerCell
                  ).toFixed(2);
                  return `Learner sees: \u0394az ${dAz}\u00B0 / \u0394el ${dEl}\u00B0 from start`;
                })()}
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-sky-400/50 uppercase tracking-wider font-medium">
                Smoothed Rx
              </div>
              <div className="font-mono text-xs sm:text-sm text-sky-100 mt-0.5">
                {activeDish === "A"
                  ? `${(smoothedARef.current ?? instantReading("A")).toFixed(
                      3,
                    )} dBm`
                  : `${(smoothedBRef.current ?? instantReading("B")).toFixed(
                      3,
                    )} dBm`}
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-sky-400/50 uppercase tracking-wider font-medium">
                Suggested move
              </div>
              <div className="text-sm font-bold mt-0.5">
                {recMove
                  ? recMove === "up"
                    ? "⬆️ Up"
                    : recMove === "down"
                      ? "⬇️ Down"
                      : recMove === "left"
                        ? "⬅️ Left"
                        : "➡️ Right"
                  : "—"}
              </div>
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
            {gyroMode ? (
              <div className="flex flex-col gap-3">
                <div className="text-[10px] sm:text-xs text-sky-400/50 uppercase tracking-wider font-medium">
                  Gyro Input
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-2">
                    <div className="text-[10px] text-sky-400/50 uppercase">
                      Δ Azimuth
                    </div>
                    <div className="text-sm font-mono font-bold text-sky-200 mt-0.5">
                      {gyro.deltaAz.toFixed(2)}°
                    </div>
                  </div>
                  <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-2">
                    <div className="text-[10px] text-sky-400/50 uppercase">
                      Δ Elevation
                    </div>
                    <div className="text-sm font-mono font-bold text-sky-200 mt-0.5">
                      {gyro.deltaEl.toFixed(2)}°
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-sky-300/60">
                  <span>
                    Moves:{" "}
                    <span className="font-mono font-bold text-sky-200">
                      {gyroMoveCount}
                    </span>
                  </span>
                  <span
                    className={`flex items-center gap-1 ${gyro.active ? "text-emerald-400" : "text-amber-400"}`}
                  >
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${gyro.active ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}
                    />
                    {gyro.active ? "Tracking" : "Waiting…"}
                  </span>
                </div>

                <button
                  onClick={() => {
                    gyro.resetZero();
                    setGyroMoveCount(0);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-sky-500/15 border border-sky-500/25 text-sky-200 hover:bg-sky-500/30 hover:border-sky-400/40 active:scale-95 transition-all duration-150 text-xs font-medium"
                >
                  Re-zero &amp; Reset
                </button>

                <div className="text-[10px] text-sky-400/30 text-center leading-relaxed">
                  Mount phone to dish bracket — tilt to sweep. Keyboard arrows
                  still work as fallback.
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="grid grid-cols-3 gap-1.5 items-center">
                  <div></div>
                  <button
                    onClick={() => performMove("up")}
                    className="px-4 py-2 rounded-lg bg-sky-500/15 border border-sky-500/25 text-sky-200 hover:bg-sky-500/30 hover:border-sky-400/40 active:scale-90 transition-all duration-150 text-lg"
                  >
                    ⬆️
                  </button>
                  <div></div>

                  <button
                    onClick={() => performMove("left")}
                    className="px-4 py-2 rounded-lg bg-sky-500/15 border border-sky-500/25 text-sky-200 hover:bg-sky-500/30 hover:border-sky-400/40 active:scale-90 transition-all duration-150 text-lg"
                  >
                    ⬅️
                  </button>
                  <button
                    onClick={() => performMove("down")}
                    className="px-4 py-2 rounded-lg bg-sky-500/15 border border-sky-500/25 text-sky-200 hover:bg-sky-500/30 hover:border-sky-400/40 active:scale-90 transition-all duration-150 text-lg"
                  >
                    ⬇️
                  </button>
                  <button
                    onClick={() => performMove("right")}
                    className="px-4 py-2 rounded-lg bg-sky-500/15 border border-sky-500/25 text-sky-200 hover:bg-sky-500/30 hover:border-sky-400/40 active:scale-90 transition-all duration-150 text-lg"
                  >
                    ➡️
                  </button>
                </div>

                <div className="text-[10px] sm:text-xs text-sky-400/40 mt-2 text-center">
                  Tip: use your keyboard arrows to move the active dish. Arrow
                  keys will not scroll the page while in the sim.
                </div>
              </div>
            )}
          </div>

          <div className="backdrop-blur-sm bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
            <div className="text-[10px] sm:text-xs text-sky-400/50 uppercase tracking-wider font-medium mb-2">
              Learned Lobe Map (active)
            </div>
            <canvas
              ref={overlayCanvasRef}
              width={canvasSize}
              height={canvasSize}
              style={{
                width: "100%",
                maxWidth: canvasSize,
                height: "auto",
                aspectRatio: "1 / 1",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
          </div>

          <div className="md:col-span-2 text-[10px] sm:text-xs text-sky-400/40 leading-relaxed">
            Legend: green crosshair = current cursor, dim white crosshair =
            starting position, white box = peak cell, cyan arrow = direction to
            peak from cursor.
          </div>
        </div>
      </div>
    </div>
  );
}
