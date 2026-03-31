/* ─────────────────────────────────────────────────────────────
   Step 4 – Inpainting Filler
   Fills holes and stretched regions from the flattening step.
   Uses the distortion heatmap as a gap mask — high-distortion
   and empty areas get blur-inpainted via the server API.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback, useState } from "react";
import { useUnwrapStore } from "../store";
import type { InpaintResult } from "../types";

/* ── server-side inpainting ─────────────────────────────────── */
async function inpaintGaps(
  flatBase64: string,
  distortionBase64: string,
  strength: number,
): Promise<InpaintResult> {
  const resp = await fetch("/api/unwrap/inpaint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: flatBase64,
      maskBase64: distortionBase64,
      strength,
    }),
  });

  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(data.error ?? "Inpainting API failed");
  }

  return {
    inpaintedBase64: data.inpaintedBase64,
    inpaintMaskBase64: data.inpaintMaskBase64 ?? distortionBase64,
    fillPercent: data.fillPercent ?? 0,
  };
}

/* ── Component ──────────────────────────────────────────────── */
export default function InpaintingFiller() {
  const {
    sourceImage,
    flatten,
    inpaint,
    setInpaint,
    updateStep,
    setCurrentStep,
    steps,
    options,
  } = useUnwrapStore();

  const [preview, setPreview] = useState<"result" | "mask">("result");
  const stepState = steps["inpainting"];
  const isRunning = stepState.status === "running";
  const ready = !!flatten && !!sourceImage;

  const run = useCallback(async () => {
    if (!flatten || !sourceImage) return;
    updateStep("inpainting", {
      status: "running",
      progress: 0,
      message: "Detecting stretched/empty regions…",
    });
    setCurrentStep("inpainting");

    try {
      updateStep("inpainting", {
        progress: 30,
        message: "Running inpainting on gap regions…",
      });
      const result = await inpaintGaps(
        flatten.flattenedBase64,
        flatten.distortionMapBase64,
        options.inpaintStrength,
      );
      updateStep("inpainting", { progress: 85, message: "Blending fills…" });

      setInpaint(result);
      updateStep("inpainting", {
        status: "complete",
        progress: 100,
        message: `Done – ${result.fillPercent.toFixed(1)}% of area inpainted`,
      });
    } catch (err) {
      updateStep("inpainting", {
        status: "error",
        progress: 0,
        message: err instanceof Error ? err.message : "Inpainting failed",
        error: String(err),
      });
    }
  }, [
    flatten,
    sourceImage,
    options.inpaintStrength,
    updateStep,
    setCurrentStep,
    setInpaint,
  ]);

  if (!ready) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
        Complete Step 3 (Flatten Surface) first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <span>🪄</span> Step 4 — Fill Gaps
        </h3>
        <button
          onClick={run}
          disabled={isRunning}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Running…" : inpaint ? "Re-run" : "Inpaint"}
        </button>
      </div>

      <p className="text-xs text-zinc-400">
        AI fills in missing, shadow-damaged, or occluded areas. Strength:{" "}
        <strong className="text-zinc-300">
          {(options.inpaintStrength * 100).toFixed(0)}%
        </strong>
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

      {inpaint && (
        <>
          <div className="flex gap-1 rounded-lg bg-zinc-800/80 p-0.5">
            {(["result", "mask"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPreview(t)}
                className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  preview === t
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t === "result" ? "Inpainted" : "Fill Mask"}
              </button>
            ))}
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${
                preview === "result"
                  ? inpaint.inpaintedBase64
                  : inpaint.inpaintMaskBase64
              }`}
              alt={preview === "result" ? "Inpainted tattoo" : "Inpaint mask"}
              className="h-full w-full object-contain"
            />
          </div>

          <p className="text-[11px] text-zinc-400">
            Filled:{" "}
            <strong className="text-zinc-200">
              {inpaint.fillPercent.toFixed(1)}%
            </strong>{" "}
            of total area
          </p>
        </>
      )}

      {stepState.status === "error" && (
        <p className="text-xs text-red-400">{stepState.message}</p>
      )}
    </div>
  );
}
