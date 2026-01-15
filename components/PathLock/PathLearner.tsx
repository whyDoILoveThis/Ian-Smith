"use client";

import React, { useEffect, useRef, useState } from "react";
import type { MechanicalState } from "./rfEngine";
import { computeSignal } from "./rfEngine";

// ------------------------------------------------------------------
// PathLearner.tsx
// A self-contained client component that implements the "learner box".
// It listens to dish state changes (dishA, dishB), records sampled
// "virtual RSSI" measurements (computeSignal), builds a small learning
// buffer, computes local gradient & confidence, and renders a compact
// UI with directional guidance arrows + confidence + sample log.
//
// Drop this file into app/components/PathLock/ and import it where you
// render OverlapView. It expects the same MechanicalState objects you
// already pass the other components.
// ------------------------------------------------------------------

// ---------------- Types ----------------
export type Dir = "LEFT" | "RIGHT" | "UP" | "DOWN" | "HOLD";

type Sample = {
  db: number; // app dB (computeSignal output)
  az: number; // azimuth of primary dish (deg)
  el: number; // tilt of primary dish (deg)
  dir: Dir; // operator-labeled movement direction for this sample
  t: number; // timestamp ms
  dAz?: number; // step size used
  dEl?: number;
};

type Guidance = {
  vx: number; // -1..1 : negative -> move left, positive -> move right
  vy: number; // -1..1 : negative -> move down, positive -> move up
  confidence: number; // 0..1
  suggestedDegX: number; // suggested coarse adjustment deg
  suggestedDegY: number;
  reasoning?: string;
};

// ---------------- PathingEngine class (encapsulates learning) ----------------
class PathingEngine {
  buffer: Sample[] = [];
  maxSamples = 400; // circular buffer
  emaAlpha = 0.25; // smoothing for internal noise estimate
  noiseEst = 0.01; // initial noise (dB)
  // typical angular step we expect operators to use (deg) — updated adaptively
  avgAzStep = 0.5;
  avgElStep = 0.25;

  push(s: Sample) {
    if (this.buffer.length >= this.maxSamples) this.buffer.shift();
    this.buffer.push(s);
    // update adaptive step sizes if provided
    if (typeof s.dAz === "number" && Math.abs(s.dAz) > 1e-6) {
      this.avgAzStep = 0.95 * this.avgAzStep + 0.05 * Math.abs(s.dAz);
    }
    if (typeof s.dEl === "number" && Math.abs(s.dEl) > 1e-6) {
      this.avgElStep = 0.95 * this.avgElStep + 0.05 * Math.abs(s.dEl);
    }
    // update noise estimate via EMA of |delta db|
    if (this.buffer.length > 1) {
      const last = this.buffer[this.buffer.length - 1];
      const prev = this.buffer[this.buffer.length - 2];
      const ev = Math.abs(last.db - prev.db);
      this.noiseEst = (1 - this.emaAlpha) * this.noiseEst + this.emaAlpha * ev;
    }
  }

  clear() {
    this.buffer = [];
  }

