// app/components/ManualLearningLobeOverlay.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * ManualLearningLobeOverlay.tsx
 *
 * - No access to az/el. Only accepts manual direction inputs and measured dBm.
 * - Cursor moves on the grid when you press a direction; the provided dBm (optionally EMA-smoothed)
 *   is recorded at the new cursor cell.
 * - Visual heatmap uses confidence-weighted EMA per cell and Gaussian smoothing for display.
 * - Arrow keys are captured (page scroll prevented) so you can use keyboard to move & log.
 */

type MoveDirection = "up" | "down" | "left" | "right";

interface Cell {
  estimatedDbm: number; // EMA estimate of absolute dBm at that cell (NaN if none)
  confidence: number; // visit strength
}

const DEFAULT_GRID = {
  size: 101, // odd number -> center available; smaller for responsiveness
  degreesPerCell: 0.5, // just metadata (not used for mapping since we don't know az/el)
};

function clamp(n: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, n));
}
function heatmapColorForNormalizedValue(vIn: number) {
  const v = clamp(vIn, 0, 1);
  const r = Math.round(30 + 225 * v);
  const g = Math.round(20 + 200 * (1 - Math.abs(v - 0.5) * 2));
  const b = Math.round(70 + 160 * (1 - v));
  return `rgb(${r}, ${g}, ${b})`;
}
function gaussianKernel(radius = 1, sigma = 1.0) {
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

/* -------------------------
   CORE manual-learning engine
   ------------------------- */
class ManualLearningEngine {
  grid: Cell[][];
  gridSize: number;
  center: number;
  cellEmaAlpha: number; // how fast each cell's stored estimate reacts to new samples
  confidenceGain: number;
  confidenceDecay: number;

  // cursor location in grid coordinates (starts centered)
  cursorX: number;
  cursorY: number;

  constructor(
    gridSize = DEFAULT_GRID.size,
    cellEmaAlpha = 0.6,
    confidenceGain = 1.0,
    confidenceDecay = 0.0005
  ) {
    this.gridSize = gridSize;
    this.center = Math.floor(gridSize / 2);
    this.cellEmaAlpha = cellEmaAlpha;
    this.confidenceGain = confidenceGain;
    this.confidenceDecay = confidenceDecay;
    this.grid = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => ({
        estimatedDbm: NaN,
        confidence: 0,
      }))
    );
    this.cursorX = this.center;
    this.cursorY = this.center;
  }

  // Move cursor by direction and record measured (smoothed) dBm at new location
  moveAndRecord(direction: MoveDirection, measuredDbm: number) {
    // move cursor
    switch (direction) {
      case "up":
        this.cursorY = Math.max(0, this.cursorY - 1);
        break;
      case "down":
        this.cursorY = Math.min(this.gridSize - 1, this.cursorY + 1);
        break;
      case "left":
        this.cursorX = Math.max(0, this.cursorX - 1);
        break;
      case "right":
        this.cursorX = Math.min(this.gridSize - 1, this.cursorX + 1);
        break;
    }

    const cell = this.grid[this.cursorY][this.cursorX];

    if (!isFinite(cell.estimatedDbm)) {
      cell.estimatedDbm = measuredDbm;
    } else {
      cell.estimatedDbm =
        cell.estimatedDbm +
        (measuredDbm - cell.estimatedDbm) * this.cellEmaAlpha;
    }
    cell.confidence += this.confidenceGain;
  }

  // direct write (no move) — useful if you want to log without moving
  recordAtCursor(measuredDbm: number) {
    const cell = this.grid[this.cursorY][this.cursorX];
    if (!isFinite(cell.estimatedDbm)) cell.estimatedDbm = measuredDbm;
    else
      cell.estimatedDbm =
        cell.estimatedDbm +
        (measuredDbm - cell.estimatedDbm) * this.cellEmaAlpha;
    cell.confidence += this.confidenceGain;
  }

  decayConfidence() {
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const c = this.grid[y][x];
        c.confidence = Math.max(0, c.confidence - this.confidenceDecay);
        if (c.confidence === 0) c.estimatedDbm = NaN;
      }
    }
  }

  reset() {
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        this.grid[y][x].estimatedDbm = NaN;
        this.grid[y][x].confidence = 0;
      }
    }
    this.cursorX = this.center;
    this.cursorY = this.center;
  }

  snapshot() {
    let minV = Infinity,
      maxV = -Infinity,
      peakX = this.center,
      peakY = this.center,
      peakVal = -Infinity,
      totalConf = 0;
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const c = this.grid[y][x];
        if (c.confidence > 0 && isFinite(c.estimatedDbm)) {
          minV = Math.min(minV, c.estimatedDbm);
          maxV = Math.max(maxV, c.estimatedDbm);
          totalConf += c.confidence;
          if (c.estimatedDbm > peakVal) {
            peakVal = c.estimatedDbm;
            peakX = x;
            peakY = y;
          }
        }
      }
    }
    if (!isFinite(minV)) {
      minV = 0;
      maxV = 0;
      peakVal = NaN;
    }
    return {
      grid: this.grid,
      minV,
      maxV,
      peakX,
      peakY,
      peakVal,
      totalConf,
      center: this.center,
    };
  }
}

