"use client";

import React, { useEffect, useRef, useState } from "react";
import OverlapView2p2 from "@/components/PathLock/v2/OverlapView2p2";
import {
  computeOneWayRxPowerDbm,
  boresightVectorFromAzEl,
} from "@/components/PathLock/v2/rfEnginev2";

/**
 * LearningLobeOverlay — fixed vertical responsiveness
 *
 * - Computes proper off-axis angles from az/el using boresight vectors
 * - Uses computeOneWayRxPowerDbm(txOffAxisDeg, rxOffAxisDeg, distanceMeters)
 * - Everything else (EMA, gaussian smoothing, moves, scroll-lock) retained
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
  confidenceDecay: 0.0005,
};

class LearningLobeEngine {
  grid: LobeCell[][];
  centerIndex: number;
  options: LearningEngineOptions;
  centerAzDeg: number;
  centerElDeg: number;

  constructor(
    centerAzDeg: number,
    centerElDeg: number,
    opts?: Partial<LearningEngineOptions>
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...(opts ?? {}) };
    this.centerIndex = Math.floor(this.options.gridSize / 2);
    this.centerAzDeg = centerAzDeg;
    this.centerElDeg = centerElDeg;
    this.grid = Array.from({ length: this.options.gridSize }, () =>
      Array.from({ length: this.options.gridSize }, () => ({
        estimatedDbm: NaN,
        confidence: 0,
      }))
    );
  }

  addAbsoluteSample(
    sampleAzDeg: number,
    sampleElDeg: number,
    measuredDbm: number
  ) {
    // map offsets relative to initial boresight center (az wraps handled)
    // az offset: smallest signed difference
    let azOffset = sampleAzDeg - this.centerAzDeg;
    while (azOffset <= -180) azOffset += 360;
    while (azOffset > 180) azOffset -= 360;

    const elOffset = sampleElDeg - this.centerElDeg;
    const ix = Math.round(
      this.centerIndex + azOffset / this.options.degreesPerCell
    );
    const iy = Math.round(
      this.centerIndex - elOffset / this.options.degreesPerCell
    ); // y inverted for canvas

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

  // helper: compute both directions properly using boresight vectors and computeOneWayRxPowerDbm
  function computeTwoWayReadings(
    aAz: number,
    aEl: number,
    bAz: number,
    bEl: number
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
      { useRainRateMmPerHour: 0 }
    );
    // For B receives (A->B): tx=A's off-axis, rx=B's off-axis
    const aToB = computeOneWayRxPowerDbm(
      aToB_txOffAxisDeg,
      b_rxOffAxisDeg,
      distanceMeters,
      { useRainRateMmPerHour: 0 }
    );

    // Return numeric received dBm values along with objects if needed
    return { aToB, bToA };
  }

  // init learners and seed with initial readings
  useEffect(() => {
    learnerARef.current = new LearningLobeEngine(
      initialDish1AzimuthDeg,
      initialDish1ElevationDeg,
      {
        gridSize,
        degreesPerCell,
        emaAlpha: 0.6,
        confidenceGain: 1.0,
        confidenceDecay: 0.0005,
      }
    );
    learnerBRef.current = new LearningLobeEngine(
      initialDish2AzimuthDeg,
      initialDish2ElevationDeg,
      {
        gridSize,
        degreesPerCell,
        emaAlpha: 0.6,
        confidenceGain: 1.0,
        confidenceDecay: 0.0005,
      }
    );

    const two = computeTwoWayReadings(
      initialDish1AzimuthDeg,
      initialDish1ElevationDeg,
      initialDish2AzimuthDeg,
      initialDish2ElevationDeg
    );
    const initialA = two.bToA.receivedPowerDbm;
    const initialB = two.aToB.receivedPowerDbm;

    smoothedARef.current = initialA;
    smoothedBRef.current = initialB;

    learnerARef.current.addAbsoluteSample(
      initialDish1AzimuthDeg,
      initialDish1ElevationDeg,
      initialA
    );
    learnerBRef.current.addAbsoluteSample(
      initialDish2AzimuthDeg,
      initialDish2ElevationDeg,
      initialB
    );

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
    bEl = dish2El
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

      learnerARef.current?.decayConfidence();
      learnerBRef.current?.decayConfidence();

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

    // quick EMA update for the changed dish (so sample used is the smoothed value)
    if (activeDish === "A") {
      smoothedARef.current = isFinite(smoothedARef.current!)
        ? smoothedARef.current! +
          (afterAinst - smoothedARef.current!) * smoothedAlpha
        : afterAinst;
      learnerARef.current?.addAbsoluteSample(
        newAaz,
        newAel,
        smoothedARef.current!
      );
    } else {
      smoothedBRef.current = isFinite(smoothedBRef.current!)
        ? smoothedBRef.current! +
          (afterBinst - smoothedBRef.current!) * smoothedAlpha
        : afterBinst;
      learnerBRef.current?.addAbsoluteSample(
        newBaz,
        newBel,
        smoothedBRef.current!
      );
    }
  }

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
          Math.ceil(pxPerCellY)
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
      pxPerCellY
    );

    // center crosshair & arrow to peak
    const centerX = learner.centerIndex * pxPerCellX + pxPerCellX / 2,
      centerY = learner.centerIndex * pxPerCellY + pxPerCellY / 2;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY);
    ctx.lineTo(centerX + 8, centerY);
    ctx.moveTo(centerX, centerY - 8);
    ctx.lineTo(centerX, centerY + 8);
    ctx.stroke();

    const peakCenterX = peakX * pxPerCellX + pxPerCellX / 2,
      peakCenterY = peakY * pxPerCellY + pxPerCellY / 2;
    const dx = peakCenterX - centerX,
      dy = peakCenterY - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > 2) {
      ctx.strokeStyle = "rgba(0,255,255,0.95)";
      ctx.fillStyle = "rgba(0,255,255,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      const arrowToX =
        centerX + (dx * (dist - Math.max(pxPerCellX, pxPerCellY) * 0.5)) / dist;
      const arrowToY =
        centerY + (dy * (dist - Math.max(pxPerCellX, pxPerCellY) * 0.5)) / dist;
      ctx.lineTo(arrowToX, arrowToY);
      ctx.stroke();
      const angle = Math.atan2(dy, dx);
      const headSize = 8;
      ctx.beginPath();
      ctx.moveTo(arrowToX, arrowToY);
      ctx.lineTo(
        arrowToX - headSize * Math.cos(angle - Math.PI / 6),
        arrowToY - headSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        arrowToX - headSize * Math.cos(angle + Math.PI / 6),
        arrowToY - headSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillText(`Peak: ${peakVal.toFixed(2)} dBm`, 8, 16);
    ctx.fillText(`Active: Dish ${activeDish}`, 8, 32);

    lastSmoothedOutRef.current = { out, N, minV, maxV };
  }

  // recommended move uses local gradient around center of last smoothed map
  function recommendedMoveForActive(): MoveDirection | null {
    const snapRef = lastSmoothedOutRef.current;
    if (!snapRef || !snapRef.out) return null;
    const { out, N } = snapRef;
    const cx = Math.floor(N / 2),
      cy = Math.floor(N / 2);
    const valAt = (x: number, y: number) => {
      const xi = Math.max(0, Math.min(N - 1, x));
      const yi = Math.max(0, Math.min(N - 1, y));
      return out[yi * N + xi];
    };
    const right = valAt(cx + 1, cy),
      left = valAt(cx - 1, cy),
      up = valAt(cx, cy - 1),
      down = valAt(cx, cy + 1);
    const dx =
      (isFinite(right) ? right : -Infinity) -
      (isFinite(left) ? left : -Infinity);
    const dy =
      (isFinite(down) ? down : -Infinity) - (isFinite(up) ? up : -Infinity);
    if (!isFinite(dx) && !isFinite(dy)) {
      const learner =
        activeDish === "A" ? learnerARef.current : learnerBRef.current;
      if (!learner) return null;
      const snap = learner.getSnapshot();
      const ddx = snap.peakX - learner.centerIndex;
      const ddy = snap.peakY - learner.centerIndex;
      if (Math.abs(ddx) < 1 && Math.abs(ddy) < 1) return null;
      if (Math.abs(ddx) > Math.abs(ddy)) return ddx > 0 ? "right" : "left";
      return ddy > 0 ? "down" : "up";
    }
    const absDx = Math.abs(isFinite(dx) ? dx : 0),
      absDy = Math.abs(isFinite(dy) ? dy : 0);
    if (absDx < 0.05 && absDy < 0.05) return null;
    if (absDx > absDy) return dx > 0 ? "right" : "left";
    return dy > 0 ? "down" : "up";
  }

  const recMove = recommendedMoveForActive();

  function resetLearners() {
    learnerARef.current?.reset();
    learnerBRef.current?.reset();
    smoothedARef.current = null;
    smoothedBRef.current = null;
    lastSmoothedOutRef.current = null;
  }

  return (
    <div className="p-3 rounded-xl bg-zinc-900 border border-sky-700 text-sky-100 w-full max-w-5xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold">🎯 Learning Lobe Overlay</h2>
          <div className="text-xs text-zinc-400">
            Active dish: <strong>{activeDish}</strong> • Grid: {gridSize} •
            Δ°/cell: {degreesPerCell}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveDish((d) => (d === "A" ? "B" : "A"))}
            className="px-2 py-1 bg-sky-700 rounded text-xs"
          >
            Toggle Active Dish
          </button>
          <button
            onClick={() => resetLearners()}
            className="px-2 py-1 bg-red-700 rounded text-xs"
          >
            Reset Learners
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div>
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

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs">Active Dish</div>
              <div className="font-mono text-sm">
                {activeDish === "A"
                  ? `Dish A — az ${dish1Az.toFixed(3)}° / el ${dish1El.toFixed(
                      3
                    )}°`
                  : `Dish B — az ${dish2Az.toFixed(3)}° / el ${dish2El.toFixed(
                      3
                    )}°`}
              </div>
            </div>

            <div>
              <div className="text-xs">Smoothed Rx</div>
              <div className="font-mono text-sm">
                {activeDish === "A"
                  ? `${(smoothedARef.current ?? instantReading("A")).toFixed(
                      3
                    )} dBm`
                  : `${(smoothedBRef.current ?? instantReading("B")).toFixed(
                      3
                    )} dBm`}
              </div>
            </div>

            <div>
              <div className="text-xs">Suggested move</div>
              <div className="text-sm font-bold">
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

          <div className="p-2 bg-zinc-800 rounded">
            <div className="flex flex-col items-center gap-2">
              <div className="grid grid-cols-3 gap-1 items-center">
                <div></div>
                <button
                  onClick={() => performMove("up")}
                  className="px-3 py-1 bg-sky-600 rounded"
                >
                  ⬆️
                </button>
                <div></div>

                <button
                  onClick={() => performMove("left")}
                  className="px-3 py-1 bg-sky-600 rounded"
                >
                  ⬅️
                </button>
                <button
                  onClick={() => performMove("down")}
                  className="px-3 py-1 bg-sky-600 rounded"
                >
                  ⬇️
                </button>
                <button
                  onClick={() => performMove("right")}
                  className="px-3 py-1 bg-sky-600 rounded"
                >
                  ➡️
                </button>
              </div>

              <div className="text-xs text-zinc-400 mt-2">
                Tip: use your keyboard arrows to move the active dish. Arrow
                keys will not scroll the page while in the sim.
              </div>
            </div>
          </div>

          <div className="bg-zinc-800 p-2 rounded">
            <div className="text-xs text-zinc-400 mb-1">
              Learned Lobe Map (active)
            </div>
            <canvas
              ref={overlayCanvasRef}
              width={canvasSize}
              height={canvasSize}
              style={{
                width: canvasSize,
                height: canvasSize,
                borderRadius: 8,
                border: "1px solid #123a55",
              }}
            />
          </div>

          <div className="text-xs text-zinc-400">
            Legend: color = estimated received power (smoothed), white box =
            peak cell, cyan arrow = direction to peak from initial boresight.
          </div>
        </div>
      </div>
    </div>
  );
}
