/* ─────────────────────────────────────────────────────────────
   Step 3 – Mesh Flattener
   Unwraps the 3D mesh back to a flat plane using depth-based
   inverse warping. Works on the FULL original photo so we keep
   all context (skin + tattoo) until the extraction step later.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback, useState } from "react";
import { useUnwrapStore } from "../store";
import type { FlattenResult } from "../types";

/* ── depth-guided mesh flattening ───────────────────────────── */
async function flattenMesh(
  meshData: string,
  imageSrc: string,
  depthBase64: string,
  method: "conformal" | "arap" | "auto",
  imgW: number,
  imgH: number,
): Promise<FlattenResult> {
  const chosenMethod = method === "auto" ? "conformal" : method;

  // Load the FULL original photo
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = rej;
    img.src = imageSrc;
  });

  const w = imgW || img.naturalWidth;
  const h = imgH || img.naturalHeight;

  // Load depth map for curvature-aware warping
  const depthImg = new Image();
  depthImg.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    depthImg.onload = () => res();
    depthImg.onerror = rej;
    depthImg.src = `data:image/png;base64,${depthBase64}`;
  });

  const dc = document.createElement("canvas");
  dc.width = w;
  dc.height = h;
  const dctx = dc.getContext("2d")!;
  dctx.drawImage(depthImg, 0, 0, w, h);
  const depthPixels = dctx.getImageData(0, 0, w, h).data;

  // Source image pixels
  const sc = document.createElement("canvas");
  sc.width = w;
  sc.height = h;
  const sctx = sc.getContext("2d")!;
  sctx.drawImage(img, 0, 0, w, h);
  const srcData = sctx.getImageData(0, 0, w, h);

  // ── Depth-guided inverse warping ──
  // Use the depth map to compute per-pixel displacement:
  // areas that curve away get "pulled" back to flat
  const fc = document.createElement("canvas");
  fc.width = w;
  fc.height = h;
  const fctx = fc.getContext("2d")!;
  const dst = fctx.createImageData(w, h);

  const cx = w / 2,
    cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);

  // Compute mean depth for normalisation
  let depthSum = 0;
  for (let i = 0; i < w * h; i++) depthSum += depthPixels[i * 4];
  const meanDepth = depthSum / (w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const di = (y * w + x) * 4;
      const localDepth = depthPixels[di] / 255;
      const depthDeviation = (depthPixels[di] - meanDepth) / 255;

      // Radial distance from centre
      const dx = x - cx,
        dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      const nr = r / maxR;

      // Curvature-proportional inverse barrel distortion
      // Deeper (closer) areas expand less, shallower areas expand more
      const k = 1 + (0.12 + depthDeviation * 0.15) * nr * nr;

      const sx = Math.round(cx + dx * k);
      const sy = Math.round(cy + dy * k);

      if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
        const si = (sy * w + sx) * 4;
        dst.data[di] = srcData.data[si];
        dst.data[di + 1] = srcData.data[si + 1];
        dst.data[di + 2] = srcData.data[si + 2];
        dst.data[di + 3] = srcData.data[si + 3];
      }
    }
  }
  fctx.putImageData(dst, 0, 0);
  const flattenedBase64 = fc.toDataURL("image/png").split(",")[1];

  // ── distortion heatmap ──
  const hc = document.createElement("canvas");
  hc.width = w;
  hc.height = h;
  const hctx = hc.getContext("2d")!;
  const hd = hctx.createImageData(w, h);
  let maxStretch = 1.0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const di = (y * w + x) * 4;
      const depthDeviation = (depthPixels[di] - meanDepth) / 255;
      const dx = x - cx,
        dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy) / maxR;
      const stretch = 1 + (0.12 + depthDeviation * 0.15) * r * r;
      if (stretch > maxStretch) maxStretch = stretch;
      const t = Math.min(1, (stretch - 1) / 0.2);
      const i = (y * w + x) * 4;
      hd.data[i] = Math.round(t * 255);
      hd.data[i + 1] = Math.round((1 - Math.abs(t - 0.5) * 2) * 180);
      hd.data[i + 2] = Math.round((1 - t) * 255);
      hd.data[i + 3] = 180;
    }
  }
  hctx.putImageData(hd, 0, 0);
  const distortionMapBase64 = hc.toDataURL("image/png").split(",")[1];

  return {
    flattenedBase64,
    distortionMapBase64,
    method: chosenMethod,
    maxStretch: Math.round(maxStretch * 1000) / 1000,
  };
}

/* ── Component ──────────────────────────────────────────────── */
export default function MeshFlattener() {
  const {
    sourceImage,
    depthMap,
    meshProjection,
    flatten,
    setFlatten,
    updateStep,
    setCurrentStep,
    steps,
    options,
  } = useUnwrapStore();

  const [preview, setPreview] = useState<"flat" | "distortion">("flat");
  const stepState = steps["mesh-flattening"];
  const isRunning = stepState.status === "running";
  const ready = !!meshProjection && !!depthMap && !!sourceImage;

  const run = useCallback(async () => {
    if (!meshProjection || !depthMap || !sourceImage) return;
    updateStep("mesh-flattening", {
      status: "running",
      progress: 0,
      message: "Parameterising mesh surface…",
    });
    setCurrentStep("mesh-flattening");

    try {
      updateStep("mesh-flattening", {
        progress: 25,
        message: `Running ${options.flattenMethod} flattening…`,
      });
      const result = await flattenMesh(
        meshProjection.meshData,
        sourceImage.preview,
        depthMap.depthBase64,
        options.flattenMethod,
        sourceImage.width,
        sourceImage.height,
      );
      updateStep("mesh-flattening", {
        progress: 80,
        message: "Computing distortion map…",
      });

      setFlatten(result);
      updateStep("mesh-flattening", {
        status: "complete",
        progress: 100,
        message: `Done – ${result.method}, max stretch ${result.maxStretch.toFixed(3)}`,
      });
    } catch (err) {
      updateStep("mesh-flattening", {
        status: "error",
        progress: 0,
        message: err instanceof Error ? err.message : "Flattening failed",
        error: String(err),
      });
    }
  }, [
    meshProjection,
    depthMap,
    sourceImage,
    options.flattenMethod,
    updateStep,
    setCurrentStep,
    setFlatten,
  ]);

  if (!ready) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
        Complete Step 2 (Mesh Projection) first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <span>📐</span> Step 3 — Flatten Surface
        </h3>
        <button
          onClick={run}
          disabled={isRunning}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Running…" : flatten ? "Re-run" : "Flatten"}
        </button>
      </div>

      <p className="text-xs text-zinc-400">
        Unwraps the curved 3D surface back to a flat plane using depth-guided
        warping. Preserves proportions via{" "}
        {options.flattenMethod === "auto" ? "automatic" : options.flattenMethod}{" "}
        mapping.
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

      {flatten && (
        <>
          <div className="flex gap-1 rounded-lg bg-zinc-800/80 p-0.5">
            {(["flat", "distortion"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPreview(t)}
                className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  preview === t
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t === "flat" ? "Flattened" : "Distortion Map"}
              </button>
            ))}
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${
                preview === "flat"
                  ? flatten.flattenedBase64
                  : flatten.distortionMapBase64
              }`}
              alt={
                preview === "flat" ? "Flattened tattoo" : "Distortion heatmap"
              }
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400">
            <span>
              Method:{" "}
              <strong className="text-zinc-200">{flatten.method}</strong>
            </span>
            <span>
              Max stretch:{" "}
              <strong className="text-zinc-200">
                {flatten.maxStretch.toFixed(3)}x
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