/* -------------------------
   React component
   ------------------------- */
export default function ManualLearningLobeOverlay({
  gridSize = DEFAULT_GRID.size,
  canvasSize = 320,
}: {
  gridSize?: number;
  canvasSize?: number;
}) {
  // engine
  const engineRef = useRef<ManualLearningEngine | null>(null);

  // UI state
  const [measuredDbmInput, setMeasuredDbmInput] = useState<string>("-60.0"); // string so user can paste
  const [sampleSmoothingAlpha, setSampleSmoothingAlpha] =
    useState<number>(0.35); // local EMA of incoming measured value
  const measuredSmoothedRef = useRef<number | null>(null);

  // canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // init engine
  useEffect(() => {
    engineRef.current = new ManualLearningEngine(gridSize, 0.6, 1.0, 0.0005);
    return () => {
      engineRef.current = null;
    };
  }, [gridSize]);

  // keyboard arrows -> move & record using current measuredSmoothedRef
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        cmdMove("up");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        cmdMove("down");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        cmdMove("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        cmdMove("right");
      }
    };
    window.addEventListener("keydown", handler as any, { passive: false });
    return () => window.removeEventListener("keydown", handler as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleSmoothingAlpha, measuredDbmInput]);

  // helper: parse input -> number (NaN if invalid)
  function parseMeasuredInput() {
    const v = Number(measuredDbmInput);
    return Number.isFinite(v) ? v : NaN;
  }

  // command to move in a direction and log the current smoothed measured dBm
  function cmdMove(dir: MoveDirection) {
    const engine = engineRef.current;
    if (!engine) return;
    const rawMeasured = parseMeasuredInput();
    if (!Number.isFinite(rawMeasured)) {
      // If raw invalid, ignore but still move? safer to warn user. We will not move.
      // Here we could show a small UI warning; for now just return.
      return;
    }

    // maintain a local EMA for incoming measured value (so small noise won't ruin vertical)
    if (!isFinite(measuredSmoothedRef.current as any))
      measuredSmoothedRef.current = rawMeasured;
    else
      measuredSmoothedRef.current =
        (measuredSmoothedRef.current as number) +
        (rawMeasured - (measuredSmoothedRef.current as number)) *
          sampleSmoothingAlpha;

    engine.moveAndRecord(dir, measuredSmoothedRef.current as number);
    // trigger a redraw next frame (canvas animation loop handles it)
  }

  // "record without moving" — useful when operator wants to stay & sample
  function cmdRecord() {
    const engine = engineRef.current;
    if (!engine) return;
    const rawMeasured = parseMeasuredInput();
    if (!Number.isFinite(rawMeasured)) return;
    if (!isFinite(measuredSmoothedRef.current as any))
      measuredSmoothedRef.current = rawMeasured;
    else
      measuredSmoothedRef.current =
        (measuredSmoothedRef.current as number) +
        (rawMeasured - (measuredSmoothedRef.current as number)) *
          sampleSmoothingAlpha;
    engine.recordAtCursor(measuredSmoothedRef.current as number);
  }

  // animation / draw loop: gaussian-smooth and paint heatmap + peak + cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const N = engineRef.current?.gridSize ?? gridSize;
    const kernelSpec = gaussianKernel(1, 0.9);

    function draw() {
      const engine = engineRef.current;
      if (!engine) return;
      // decay confidence a tiny bit so old data fades slowly
      engine.decayConfidence();

      const snap = engine.snapshot();
      const grid = snap.grid;
      // prepare arrays
      const values = new Array(N * N).fill(NaN);
      const conf = new Array(N * N).fill(0);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const c = grid[y][x];
          values[y * N + x] = isFinite(c.estimatedDbm) ? c.estimatedDbm : NaN;
          conf[y * N + x] = c.confidence;
        }
      }

      // convolution (confidence-weighted)
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
              const w = kval * cc;
              numer += v * w;
              denom += w;
            }
          }
          out[y * N + x] = denom > 0 ? numer / denom : NaN;
        }
      }

      // find min/max for color normalization
      let minV = Infinity,
        maxV = -Infinity;
      for (let i = 0; i < out.length; i++) {
        const v = out[i];
        if (isFinite(v)) {
          minV = Math.min(minV, v);
          maxV = Math.max(maxV, v);
        }
      }

      if (!ctx || !canvas) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (!isFinite(minV)) {
        // nothing yet
        ctx.fillStyle = "#071126";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "12px ui-monospace, monospace";
        ctx.fillText(
          "No samples yet — provide dBm and press an arrow to move+record",
          8,
          20
        );
      } else {
        if (minV === maxV) maxV = minV + 1e-6;
        const pxPerCellX = w / N;
        const pxPerCellY = h / N;
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

        // peak box
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
        ctx.lineWidth = 1.6;
        ctx.strokeRect(peakX * (w / N), peakY * (h / N), w / N, h / N);

        // cursor rect
        const curX = engine.cursorX,
          curY = engine.cursorY;
        ctx.strokeStyle = "cyan";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(
          curX * (w / N) + 1,
          curY * (h / N) + 1,
          w / N - 2,
          h / N - 2
        );

        // center crosshair
        const center = engine.center;
        const centerX = center * (w / N) + w / N / 2;
        const centerY = center * (h / N) + h / N / 2;
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.moveTo(centerX - 6, centerY);
        ctx.lineTo(centerX + 6, centerY);
        ctx.moveTo(centerX, centerY - 6);
        ctx.lineTo(centerX, centerY + 6);
        ctx.stroke();

        // arrow center->peak
        const peakCenterX = peakX * (w / N) + w / N / 2;
        const peakCenterY = peakY * (h / N) + h / N / 2;
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
            centerX + (dx * (dist - Math.max(w / N, h / N) * 0.5)) / dist;
          const arrowToY =
            centerY + (dy * (dist - Math.max(w / N, h / N) * 0.5)) / dist;
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

        // overlay text
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "12px ui-monospace, monospace";
        ctx.fillText(`Peak: ${peakVal.toFixed(2)} dBm`, 8, 16);
        ctx.fillText(
          `Cursor: ${engine.cursorX - engine.center}, ${
            engine.cursorY - engine.center
          } (rel)`,
          8,
          32
        );

        lastOut = { out, N, minV, maxV }; // store for recommendedMove
      }
      // schedule next frame via RAF (component-level RAF drives continuously)
      rafRef.current = requestAnimationFrame(draw);
    }

    // driver
    let lastOut: any = null;
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize, canvasSize, sampleSmoothingAlpha]);

  // recommended move derived from local gradient around cursor in the last smoothed map
  function recommendedMove(): MoveDirection | null {
    const engine = engineRef.current;
    if (!engine) return null;
    // we'll compute local central differences on the engine.grid (no need for smoothed convolved out)
    const N = engine.gridSize;
    const cx = engine.cursorX;
    const cy = engine.cursorY;
    const val = (x: number, y: number) => {
      const xi = Math.max(0, Math.min(N - 1, x));
      const yi = Math.max(0, Math.min(N - 1, y));
      return engine.grid[yi][xi].confidence > 0 &&
        isFinite(engine.grid[yi][xi].estimatedDbm)
        ? engine.grid[yi][xi].estimatedDbm
        : NaN;
    };
    const right = val(cx + 1, cy),
      left = val(cx - 1, cy),
      up = val(cx, cy - 1),
      down = val(cx, cy + 1);
    const dx =
      (isFinite(right) ? right : -Infinity) -
      (isFinite(left) ? left : -Infinity);
    const dy =
      (isFinite(down) ? down : -Infinity) - (isFinite(up) ? up : -Infinity);
    if (!isFinite(dx) && !isFinite(dy)) return null;
    const absDx = Math.abs(isFinite(dx) ? dx : 0),
      absDy = Math.abs(isFinite(dy) ? dy : 0);
    if (absDx < 0.05 && absDy < 0.05) return null;
    if (absDx > absDy) return dx > 0 ? "right" : "left";
    return dy > 0 ? "down" : "up";
  }

  const rec = recommendedMove();

  return (
    <div className="p-3 rounded-xl bg-zinc-900 border border-sky-700 text-sky-100 w-full max-w-3xl">
      <h1 className="text-2xl font-bold mb-3">
        🖐️ Manual Lobe Mapper — Direction + dBm Only
      </h1>

      <div className="flex gap-4">
        <div>
          <canvas
            ref={canvasRef}
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

        <div className="flex flex-col gap-3 w-[340px]">
          <div>
            <div className="text-xs text-zinc-400">Measured Rx (dBm)</div>
            <input
              value={measuredDbmInput}
              onChange={(e) => setMeasuredDbmInput(e.target.value)}
              className="w-full bg-zinc-800 p-2 rounded font-mono"
              title="Paste or type current measured dBm value here"
            />
            <div className="text-xs text-zinc-500 mt-1">
              Local sample smoothing α: {sampleSmoothingAlpha.toFixed(2)}
            </div>
            <input
              type="range"
              min={0.01}
              max={0.9}
              step={0.01}
              value={sampleSmoothingAlpha}
              onChange={(e) => setSampleSmoothingAlpha(Number(e.target.value))}
            />
          </div>

          <div className="p-2 bg-zinc-800 rounded">
            <div className="grid grid-cols-3 gap-2 items-center">
              <div></div>
              <button
                onClick={() => cmdMove("up")}
                className="px-3 py-2 bg-sky-600 rounded"
              >
                ⬆️
              </button>
              <div></div>

              <button
                onClick={() => cmdMove("left")}
                className="px-3 py-2 bg-sky-600 rounded"
              >
                ⬅️
              </button>
              <button
                onClick={() => cmdRecord()}
                className="px-3 py-2 bg-amber-600 rounded"
              >
                • Record
              </button>
              <button
                onClick={() => cmdMove("right")}
                className="px-3 py-2 bg-sky-600 rounded"
              >
                ➡️
              </button>

              <div></div>
              <button
                onClick={() => cmdMove("down")}
                className="px-3 py-2 bg-sky-600 rounded"
              >
                ⬇️
              </button>
              <div></div>
            </div>

            <div className="text-xs text-zinc-400 mt-2">
              Press arrow keys to move & record (page scroll blocked while
              focused).
            </div>
          </div>

          <div className="bg-zinc-800 p-2 rounded text-xs">
            <div>
              <strong>Cursor (rel):</strong>{" "}
              {engineRef.current
                ? `${engineRef.current.cursorX - engineRef.current.center}, ${
                    engineRef.current.cursorY - engineRef.current.center
                  }`
                : "0,0"}
            </div>
            <div>
              <strong>Recommended move:</strong>{" "}
              {rec
                ? rec === "up"
                  ? "⬆️ Up"
                  : rec === "down"
                  ? "⬇️ Down"
                  : rec === "left"
                  ? "⬅️ Left"
                  : "➡️ Right"
                : "—"}
            </div>
            <div className="mt-2 text-zinc-400">
              How to use: paste your current measured dBm into the box, then
              press an arrow (or click) in the direction you moved; the
              component will move its cursor and store that dBm for the new
              cell. Click ◦ Record to sample in-place without moving.
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => engineRef.current?.reset()}
                className="px-2 py-1 bg-red-700 rounded text-xs"
              >
                Reset Map
              </button>
              <button
                onClick={() => {
                  // quick debug: dump engine center and a few cells to console
                  // eslint-disable-next-line no-console
                  console.log(engineRef.current?.snapshot());
                  alert("Snapshot printed to console.");
                }}
                className="px-2 py-1 bg-zinc-700 rounded text-xs"
              >
                Debug Snapshot
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
