// app/components/Li9vocBCec5ziodtdN7qnzZiT7h3XyjYXr.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Li9vocBCec5ziodtdN7qnzZiT7h3XyjYXr.tsx
 *
 * - Always "knows" a current dBm (editable).
 * - You Plan a move: direction + degrees. UI shows "Waiting".
 * - After physically moving, you enter "after" dBm (or keep current) and click Record.
 * - The engine maps fractional-degree offsets into a grid (bilinear weighting),
 *   updates per-cell EMA and confidence, and builds a gaussian-smoothed heatmap.
 * - Very alive UX: status bar, animated badges, recent actions, keyboard arrows,
 *   aria-live status messages and undo/reset.
 *
 * Tweak gridSize / degreesPerCell at top of file or through props.
 */

/* -------------------------
   Small helpers & engine
   ------------------------- */

type MoveDirection = "up" | "down" | "left" | "right";

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

interface Cell {
  estimatedDbm: number; // EMA absolute dBm
  confidence: number;
}

interface SampleRecord {
  azOffsetDeg: number;
  elOffsetDeg: number;
  measuredDbm: number;
  weights: Array<{ ix: number; iy: number; w: number }>;
  timestamp: number;
  direction: MoveDirection | null;
  degrees: number;
}

class MoveMapperEngine {
  grid: Cell[][];
  gridSize: number;
  center: number;
  degreesPerCell: number;
  emaAlpha: number;
  confidenceGainPerUnit: number;
  history: SampleRecord[];

  constructor(gridSize = 121, degreesPerCell = 0.1, emaAlpha = 0.6, confidenceGainPerUnit = 1.0) {
    this.gridSize = gridSize;
    this.center = Math.floor(gridSize / 2);
    this.degreesPerCell = degreesPerCell;
    this.emaAlpha = emaAlpha;
    this.confidenceGainPerUnit = confidenceGainPerUnit;
    this.grid = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => ({ estimatedDbm: NaN, confidence: 0 })));
    this.history = [];
  }

  offsetToGridIndexes(azOffsetDeg: number, elOffsetDeg: number) {
    const fx = this.center + azOffsetDeg / this.degreesPerCell;
    const fy = this.center - elOffsetDeg / this.degreesPerCell;
    return { fx, fy };
  }

  addSampleAtOffset(azOffsetDeg: number, elOffsetDeg: number, measuredDbm: number, direction: MoveDirection | null, degrees: number) {
    const { fx, fy } = this.offsetToGridIndexes(azOffsetDeg, elOffsetDeg);
    const ix0 = Math.floor(fx);
    const iy0 = Math.floor(fy);
    const dx = fx - ix0;
    const dy = fy - iy0;

    const contributions: Array<{ ix: number; iy: number; w: number }> = [];
    const pushCell = (ix: number, iy: number, w: number) => {
      if (ix < 0 || ix >= this.gridSize || iy < 0 || iy >= this.gridSize) return;
      contributions.push({ ix, iy, w });
    };
    // bilinear neighbors
    pushCell(ix0, iy0, (1 - dx) * (1 - dy));
    pushCell(ix0 + 1, iy0, dx * (1 - dy));
    pushCell(ix0, iy0 + 1, (1 - dx) * dy);
    pushCell(ix0 + 1, iy0 + 1, dx * dy);

    for (const c of contributions) {
      const cell = this.grid[c.iy][c.ix];
      const weight = c.w;
      const effAlpha = this.emaAlpha * weight;
      if (!isFinite(cell.estimatedDbm)) cell.estimatedDbm = measuredDbm;
      else cell.estimatedDbm = cell.estimatedDbm + (measuredDbm - cell.estimatedDbm) * effAlpha;
      cell.confidence += this.confidenceGainPerUnit * weight;
    }

    this.history.push({
      azOffsetDeg,
      elOffsetDeg,
      measuredDbm,
      weights: contributions.map((c) => ({ ix: c.ix, iy: c.iy, w: c.w })),
      timestamp: Date.now(),
      direction,
      degrees,
    });
  }

  undoLast() {
    const rec = this.history.pop();
    if (!rec) return;
    for (const w of rec.weights) {
      const c = this.grid[w.iy][w.ix];
      c.confidence = Math.max(0, c.confidence - this.confidenceGainPerUnit * w.w);
      if (c.confidence === 0) c.estimatedDbm = NaN;
    }
  }

  reset() {
    for (let y = 0; y < this.gridSize; y++) for (let x = 0; x < this.gridSize; x++) { this.grid[y][x].estimatedDbm = NaN; this.grid[y][x].confidence = 0; }
    this.history = [];
  }

  snapshot() {
    let minV = Infinity, maxV = -Infinity, peakVal = -Infinity, peakX = this.center, peakY = this.center, totalConf = 0;
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const c = this.grid[y][x];
        if (c.confidence > 0 && isFinite(c.estimatedDbm)) {
          minV = Math.min(minV, c.estimatedDbm);
          maxV = Math.max(maxV, c.estimatedDbm);
          totalConf += c.confidence;
          if (c.estimatedDbm > peakVal) { peakVal = c.estimatedDbm; peakX = x; peakY = y; }
        }
      }
    }
    if (!isFinite(minV)) { minV = NaN; maxV = NaN; peakVal = NaN; }
    return { grid: this.grid, minV, maxV, peakVal, peakX, peakY, totalConf, center: this.center, degreesPerCell: this.degreesPerCell };
  }
}

