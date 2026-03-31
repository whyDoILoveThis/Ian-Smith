/* ─────────────────────────────────────────────────────────────
   Unwrap Options Panel
   User-configurable settings for the AI Unwrap pipeline.
   ───────────────────────────────────────────────────────────── */
"use client";

import React from "react";
import { useUnwrapStore } from "../store";
import type { UnwrapOptions } from "../types";

const SELECT_CLS =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none";

export default function UnwrapOptionsPanel() {
  const { options, setOptions } = useUnwrapStore();

  const set = <K extends keyof UnwrapOptions>(key: K, val: UnwrapOptions[K]) =>
    setOptions({ [key]: val });

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Unwrap Options
      </h3>

      {/* Auto-run */}
      <label className="flex items-center justify-between text-xs text-zinc-300">
        Auto-run full pipeline
        <input
          type="checkbox"
          checked={options.autoRun}
          onChange={(e) => set("autoRun", e.target.checked)}
          className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
        />
      </label>

      {/* Output style */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-zinc-400">
          Output Style
        </label>
        <select
          value={options.outputStyle}
          onChange={(e) =>
            set("outputStyle", e.target.value as UnwrapOptions["outputStyle"])
          }
          className={SELECT_CLS}
        >
          <option value="line-art">Line Art (B&W)</option>
          <option value="shaded">Shaded (Grayscale)</option>
          <option value="dotwork">Dotwork (Dithered)</option>
        </select>
      </div>

      {/* Flatten method */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-zinc-400">
          Flatten Method
        </label>
        <select
          value={options.flattenMethod}
          onChange={(e) =>
            set(
              "flattenMethod",
              e.target.value as UnwrapOptions["flattenMethod"],
            )
          }
          className={SELECT_CLS}
        >
          <option value="auto">Auto (best fit)</option>
          <option value="conformal">Conformal (angle-preserving)</option>
          <option value="arap">ARAP (as-rigid-as-possible)</option>
        </select>
      </div>

      {/* Smoothing */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-zinc-400">
          Edge Smoothing
        </label>
        <select
          value={options.smoothing}
          onChange={(e) =>
            set("smoothing", e.target.value as UnwrapOptions["smoothing"])
          }
          className={SELECT_CLS}
        >
          <option value="none">None</option>
          <option value="light">Light</option>
          <option value="medium">Medium</option>
          <option value="heavy">Heavy</option>
        </select>
      </div>

      {/* Inpaint strength */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-zinc-400">
          Inpaint Strength — {(options.inpaintStrength * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={options.inpaintStrength}
          onChange={(e) => set("inpaintStrength", parseFloat(e.target.value))}
          className="accent-indigo-500"
        />
      </div>

      {/* Generate SVG */}
      <label className="flex items-center justify-between text-xs text-zinc-300">
        Generate SVG
        <input
          type="checkbox"
          checked={options.generateSvg}
          onChange={(e) => set("generateSvg", e.target.checked)}
          className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
        />
      </label>
    </div>
  );
}
