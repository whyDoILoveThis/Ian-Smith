/* ─────────────────────────────────────────────────────────────
   AI Tattoo Unwrap – Main Orchestrator
   Self-contained module that runs the full 7-step unwrap
   pipeline: DEPTH → MESH → FLATTEN → INPAINT → STYLE → EXTRACT INK → STENCIL
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback, useMemo } from "react";
import { useUnwrapStore } from "./store";
import { UNWRAP_STEPS } from "./types";
import type { UnwrapStepId } from "./types";
import {
  UnwrapUploader,
  UnwrapProgress,
  UnwrapOptionsPanel,
  TattooSegmenter,
  DepthMapper,
  MeshProjector,
  MeshFlattener,
  InpaintingFiller,
  StyleRestorer,
  StencilFinalizer,
} from "./components";

/* ── Step component map ─────────────────────────────────────── */
const STEP_COMPONENTS: Record<string, React.FC> = {
  segmentation: TattooSegmenter,
  "depth-mapping": DepthMapper,
  "mesh-projection": MeshProjector,
  "mesh-flattening": MeshFlattener,
  inpainting: InpaintingFiller,
  "style-restore": StyleRestorer,
  "stencil-finalize": StencilFinalizer,
};

export default function TattooUnwrap() {
  const { sourceImage, currentStep, reset, steps } = useUnwrapStore();

  /** Determine which steps to show expanded. When idle, show all pending.
      When running, show up to and including the current step (completed ones collapsed). */
  const visibleSteps = useMemo(() => {
    return UNWRAP_STEPS.map((meta) => ({
      ...meta,
      state: steps[meta.id],
    }));
  }, [steps]);

  const completedCount = visibleSteps.filter(
    (s) => s.state.status === "complete",
  ).length;
  const totalSteps = UNWRAP_STEPS.length;

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header bar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">AI Tattoo Unwrap</h2>
          <p className="text-xs text-zinc-500">
            {completedCount}/{totalSteps} steps complete
          </p>
        </div>
        {sourceImage && (
          <button
            onClick={handleReset}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
          >
            Start Over
          </button>
        )}
      </div>

      {/* ── Two-column layout: steps + sidebar ──────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* LEFT: Upload + Pipeline Steps */}
        <div className="flex flex-col gap-5">
          <UnwrapUploader />

          {sourceImage && (
            <>
              {/* Render each step component */}
              {UNWRAP_STEPS.map((meta) => {
                const Comp = STEP_COMPONENTS[meta.id];
                if (!Comp) return null;
                return <Comp key={meta.id} />;
              })}
            </>
          )}
        </div>

        {/* RIGHT: Progress + Options */}
        <div className="flex flex-col gap-5">
          {sourceImage && (
            <>
              <UnwrapProgress />
              <UnwrapOptionsPanel />
            </>
          )}

          {/* Pipeline explanation when no image yet */}
          {!sourceImage && (
            <div className="flex flex-col gap-3 rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                How It Works
              </h3>
              {UNWRAP_STEPS.map((s) => (
                <div key={s.id} className="flex items-start gap-2">
                  <span className="mt-0.5 text-sm">{s.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-zinc-300">
                      {s.label}
                    </p>
                    <p className="text-[11px] text-zinc-500">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
