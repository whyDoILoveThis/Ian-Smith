/* ─────────────────────────────────────────────────────────────
   StencilOptions – user-adjustable processing controls
   ───────────────────────────────────────────────────────────── */
"use client";

import React from "react";
import { Settings2 } from "lucide-react";
import type { StencilOptions as Opts } from "../types";

interface Props {
  options: Opts;
  onChange: (opts: Opts) => void;
  disabled?: boolean;
}

type Tri = "low" | "medium" | "high";
type TriEdge = "thin" | "medium" | "thick";

export default function StencilOptions({ options, onChange, disabled }: Props) {
  const set = <K extends keyof Opts>(key: K, value: Opts[K]) =>
    onChange({ ...options, [key]: value });

  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-5 text-sm ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2 font-semibold text-foreground">
        <Settings2 className="h-4 w-4" />
        Processing Options
      </div>

      {/* Contrast */}
      <TriToggle
        label="Contrast"
        value={options.contrastLevel}
        options={["low", "medium", "high"] as Tri[]}
        onSelect={(v) => set("contrastLevel", v)}
      />

      {/* Edge thickness */}
      <TriToggle
        label="Edge Thickness"
        value={options.edgeThickness}
        options={["thin", "medium", "thick"] as TriEdge[]}
        onSelect={(v) => set("edgeThickness", v)}
      />

      {/* Noise reduction */}
      <TriToggle
        label="Noise Reduction"
        value={options.noiseReduction}
        options={["low", "medium", "high"] as Tri[]}
        onSelect={(v) => set("noiseReduction", v)}
      />

      {/* Curvature strength */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Curvature Correction
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {options.curvatureStrength.toFixed(2)}×
          </span>
        </div>
        <input
          type="range"
          min={0.25}
          max={2.5}
          step={0.05}
          value={options.curvatureStrength}
          onChange={(e) => set("curvatureStrength", parseFloat(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/60">
          <span>Stronger</span>
          <span>1.0 = standard</span>
          <span>Weaker</span>
        </div>
      </div>

      {/* SVG toggle */}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={options.generateSvg}
          onChange={(e) => set("generateSvg", e.target.checked)}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-muted-foreground">
          Generate SVG (vector) output
        </span>
      </label>

      {/* Mesh warping toggle + resolution */}
      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={options.useMeshWarping}
            onChange={(e) => set("useMeshWarping", e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-muted-foreground">Localized mesh warping</span>
        </label>
        {options.useMeshWarping && (
          <div className="ml-6 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Mesh Resolution
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {options.meshResolution} cells
              </span>
            </div>
            <input
              type="range"
              min={4}
              max={32}
              step={1}
              value={options.meshResolution}
              onChange={(e) => set("meshResolution", parseInt(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/60">
              <span>Coarse (fast)</span>
              <span>Fine (detailed)</span>
            </div>
          </div>
        )}
      </div>

      {/* Depth-aware flattening toggle */}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={options.useDepthFlattening}
          onChange={(e) => set("useDepthFlattening", e.target.checked)}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-muted-foreground">Depth-aware flattening</span>
      </label>

      {/* AI cleanup toggle */}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={options.aiCleanup}
          onChange={(e) => set("aiCleanup", e.target.checked)}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-muted-foreground">
          AI cleanup pass (optional)
        </span>
      </label>
    </div>
  );
}

// ── Tri-state segmented control ──────────────────────────────

function TriToggle<T extends string>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: T;
  options: T[];
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex overflow-hidden rounded-lg border border-border">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`flex-1 px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              value === opt
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