  // returns averages per direction
  private averagesByDir() {
    const sums: Record<Dir, { sum: number; count: number }> = {
      LEFT: { sum: 0, count: 0 },
      RIGHT: { sum: 0, count: 0 },
      UP: { sum: 0, count: 0 },
      DOWN: { sum: 0, count: 0 },
      HOLD: { sum: 0, count: 0 },
    };
    for (const s of this.buffer) {
      sums[s.dir].sum += s.db;
      sums[s.dir].count++;
    }
    const avgs: Record<Dir, number> = {
      LEFT: sums.LEFT.count ? sums.LEFT.sum / sums.LEFT.count : NaN,
      RIGHT: sums.RIGHT.count ? sums.RIGHT.sum / sums.RIGHT.count : NaN,
      UP: sums.UP.count ? sums.UP.sum / sums.UP.count : NaN,
      DOWN: sums.DOWN.count ? sums.DOWN.sum / sums.DOWN.count : NaN,
      HOLD: sums.HOLD.count ? sums.HOLD.sum / sums.HOLD.count : NaN,
    };
    return { avgs, counts: Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, v.count])) as Record<Dir, number> };
  }

  // compute gradient (slope) in dB/deg using directional averages
  computeGuidance(): Guidance | null {
    if (this.buffer.length < 6) return null; // not enough data
    const { avgs, counts } = this.averagesByDir();

    // Only compute if we have both LEFT & RIGHT or both UP & DOWN samples
    const hasAz = Number.isFinite(avgs.LEFT) && Number.isFinite(avgs.RIGHT);
    const hasEl = Number.isFinite(avgs.UP) && Number.isFinite(avgs.DOWN);

    // If not enough directional samples, fallback to comparing HOLD vs movement
    let slopeAz = 0;
    let slopeEl = 0;

    if (hasAz) {
      const dDb = avgs.RIGHT - avgs.LEFT;
      slopeAz = dDb / Math.max(1e-6, this.avgAzStep * 2); // because RIGHT-LEFT collectively cover ~2*step
    } else {
      // attempt coarse comparison: RIGHT vs HOLD or LEFT vs HOLD
      if (Number.isFinite(avgs.RIGHT) && Number.isFinite(avgs.HOLD)) {
        slopeAz = (avgs.RIGHT - avgs.HOLD) / Math.max(1e-6, this.avgAzStep);
      } else if (Number.isFinite(avgs.LEFT) && Number.isFinite(avgs.HOLD)) {
        slopeAz = (avgs.HOLD - avgs.LEFT) / Math.max(1e-6, this.avgAzStep);
      }
    }

    if (hasEl) {
      const dDb = avgs.UP - avgs.DOWN;
      slopeEl = dDb / Math.max(1e-6, this.avgElStep * 2);
    } else {
      if (Number.isFinite(avgs.UP) && Number.isFinite(avgs.HOLD)) {
        slopeEl = (avgs.UP - avgs.HOLD) / Math.max(1e-6, this.avgElStep);
      } else if (Number.isFinite(avgs.DOWN) && Number.isFinite(avgs.HOLD)) {
        slopeEl = (avgs.HOLD - avgs.DOWN) / Math.max(1e-6, this.avgElStep);
      }
    }

    // confidence: magnitude of slope compared to noise
    const mag = Math.sqrt(slopeAz * slopeAz + slopeEl * slopeEl);
    const confRaw = mag / Math.max(1e-6, this.noiseEst);
    // normalize confidence to 0..1 using a soft saturation
    const confidence = clamp(confRaw / 6, 0, 1);

    // plateau detection
    const plateau = mag < Math.max(0.0005, this.noiseEst * 0.2);

    // build normalized vector for arrow: vx is positive => move RIGHT
    // We cap the vx/vy to [-1,1] for UI
    const maxSlopeForFull = 0.05; // dB/deg at which arrow is full
    const vx = clamp(slopeAz / maxSlopeForFull, -1, 1);
    const vy = clamp(slopeEl / maxSlopeForFull, -1, 1);

    // suggested coarse adjustments (deg) — proportional to slope and confidence
    const suggestedDegX = vx * clamp(confidence * 2.5, 0, 3); // up to ~3 degrees
    const suggestedDegY = vy * clamp(confidence * 2.5, 0, 2);

    let reasoning = "";
    if (plateau) reasoning = "Plateau detected — signal not changing much";
    else if (confidence < 0.3) reasoning = "Low confidence — noisy or insufficient data";
    else reasoning = `Right samples: ${counts.RIGHT}, Left: ${counts.LEFT}, Up: ${counts.UP}, Down: ${counts.DOWN}`;

    return {
      vx,
      vy,
      confidence,
      suggestedDegX,
      suggestedDegY,
      reasoning,
    };
  }
}

// ---------------- Utility helpers ----------------
function clamp(v: number, a = -1, b = 1) {
  return Math.max(a, Math.min(b, v));
}