/* -------------------------
   Live UI component
   ------------------------- */

export default function Li9vocBCec5ziodtdN7qnzZiT7h3XyjYXr({
  gridSize = 121,
  degreesPerCell = 0.1,
  canvasSize = 420,
  defaultTargetDb = 1.32,
}: {
  gridSize?: number;
  degreesPerCell?: number;
  canvasSize?: number;
  defaultTargetDb?: number;
}) {
  // engine
  const engineRef = useRef<MoveMapperEngine | null>(null);

  // UI state
  const [currentDbText, setCurrentDbText] = useState<string>("-70.0");
  const [currentDb, setCurrentDb] = useState<number>(-70.0);
  const measuredSmoothedRef = useRef<number | null>(null);
  const [sampleSmoothingAlpha, setSampleSmoothingAlpha] = useState<number>(0.35);

  const [plannedDirection, setPlannedDirection] = useState<MoveDirection | "">("");
  const [plannedDegrees, setPlannedDegrees] = useState<number>(0.1);
  const [waitingForAfter, setWaitingForAfter] = useState<boolean>(false);

  const [targetDb, setTargetDb] = useState<number>(defaultTargetDb);
  const [statusMessage, setStatusMessage] = useState<string>("Ready");
  const statusLiveRef = useRef<HTMLDivElement | null>(null);

  const [recentActions, setRecentActions] = useState<SampleRecord[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const kernel = useRef(gaussianKernel(2, 1.0)).current;

  // initialize engine
  useEffect(() => {
    engineRef.current = new MoveMapperEngine(gridSize, degreesPerCell, 0.6, 1.0);
    return () => { engineRef.current = null; };
  }, [gridSize, degreesPerCell]);

  // sync text input -> numeric currentDb and smoothed value
  useEffect(() => {
    const v = Number(currentDbText);
    if (Number.isFinite(v)) {
      setCurrentDb(v);
      if (!isFinite(measuredSmoothedRef.current as any)) measuredSmoothedRef.current = v;
      else measuredSmoothedRef.current = measuredSmoothedRef.current! + (v - measuredSmoothedRef.current!) * sampleSmoothingAlpha;
    }
  }, [currentDbText, sampleSmoothingAlpha]);

  // keyboard arrow support (plan & wait -> record using current smoothed value)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { e.preventDefault(); planMoveInternal("up"); }
      else if (e.key === "ArrowDown") { e.preventDefault(); planMoveInternal("down"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); planMoveInternal("left"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); planMoveInternal("right"); }
    };
    // passive:false so preventDefault works (avoid scroll). See MDN for passive listener behavior.
    window.addEventListener("keydown", handler as any, { passive: false });
    return () => window.removeEventListener("keydown", handler as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannedDegrees, sampleSmoothingAlpha]);

  // planning helpers
  function announce(msg: string, polite = true) {
    setStatusMessage(msg);
    // also set aria-live text (role=status is polite)
    if (statusLiveRef.current) statusLiveRef.current.textContent = msg;
  }

  function planMoveInternal(dir: MoveDirection) {
    setPlannedDirection(dir);
    setWaitingForAfter(true);
    announce(`Planned move ${dir.toUpperCase()} by ${plannedDegrees.toFixed(2)}° — perform the move then click Record After Move`);
  }

  // user explicit plan button
  function planMoveClicked() {
    if (!plannedDirection) {
      announce("Choose a direction first");
      return;
    }
    planMoveInternal(plannedDirection as MoveDirection);
  }

  // record after move: measuredDb optional, if not provided use smoothed current
  function recordAfterMove(providedMeasured?: number | null) {
    if (!engineRef.current) return;
    if (!waitingForAfter) {
      announce("No planned move to record — plan a move first");
      return;
    }
    const measured = Number.isFinite(providedMeasured as any)
      ? (providedMeasured as number)
      : (isFinite(measuredSmoothedRef.current as any) ? measuredSmoothedRef.current! : Number(currentDbText));

    if (!Number.isFinite(measured)) {
      announce("Invalid measured dBm — please enter a numeric value");
      setWaitingForAfter(false);
      setPlannedDirection("");
      return;
    }

    // compute offsets
    let azOffset = 0, elOffset = 0;
    const deg = plannedDegrees;
    if (plannedDirection === "left") azOffset = -deg;
    if (plannedDirection === "right") azOffset = deg;
    if (plannedDirection === "up") elOffset = deg;
    if (plannedDirection === "down") elOffset = -deg;

    engineRef.current.addSampleAtOffset(azOffset, elOffset, measured, (plannedDirection as MoveDirection) ?? null, deg);
    setRecentActions((r) => [{ azOffsetDeg: azOffset, elOffsetDeg: elOffset, measuredDbm: measured, weights: engineRef.current!.history.slice(-1)[0].weights, timestamp: Date.now(), direction: plannedDirection as MoveDirection | null, degrees: deg }, ...r].slice(0, 8));
    announce(`Recorded sample: ${measured.toFixed(2)} dBm at ${plannedDegrees.toFixed(2)}° ${plannedDirection?.toUpperCase()}`);
    setWaitingForAfter(false);
    setPlannedDirection("");
  }

  function undoLast() {
    engineRef.current?.undoLast();
    setRecentActions((r) => r.slice(1));
    announce("Undid last sample");
  }

  function resetMap() {
    engineRef.current?.reset();
    setRecentActions([]);
    announce("Map reset");
  }

  // draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const N = engineRef.current?.gridSize ?? gridSize;
    const kernelData = kernel;
    const { kernel: kernelArray, size, radius } = kernelData;

    let rafId: number | null = null;

    function draw() {
      const engine = engineRef.current;
      if (!engine) return;

      // small confidence decay so stale spots fade slightly
      for (let y = 0; y < engine.gridSize; y++) for (let x = 0; x < engine.gridSize; x++) { engine.grid[y][x].confidence = Math.max(0, engine.grid[y][x].confidence - 0.0001); if (engine.grid[y][x].confidence === 0) engine.grid[y][x].estimatedDbm = NaN; }

      // gather arrays
      const values = new Array(N * N).fill(NaN);
      const conf = new Array(N * N).fill(0);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = engine.grid[y][x]; values[y * N + x] = isFinite(c.estimatedDbm) ? c.estimatedDbm : NaN; conf[y * N + x] = c.confidence; }

      // gaussian convolution
      const out = new Array(N * N).fill(NaN);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          let numer = 0, denom = 0;
          for (let ky = -radius; ky <= radius; ky++) {
            for (let kx = -radius; kx <= radius; kx++) {
              const sx = x + kx, sy = y + ky;
              if (sx < 0 || sx >= N || sy < 0 || sy >= N) continue;
              const kval = kernelArray[(ky + radius) * size + (kx + radius)];
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

      // min/max
      let minAbs = Infinity, maxAbs = -Infinity;
      for (let i = 0; i < out.length; i++) { const v = out[i]; if (isFinite(v)) { minAbs = Math.min(minAbs, v); maxAbs = Math.max(maxAbs, v); } }

            if(!canvas || !ctx) return;


      // draw background/heatmap
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (!isFinite(minAbs)) {
        ctx.fillStyle = "#071126"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = "12px ui-monospace, monospace"; ctx.fillText("No samples yet — plan a move and record", 8, 20);
      } else {
        if (minAbs === maxAbs) maxAbs = minAbs + 1e-6;
        const pxPerCellX = w / N, pxPerCellY = h / N;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const v = out[y * N + x]; const normAbs = isFinite(v) ? (v - minAbs) / (maxAbs - minAbs) : 0;
          ctx.fillStyle = heatmapColorForNormalizedValue(Math.sqrt(normAbs));
          ctx.fillRect(x * pxPerCellX, y * pxPerCellY, Math.ceil(pxPerCellX), Math.ceil(pxPerCellY));
        }

        // peak & center & arrow
        let peakIdx = 0, peakVal = -Infinity;
        for (let i = 0; i < out.length; i++) { const v = out[i]; if (isFinite(v) && v > peakVal) { peakVal = v; peakIdx = i; } }
        const peakY = Math.floor(peakIdx / N), peakX = peakIdx % N;
        ctx.strokeStyle = "white"; ctx.lineWidth = 1.5; ctx.strokeRect(peakX * (w / N), peakY * (h / N), w / N, h / N);

        const center = engine.center; const centerX = center * (w / N) + (w / N) / 2; const centerY = center * (h / N) + (h / N) / 2;
        ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.beginPath(); ctx.moveTo(centerX - 8, centerY); ctx.lineTo(centerX + 8, centerY); ctx.moveTo(centerX, centerY - 8); ctx.lineTo(centerX, centerY + 8); ctx.stroke();

        const peakCenterX = peakX * (w / N) + (w / N) / 2; const peakCenterY = peakY * (h / N) + (h / N) / 2;
        const dx = peakCenterX - centerX, dy = peakCenterY - centerY, dist = Math.hypot(dx, dy);
        if (dist > 2) {
          ctx.strokeStyle = "rgba(0,255,255,0.95)"; ctx.fillStyle = "rgba(0,255,255,0.95)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(centerX, centerY);
          const arrowToX = centerX + (dx * (dist - Math.max(pxPerCellX, pxPerCellY) * 0.5)) / dist;
          const arrowToY = centerY + (dy * (dist - Math.max(pxPerCellX, pxPerCellY) * 0.5)) / dist;
          ctx.lineTo(arrowToX, arrowToY); ctx.stroke();
          const angle = Math.atan2(dy, dx), headSize = 8;
          ctx.beginPath(); ctx.moveTo(arrowToX, arrowToY); ctx.lineTo(arrowToX - headSize * Math.cos(angle - Math.PI / 6), arrowToY - headSize * Math.sin(angle - Math.PI / 6)); ctx.lineTo(arrowToX - headSize * Math.cos(angle + Math.PI / 6), arrowToY - headSize * Math.sin(angle + Math.PI / 6)); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.font = "12px ui-monospace, monospace"; ctx.fillText(`Peak: ${peakVal.toFixed(2)} dBm`, 8, 16); ctx.fillText(`Target: ${targetDb.toFixed(2)} dB`, 8, 32);
      }

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    rafRef.current = rafId;
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize, canvasSize, degreesPerCell, targetDb]);

  // small helper: local gradient recommendation using engine grid (fast)
  function recommendedMoveLocal(): MoveDirection | null {
    const engine = engineRef.current;
    if (!engine) return null;
    const N = engine.gridSize;
    const cx = engine.center, cy = engine.center;
    const val = (x: number, y: number) => {
      const xi = Math.max(0, Math.min(N - 1, x)), yi = Math.max(0, Math.min(N - 1, y));
      const c = engine.grid[yi][xi];
      return c.confidence > 0 && isFinite(c.estimatedDbm) ? c.estimatedDbm : NaN;
    };
    const r = val(cx + 1, cy), l = val(cx - 1, cy), u = val(cx, cy - 1), d = val(cx, cy + 1);
    const dx = (isFinite(r) ? r : -Infinity) - (isFinite(l) ? l : -Infinity);
    const dy = (isFinite(d) ? d : -Infinity) - (isFinite(u) ? u : -Infinity);
    if (!isFinite(dx) && !isFinite(dy)) return null;
    const adx = Math.abs(isFinite(dx) ? dx : 0), ady = Math.abs(isFinite(dy) ? dy : 0);
    if (adx < 0.05 && ady < 0.05) return null;
    if (adx > ady) return dx > 0 ? "right" : "left";
    return dy > 0 ? "down" : "up";
  }

  const recMove = recommendedMoveLocal();

  // UI rendering
  return (
    <div className="p-4 bg-zinc-900 rounded-xl border border-sky-700 text-sky-100 max-w-6xl w-full space-y-4">
      <h1 className="text-2xl font-bold">?? Live Move Recorder — very ALIVE</h1>

      {/* status / live announcements */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded ${waitingForAfter ? "bg-amber-600 animate-pulse" : "bg-emerald-600"}`} >
            <strong>{waitingForAfter ? "WAITING" : "READY"}</strong>
          </div>
          <div className="text-sm text-zinc-300">{statusMessage}</div>
        </div>

        <div className="text-xs text-zinc-400">
          Recommended move: <strong>{recMove ? (recMove === "up" ? "?? Up" : recMove === "down" ? "?? Down" : recMove === "left" ? "?? Left" : "?? Right") : "—"}</strong>
        </div>
      </div>

      <div role="status" aria-live="polite" ref={statusLiveRef} className="sr-only" />

      <div className="grid grid-cols-3 gap-4">
        {/* canvas */}
        <div className="col-span-2">
          <div className="text-sm text-zinc-400 mb-2">Heatmap</div>
          <canvas ref={canvasRef} width={canvasSize} height={canvasSize} style={{ width: canvasSize, height: canvasSize, borderRadius: 8, border: "1px solid #123a55", background: "#071126" }} />
        </div>

        {/* controls */}
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-xs text-zinc-400">Current measured dBm</div>
            <input value={currentDbText} onChange={(e) => setCurrentDbText(e.target.value)} className="w-full p-2 bg-zinc-800 rounded font-mono" />
            <div className="flex items-center gap-2 mt-2">
              <div className="text-xs text-zinc-400">Input smoothing a</div>
              <input type="range" min={0.01} max={0.9} step={0.01} value={sampleSmoothingAlpha} onChange={(e) => setSampleSmoothingAlpha(Number(e.target.value))} />
              <div className="text-xs text-zinc-400">{sampleSmoothingAlpha.toFixed(2)}</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-400">Plan move</div>
            <div className="flex gap-2 items-center mt-2">
              <select className="p-2 bg-zinc-800 rounded" value={plannedDirection} onChange={(e) => setPlannedDirection(e.target.value as any)}>
                <option value="">Direction...</option>
                <option value="up">Up ??</option>
                <option value="down">Down ??</option>
                <option value="left">Left ??</option>
                <option value="right">Right ??</option>
              </select>
              <input className="w-24 p-2 bg-zinc-800 rounded font-mono" type="number" step="0.01" value={plannedDegrees} onChange={(e) => setPlannedDegrees(Number(e.target.value))} />
              <div className="text-xs text-zinc-400">deg</div>
            </div>
            <div className="flex gap-2 mt-2">
              <button className="px-3 py-2 bg-sky-600 rounded" onClick={planMoveClicked}>Plan</button>
              <button className="px-3 py-2 bg-emerald-600 rounded" onClick={() => recordAfterMove(null)}>Record After Move</button>
              <button className="px-3 py-2 bg-amber-600 rounded" onClick={() => recordAfterMove(Number(currentDbText))}>Record (use input)</button>
            </div>
            <div className="text-xs text-zinc-400 mt-2">{waitingForAfter ? "Perform the physical move then click Record After Move." : "Plan a move or press arrow keys to plan+record quickly."}</div>
          </div>

          <div>
            <div className="text-xs text-zinc-400">Target baseline (for relative view)</div>
            <div className="flex gap-2 items-center mt-2">
              <input className="p-2 bg-zinc-800 rounded font-mono w-28" type="number" step="0.01" value={targetDb} onChange={(e) => setTargetDb(Number(e.target.value))} />
              <div className="text-xs text-zinc-400">dB</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="px-3 py-2 bg-zinc-800 rounded" onClick={() => { undoLast(); }}>Undo</button>
            <button className="px-3 py-2 bg-red-700 rounded" onClick={() => { resetMap(); }}>Reset</button>
            <button className="px-3 py-2 bg-zinc-700 rounded" onClick={() => { const snap = engineRef.current?.snapshot(); console.log(snap); alert("Snapshot printed to console"); }}>Debug</button>
          </div>

          <div className="bg-zinc-800 p-2 rounded text-xs text-zinc-400">
            <div><strong>Recent</strong></div>
            <div className="mt-2 max-h-36 overflow-auto">
              {recentActions.length === 0 ? <div className="text-xs text-zinc-500">No samples yet</div> : recentActions.map((r, i) => (
                <div key={i} className="text-xs border-b border-zinc-700 py-1">
                  {new Date(r.timestamp).toLocaleTimeString()} — {r.measuredDbm.toFixed(2)} dBm • {r.degrees}° {r.direction?.toUpperCase()}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
