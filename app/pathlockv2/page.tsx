"use client";

/**
 * app/rf-sim/page.tsx
 *
 * Control surface for the insane simulator:
 * - per-dish rotate buttons (big left/right/up/down)
 * - sliders for fine control (degrees)
 * - miles distance slider (UI) -> converted to meters (physics)
 * - controls for rain rate, wind strength, AGC smoothing
 * - clearly labeled tooltips and helpful text
 */

import React, { useEffect, useState } from "react";
import OverlapView from "@/components/PathLock/v2/OverlapView";

export default function RfSimPage() {
  // Per-dish pointing offsets (degrees)
  const [dish1AzimuthDeg, setDish1AzimuthDeg] = useState(0.0);
  const [dish1ElevationDeg, setDish1ElevationDeg] = useState(0.0);
  const [dish2AzimuthDeg, setDish2AzimuthDeg] = useState(0.0);
  const [dish2ElevationDeg, setDish2ElevationDeg] = useState(0.0);

  // Distance in miles for UI, convert to meters for physics
  const [distanceMiles, setDistanceMiles] = useState(3.0);
  const distanceMilesToMeters = (miles: number) => miles * 1609.344;

  // Environment controls
  const [rainRateMmPerHour, setRainRateMmPerHour] = useState(0.0);
  const [windStrengthDeg, setWindStrengthDeg] = useState(0.05); // small degrees of sway
  const [agcResponse, setAgcResponse] = useState(0.12);

  // coarse rotation step (deg)
  const COARSE_STEP = 1.0;
  // fine rotation small step (deg)
  const FINE_STEP = 0.05;

  return (
    <main className="min-h-screen bg-black text-white p-8 flex flex-col items-center gap-8">
      <h1 className="text-4xl font-extrabold">
        📡 INSANE RF TRAINER — Real Tower Mode
      </h1>

      <div className="w-full max-w-6xl grid grid-cols-2 gap-6">
        {/* Dish 1 controls */}
        <div className="bg-zinc-900 rounded-xl p-4 border border-sky-800">
          <div className="flex justify-between items-center">
            <h2 className="font-bold">Dish 1 — Tech A</h2>
            <div className="text-xs text-zinc-400">Left-side tech</div>
          </div>

          <RotatorControl
            label="Azimuth"
            value={dish1AzimuthDeg}
            setValue={setDish1AzimuthDeg}
            coarseStep={COARSE_STEP}
            fineStep={FINE_STEP}
            tooltip="Rotate dish left / right. Positive is clockwise."
          />

          <RotatorControl
            label="Elevation"
            value={dish1ElevationDeg}
            setValue={setDish1ElevationDeg}
            coarseStep={COARSE_STEP}
            fineStep={FINE_STEP}
            tooltip="Tilt dish up / down. Positive tilts up."
          />
        </div>

        {/* Dish 2 controls */}
        <div className="bg-zinc-900 rounded-xl p-4 border border-sky-800">
          <div className="flex justify-between items-center">
            <h2 className="font-bold">Dish 2 — Tech B</h2>
            <div className="text-xs text-zinc-400">Right-side tech</div>
          </div>

          <RotatorControl
            label="Azimuth"
            value={dish2AzimuthDeg}
            setValue={setDish2AzimuthDeg}
            coarseStep={COARSE_STEP}
            fineStep={FINE_STEP}
            tooltip="Rotate dish left / right. Positive is clockwise."
          />

          <RotatorControl
            label="Elevation"
            value={dish2ElevationDeg}
            setValue={setDish2ElevationDeg}
            coarseStep={COARSE_STEP}
            fineStep={FINE_STEP}
            tooltip="Tilt dish up / down. Positive tilts up."
          />
        </div>

        {/* Distance + environment controls (span two cols) */}
        <div className="col-span-2 bg-zinc-900 rounded-xl p-4 border border-sky-800">
          <div className="flex items-center gap-6">
            <div style={{ flex: 1 }}>
              <div className="text-sm text-zinc-400">Path Distance (miles)</div>
              <input
                type="range"
                min={0.1}
                max={20}
                step={0.01}
                value={distanceMiles}
                onChange={(e) => setDistanceMiles(Number(e.target.value))}
                className="w-full"
                title="Distance between dish locations in miles"
              />
              <div className="font-mono mt-1">
                {distanceMiles.toFixed(2)} mi
              </div>
            </div>

            <div style={{ width: 220 }}>
              <div className="text-sm text-zinc-400">Rain Rate (mm/hr)</div>
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={rainRateMmPerHour}
                onChange={(e) => setRainRateMmPerHour(Number(e.target.value))}
                title="Simulated rain intensity; higher = more attenuation"
                className="w-full"
              />
              <div className="font-mono mt-1">
                {rainRateMmPerHour.toFixed(1)} mm/hr
              </div>
            </div>

            <div style={{ width: 220 }}>
              <div className="text-sm text-zinc-400">
                Wind Strength (deg sway)
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={windStrengthDeg}
                onChange={(e) => setWindStrengthDeg(Number(e.target.value))}
                title="Simulates tower sway causing angular oscillation"
                className="w-full"
              />
              <div className="font-mono mt-1">
                {windStrengthDeg.toFixed(3)}°
              </div>
            </div>

            <div style={{ width: 220 }}>
              <div className="text-sm text-zinc-400">AGC / Meter Response</div>
              <input
                type="range"
                min={0.01}
                max={0.9}
                step={0.01}
                value={agcResponse}
                onChange={(e) => setAgcResponse(Number(e.target.value))}
                title="How quickly the meter responds to changes (higher = faster)"
                className="w-full"
              />
              <div className="font-mono mt-1">{agcResponse.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Visualizer */}
        <div className="col-span-2">
          <OverlapView
            dish1AzimuthDeg={dish1AzimuthDeg}
            dish1ElevationDeg={dish1ElevationDeg}
            dish2AzimuthDeg={dish2AzimuthDeg}
            dish2ElevationDeg={dish2ElevationDeg}
            distanceMeters={distanceMilesToMeters(distanceMiles)}
            topDish={1}
            canvasPixelSize={420}
            fieldOfViewDeg={10}
            rainRateMmPerHour={rainRateMmPerHour}
            windStrength={windStrengthDeg}
            agcResponse={agcResponse}
          />
        </div>
      </div>

      <div className="text-xs text-zinc-400 max-w-3xl">
        <strong>Pro tip:</strong> Use coarse buttons for rough movement (1°) and
        sliders + fine-step buttons for micro-adjusts (0.1°). The meters on each
        side are intentionally independent — same as two techs on a tower. If
        you want auto-calibration against a CSV log, I can add a calibration
        wizard next.
      </div>
    </main>
  );
}

