/* ─────────────────────────────────────────────────────────────
   Step 5 – Style Restorer
   Normalises lighting, removes skin colour influence, and
   cleans up warping artifacts. Operates on the full flattened
   photo before ink extraction.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback, useState } from "react";
import { useUnwrapStore } from "../store";
import type { StyleRestoreResult } from "../types";

/* ── server-side style restoration via Groq Vision + sharp ── */
async function restoreStyle(imageBase64: string): Promise<StyleRestoreResult> {
  const resp = await fetch("/api/unwrap/style-restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });

  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(data.error ?? "Style restore API failed");
  }

  return {
    refinedBase64: data.refinedBase64,
    skinRemoved: data.skinRemoved ?? true,
    lightingCorrected: data.lightingCorrected ?? true,
  };
}

/* ── Component ──────────────────────────────────────────────── */
export default function StyleRestorer() {
  const {
    sourceImage,
    inpaint,
    flatten,
    styleRestore,
    setStyleRestore,
    updateStep,
    setCurrentStep,
    steps,
  } = useUnwrapStore();

  const [showBefore, setShowBefore] = useState(false);
  const stepState = steps["style-restore"];
  const isRunning = stepState.status === "running";
  const inputResult = inpaint || flatten; // fallback if inpaint was skipped
  const ready = !!inputResult && !!sourceImage;

  const run = useCallback(async () => {
    if (!inputResult || !sourceImage) return;
    updateStep("style-restore", {
      status: "running",
      progress: 0,
      message: "Cleaning up flattened image…",
    });
    setCurrentStep("style-restore");

    try {
      const base64 = inpaint
        ? inpaint.inpaintedBase64
        : flatten!.flattenedBase64;
      updateStep("style-restore", {
        progress: 20,
        message: "Analysing image via Groq Vision…",
      });
      const result = await restoreStyle(base64);
      updateStep("style-restore", {
        progress: 70,
        message: "Normalising lighting & removing skin colour…",
      });

      setStyleRestore(result);
      updateStep("style-restore", {
        status: "complete",
        progress: 100,
        message: `Done – skin removed: ${result.skinRemoved ? "yes" : "no"}, lighting corrected: ${result.lightingCorrected ? "yes" : "no"}`,
      });
    } catch (err) {
      updateStep("style-restore", {
        status: "error",
        progress: 0,
        message:
          err instanceof Error ? err.message : "Style restoration failed",
        error: String(err),
      });
    }
  }, [
    inputResult,
    sourceImage,
    inpaint,
    flatten,
    updateStep,
    setCurrentStep,
    setStyleRestore,
  ]);

  if (!ready) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
        Complete Step 4 (Fill Gaps) first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <span>🎨</span> Step 5 — Restore & Clean
        </h3>
        <button
          onClick={run}
          disabled={isRunning}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Running…" : styleRestore ? "Re-run" : "Restore"}
        </button>
      </div>

      <p className="text-xs text-zinc-400">
        Normalises lighting, removes skin colour, and cleans warping artifacts
        from the flattened image.
      </p>

      {isRunning && (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${stepState.progress}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-500">{stepState.message}</p>
        </div>
      )}

      {styleRestore && (
        <>
          {/* Before/after toggle */}
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={showBefore}
              onChange={(e) => setShowBefore(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800"
            />
            Show before (inpainted)
          </label>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${
                showBefore
                  ? (inpaint?.inpaintedBase64 ?? flatten!.flattenedBase64)
                  : styleRestore.refinedBase64
              }`}
              alt={showBefore ? "Before restoration" : "After restoration"}
              className="h-full w-full object-contain"
            />
            <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-zinc-300">
              {showBefore ? "Before" : "After"}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400">
            <span>
              Skin removed:{" "}
              <strong className="text-zinc-200">
                {styleRestore.skinRemoved ? "Yes" : "No"}
              </strong>
            </span>
            <span>
              Lighting corrected:{" "}
              <strong className="text-zinc-200">
                {styleRestore.lightingCorrected ? "Yes" : "No"}
              </strong>
            </span>
          </div>
        </>
      )}

      {stepState.status === "error" && (
        <p className="text-xs text-red-400">{stepState.message}</p>
      )}
    </div>
  );
}
