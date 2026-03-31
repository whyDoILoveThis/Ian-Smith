/* ─────────────────────────────────────────────────────────────
   Step 7 – Stencil Finalizer
   Converts the refined tattoo to clean black-and-white line art
   ready for a tattoo artist to print and trace.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback, useState } from "react";
import { useUnwrapStore } from "../store";
import type { StencilFinalResult } from "../types";

/* ── server-side stencil generation via sharp + potrace ────── */
async function generateStencil(
  imageBase64: string,
  outputStyle: "line-art" | "shaded" | "dotwork",
  smoothing: "none" | "light" | "medium" | "heavy",
  generateSvg: boolean,
): Promise<StencilFinalResult> {
  const resp = await fetch("/api/unwrap/stencil-finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64,
      outputStyle,
      smoothing,
      generateSvg,
    }),
  });

  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(data.error ?? "Stencil finalize API failed");
  }

  return {
    stencilBase64: data.stencilBase64,
    svgData: data.svgData,
    width: data.width,
    height: data.height,
  };
}

/* ── download helper ────────────────────────────────────────── */
function downloadFile(data: string, filename: string, mime: string) {
  const a = document.createElement("a");
  a.href = mime.startsWith("image")
    ? `data:${mime};base64,${data}`
    : `data:${mime};charset=utf-8,${encodeURIComponent(data)}`;
  a.download = filename;
  a.click();
}

/* ── Component ──────────────────────────────────────────────── */
export default function StencilFinalizer() {
  const {
    sourceImage,
    segmentation,
    styleRestore,
    flatten,
    inpaint,
    stencilFinal,
    setStencilFinal,
    updateStep,
    setCurrentStep,
    steps,
    options,
  } = useUnwrapStore();

  const [preview, setPreview] = useState<"png" | "svg">("png");
  const stepState = steps["stencil-finalize"];
  const isRunning = stepState.status === "running";
  // Accept input from best available upstream result (segmented ink preferred)
  const inputBase64 =
    segmentation?.extractedBase64 ??
    styleRestore?.refinedBase64 ??
    inpaint?.inpaintedBase64 ??
    flatten?.flattenedBase64;
  const ready = !!inputBase64 && !!sourceImage;

  const run = useCallback(async () => {
    if (!inputBase64 || !sourceImage) return;
    updateStep("stencil-finalize", {
      status: "running",
      progress: 0,
      message: "Generating stencil…",
    });
    setCurrentStep("stencil-finalize");

    try {
      updateStep("stencil-finalize", {
        progress: 20,
        message: `Applying ${options.outputStyle} style…`,
      });
      const result = await generateStencil(
        inputBase64,
        options.outputStyle,
        options.smoothing,
        options.generateSvg,
      );
      updateStep("stencil-finalize", {
        progress: 80,
        message: "Finalising output…",
      });

      setStencilFinal(result);
      updateStep("stencil-finalize", {
        status: "complete",
        progress: 100,
        message: `Done – ${result.width}×${result.height} stencil ready`,
      });
      setCurrentStep("complete");
    } catch (err) {
      updateStep("stencil-finalize", {
        status: "error",
        progress: 0,
        message:
          err instanceof Error ? err.message : "Stencil generation failed",
        error: String(err),
      });
    }
  }, [
    inputBase64,
    sourceImage,
    options.outputStyle,
    options.smoothing,
    options.generateSvg,
    updateStep,
    setCurrentStep,
    setStencilFinal,
  ]);

  if (!ready) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
        Complete Step 6 (Extract Ink) first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <span>🖨️</span> Step 7 — Stencil Output
        </h3>
        <button
          onClick={run}
          disabled={isRunning}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning
            ? "Running…"
            : stencilFinal
              ? "Re-generate"
              : "Generate Stencil"}
        </button>
      </div>

      <p className="text-xs text-zinc-400">
        Final conversion to clean {options.outputStyle} output,{" "}
        {options.smoothing} smoothing{options.generateSvg ? ", with SVG" : ""}.
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

      {stencilFinal && (
        <>
          {/* Preview tabs */}
          {stencilFinal.svgData && (
            <div className="flex gap-1 rounded-lg bg-zinc-800/80 p-0.5">
              {(["png", "svg"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPreview(t)}
                  className={`flex-1 rounded-md px-3 py-1 text-xs font-medium uppercase transition-colors ${
                    preview === t
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-white">
            {preview === "png" || !stencilFinal.svgData ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`data:image/png;base64,${stencilFinal.stencilBase64}`}
                alt="Final stencil"
                className="h-full w-full object-contain"
              />
            ) : (
              <div
                className="h-full w-full"
                dangerouslySetInnerHTML={{ __html: stencilFinal.svgData }}
              />
            )}
          </div>

          {/* Download buttons */}
          <div className="flex gap-2">
            <button
              onClick={() =>
                downloadFile(
                  stencilFinal.stencilBase64,
                  "unwrapped-stencil.png",
                  "image/png",
                )
              }
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Download PNG
            </button>
            {stencilFinal.svgData && (
              <button
                onClick={() =>
                  downloadFile(
                    stencilFinal.svgData!,
                    "unwrapped-stencil.svg",
                    "image/svg+xml",
                  )
                }
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
              >
                Download SVG
              </button>
            )}
          </div>

          <p className="text-[11px] text-zinc-400">
            {stencilFinal.width}×{stencilFinal.height}px · {options.outputStyle}{" "}
            · {options.smoothing} smoothing
          </p>
        </>
      )}

      {stepState.status === "error" && (
        <p className="text-xs text-red-400">{stepState.message}</p>
      )}
    </div>
  );
}