// Rotator UI component with explicit button names and tooltips
function RotatorControl({
  label,
  value,
  setValue,
  coarseStep,
  fineStep,
  tooltip,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  coarseStep: number;
  fineStep: number;
  tooltip?: string;
}) {
  return (
    <div className="mt-3">
      <div className="flex justify-between items-center">
        <div className="text-xs text-zinc-400">{label}</div>
        <div className="font-mono text-sm">{value.toFixed(3)}°</div>
      </div>

      <div className="flex gap-2 items-center mt-2">
        <button
          className="px-3 py-1 rounded bg-zinc-800 border border-sky-700"
          onClick={() => setValue(value - coarseStep)}
          title={`Rotate -${coarseStep}° (coarse)`}
        >
          ◀◀
        </button>

        <button
          className="px-2 py-1 rounded bg-zinc-800 border border-sky-700"
          onClick={() => setValue(value - fineStep)}
          title={`Rotate -${fineStep}° (fine)`}
        >
          ◀
        </button>

        <input
          type="range"
          min={-10}
          max={10}
          step={0.001}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          title={tooltip}
          className="flex-1"
        />

        <button
          className="px-2 py-1 rounded bg-zinc-800 border border-sky-700"
          onClick={() => setValue(value + fineStep)}
          title={`Rotate +${fineStep}° (fine)`}
        >
          ▶
        </button>

        <button
          className="px-3 py-1 rounded bg-zinc-800 border border-sky-700"
          onClick={() => setValue(value + coarseStep)}
          title={`Rotate +${coarseStep}° (coarse)`}
        >
          ▶▶
        </button>
      </div>
    </div>
  );
}