// ---------------- The React component ----------------
export default function PathLearner({ dishA, dishB }: { dishA: MechanicalState; dishB: MechanicalState }) {
  const engine = useRef(new PathingEngine()).current;
  const [lastSample, setLastSample] = useState<Sample | null>(null);
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [running, setRunning] = useState(true);
  const [log, setLog] = useState<Sample[]>([]);
  const prevRef = useRef<{ az: number; el: number } | null>(null);

  // push sample when dishA/dishB change (simulating realtime sampling)
  useEffect(() => {
    if (!running) return;
    // compute db from rfEngine
    const db = computeSignal(dishA, dishB);
    const now = Date.now();
    const prev = prevRef.current;

    // symbolically detect the rough movement direction (based on change in az/el)
    let dir: Dir = "HOLD";
    let dAz = 0;
    let dEl = 0;
    if (prev) {
      dAz = (dishA.azimuth - prev.az);
      // wrap into -180..180
      while (dAz > 180) dAz -= 360;
      while (dAz < -180) dAz += 360;
      dEl = dishA.tilt - prev.el;
      if (Math.abs(dAz) > Math.abs(dEl)) {
        if (dAz > 0.05) dir = "RIGHT";
        else if (dAz < -0.05) dir = "LEFT";
      } else {
        if (dEl > 0.05) dir = "UP";
        else if (dEl < -0.05) dir = "DOWN";
      }
    }

    const sample: Sample = {
      db,
      az: dishA.azimuth,
      el: dishA.tilt,
      dir,
      t: now,
      dAz: dAz,
      dEl: dEl,
    };

    engine.push(sample);
    setLastSample(sample);
    setLog((cur) => {
      const n = [...cur, sample].slice(-200);
      return n;
    });

    // recompute guidance on each sample (debounce? we keep responsive)
    const g = engine.computeGuidance();
    setGuidance(g);

    prevRef.current = { az: dishA.azimuth, el: dishA.tilt };
  }, [dishA.azimuth, dishA.tilt, dishB.azimuth, dishB.tilt, running]);

  // helper UI rendering functions
  function renderArrow(g: Guidance | null) {
    if (!g) return <div style={{ color: "#9fb" }}>No guidance yet</div>;
    const size = 64;
    const center = size / 2;
    const vx = g.vx;
    const vy = -g.vy; // invert y so positive vy -> up visually
    const length = Math.max(8, Math.min(28, Math.hypot(vx, vy) * 30));
    const ang = Math.atan2(vy, vx);
    const arrowX = center + Math.cos(ang) * length;
    const arrowY = center + Math.sin(ang) * length;
    const color = `rgba(${Math.round(60 + g.confidence * 195)},${Math.round(
      120 + g.confidence * 120
    )},${Math.round(200 - g.confidence * 80)},1)`;

    return (
      <svg width={size} height={size} style={{ background: "#02162a", borderRadius: 8 }}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={center} cy={center} r={22} fill="#062233" stroke="#104a78" />
        <line x1={center} y1={center} x2={arrowX} y2={arrowY} stroke={color} strokeWidth={4} strokeLinecap="round" filter="url(#glow)" />
        <circle cx={arrowX} cy={arrowY} r={6} fill={color} />
      </svg>
    );
  }

  function renderConfidenceBar(c: number) {
    const pct = Math.round(c * 100);
    return (
      <div style={{ width: 180, height: 12, background: "#022", borderRadius: 6, border: "1px solid #113" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,#3be8ff,#27d47a)`, borderRadius: 6 }} />
      </div>
    );
  }

  // quick controls for testing when you're in simulator: clear / pause
  return (
    <div style={{ width: 360, padding: 12, borderRadius: 8, background: "linear-gradient(180deg,#04101a,#02121a)", border: "1px solid #123b69", color: "#cfe8ff", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>📘 Learner</div>
          <div style={{ color: "#9fb", fontSize: 12 }}>Realtime directional guidance (estimate)</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { engine.clear(); setLog([]); setGuidance(null); }} style={{ padding: "6px 8px", borderRadius: 8, background: "#071127", border: "1px solid #164aee", color: "#bfe0ff" }}>Reset</button>
          <button onClick={() => setRunning((r) => !r)} style={{ padding: "6px 8px", borderRadius: 8, background: running ? "#032" : "#420", border: "1px solid #164aee", color: "#bfe0ff" }}>{running ? "Pause" : "Resume"}</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <div>{renderArrow(guidance)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "#9fb" }}>Recommendation</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#dff" }}>
            {guidance ? (
              <>
                {guidance.vx > 0.05 ? "Move RIGHT" : guidance.vx < -0.05 ? "Move LEFT" : "No horizontal change"}
                {" — "}
                {guidance.vy > 0.05 ? "Move UP" : guidance.vy < -0.05 ? "Move DOWN" : "No vertical change"}
              </>
            ) : (
              "Collecting samples..."
            )}
          </div>

          <div style={{ marginTop: 8 }}>{guidance ? renderConfidenceBar(guidance.confidence) : null}</div>

          <div style={{ marginTop: 8, color: "#9fb", fontSize: 12 }}>{guidance ? guidance.reasoning : "Waiting for movement"}</div>

          <div style={{ marginTop: 8, color: "#cfe8ff", fontSize: 12 }}>
            Suggested coarse adjust: {guidance ? `${guidance.suggestedDegX.toFixed(2)}° az, ${guidance.suggestedDegY.toFixed(2)}° el` : "—"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 12, color: "#9fb", marginBottom: 6 }}>Latest sample</div>
        <div style={{ fontFamily: "monospace", background: "#011", padding: 8, borderRadius: 6, border: "1px solid #122" }}>
          {lastSample ? (
            <div style={{ fontSize: 12 }}>
              t: {new Date(lastSample.t).toLocaleTimeString()} • db: {lastSample.db.toFixed(4)} • dir: {lastSample.dir} • dAz: {lastSample.dAz?.toFixed(3) ?? "0"}°
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#556" }}>no samples yet</div>
          )}
        </div>
      </div>

      {/* small sample log tail (compact) */}
      <div style={{ marginTop: 10, fontSize: 12, color: "#9fb" }}>
        <div style={{ marginBottom: 6 }}>Recent samples (tail)</div>
        <div style={{ maxHeight: 120, overflow: "auto", padding: 6, background: "#010f14", borderRadius: 6, border: "1px solid #0b2b3b" }}>
          {log.slice(-20).reverse().map((s, i) => (
            <div key={i} style={{ fontSize: 11, lineHeight: 1.3, color: s.dir === "HOLD" ? "#556" : "#cfe8ff" }}>
              {new Date(s.t).toLocaleTimeString()} • {s.dir.padEnd(4, " ")} • {s.db.toFixed(4)} dB • Δaz {s.dAz?.toFixed(3) ?? "0"}°
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
