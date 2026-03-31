/* ─────────────────────────────────────────────────────────────
   Step 1 – Depth Mapper
   Runs Depth-Anything-V2-Small in the browser via
   @huggingface/transformers on the FULL original photo to
   estimate a depth map + derives surface normals via Sobel.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback, useState } from "react";
import { useUnwrapStore } from "../store";
import type { DepthMapResult } from "../types";
import { getModel, getRawImage, type ProgressCallback } from "../modelLoader";

/* ── Real depth estimation via Depth-Anything-V2 ────────────── */
async function estimateDepth(
  imgSrc: string,
  onProgress?: ProgressCallback,
): Promise<DepthMapResult> {
  // 1. Load the depth-estimation pipeline (downloads model on first run)
  const depthPipe = await getModel("depth", onProgress);

  // 2. Load the image into a RawImage for the pipeline
  const RawImage = await getRawImage();
  const rawImg = await RawImage.fromURL(imgSrc);

  // 3. Run Depth-Anything-V2-Small inference
  const output = await (depthPipe as Function)(rawImg);

  // 4. Extract depth data — output format varies by library version:
  //    - { predicted_depth: RawImage }  → .width, .height, .data
  //    - { predicted_depth: Tensor }    → .dims [H, W], .data
  //    - [ { predicted_depth } ]        → array wrapper
  const depthObj = Array.isArray(output)
    ? (output[0].predicted_depth ?? output[0])
    : (output.predicted_depth ?? output);

  // Get dimensions — try .width/.height, then .dims, then .size
  let w: number;
  let h: number;
  let raw: Float32Array | Uint8Array;

  if (
    typeof depthObj.width === "number" &&
    typeof depthObj.height === "number"
  ) {
    w = Math.round(depthObj.width);
    h = Math.round(depthObj.height);
    raw = depthObj.data;
  } else if (depthObj.dims && depthObj.dims.length >= 2) {
    // Tensor with dims [batch?, H, W] or [H, W]
    const dims = depthObj.dims;
    h = Math.round(dims[dims.length - 2]);
    w = Math.round(dims[dims.length - 1]);
    raw = depthObj.data;
  } else if (depthObj.size) {
    // Some tensor formats use .size()
    const sz =
      typeof depthObj.size === "function" ? depthObj.size() : depthObj.size;
    w = Math.round(Array.isArray(sz) ? sz[sz.length - 1] : sz);
    h = Math.round(Array.isArray(sz) ? sz[sz.length - 2] : sz);
    raw = depthObj.data;
  } else {
    // Last resort: use input image dimensions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ri = rawImg as any;
    const inputW = Math.round(
      ri?.width ?? ri?.dims?.[ri.dims.length - 1] ?? 256,
    );
    const inputH = Math.round(
      ri?.height ?? ri?.dims?.[ri.dims.length - 2] ?? 256,
    );
    raw = depthObj.data ?? depthObj;
    w = inputW;
    h = inputH;
  }

  // Safety: ensure valid integer dimensions
  if (!w || !h || !Number.isFinite(w) || !Number.isFinite(h)) {
    throw new Error(`Invalid depth output dimensions: ${w}x${h}`);
  }

  // ── depth map canvas ──
  const dc = document.createElement("canvas");
  dc.width = w;
  dc.height = h;
  const dctx = dc.getContext("2d")!;
  const dd = dctx.createImageData(w, h);

  // raw depth data — normalise to 0-255
  let min = Infinity,
    max = -Infinity;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] < min) min = raw[i];
    if (raw[i] > max) max = raw[i];
  }
  const range = max - min || 1;

  const depthGray = new Uint8Array(w * h);
  for (let i = 0; i < raw.length; i++) {
    depthGray[i] = Math.round(((raw[i] - min) / range) * 255);
  }

  for (let i = 0; i < depthGray.length; i++) {
    const v = depthGray[i];
    const j = i * 4;
    dd.data[j] = v;
    dd.data[j + 1] = v;
    dd.data[j + 2] = v;
    dd.data[j + 3] = 255;
  }
  dctx.putImageData(dd, 0, 0);
  const depthBase64 = dc.toDataURL("image/png").split(",")[1];

  // ── normal map: derive from depth via Sobel-like gradients ──
  const nc = document.createElement("canvas");
  nc.width = w;
  nc.height = h;
  const nctx = nc.getContext("2d")!;
  const nd = nctx.createImageData(w, h);
  const np = nd.data;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      const l = depthGray[y * w + (x - 1)];
      const r = depthGray[y * w + (x + 1)];
      const t = depthGray[(y - 1) * w + x];
      const b = depthGray[(y + 1) * w + x];
      const dx = (r - l) / 2;
      const dy = (b - t) / 2;
      np[idx] = Math.max(0, Math.min(255, 128 + dx)); // R = X
      np[idx + 1] = Math.max(0, Math.min(255, 128 + dy)); // G = Y
      np[idx + 2] = 255; // B = Z (up)
      np[idx + 3] = 255;
    }
  }
  nctx.putImageData(nd, 0, 0);
  const normalBase64 = nc.toDataURL("image/png").split(",")[1];

  return { depthBase64, normalBase64, method: "midas" };
}

/* ── Component ──────────────────────────────────────────────── */
export default function DepthMapper() {
  const {
    sourceImage,
    depthMap,
    setDepthMap,
    updateStep,
    setCurrentStep,
    steps,
  } = useUnwrapStore();

  const [preview, setPreview] = useState<"depth" | "normal">("depth");
  const stepState = steps["depth-mapping"];
  const isRunning = stepState.status === "running";
  const ready = !!sourceImage;

  const run = useCallback(async () => {
    if (!sourceImage) return;
    updateStep("depth-mapping", {
      status: "running",
      progress: 0,
      message: "Loading Depth-Anything-V2 model…",
    });
    setCurrentStep("depth-mapping");

    try {
      const result = await estimateDepth(sourceImage.preview, (info) => {
        if (info.status === "progress" && info.progress != null) {
          const pct = Math.round(info.progress);
          updateStep("depth-mapping", {
            progress: Math.min(60, pct * 0.6),
            message: info.file
              ? `Downloading ${info.file.split("/").pop()} — ${pct}%`
              : `Loading model — ${pct}%`,
          });
        } else if (info.status === "ready") {
          updateStep("depth-mapping", {
            progress: 65,
            message: "Model loaded — running inference…",
          });
        }
      });
      updateStep("depth-mapping", {
        progress: 90,
        message: "Deriving surface normals…",
      });

      setDepthMap(result);
      updateStep("depth-mapping", {
        status: "complete",
        progress: 100,
        message: `Done – method: ${result.method}`,
      });
    } catch (err) {
      updateStep("depth-mapping", {
        status: "error",
        progress: 0,
        message: err instanceof Error ? err.message : "Depth estimation failed",
        error: String(err),
      });
    }
  }, [sourceImage, updateStep, setCurrentStep, setDepthMap]);

  if (!ready) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
        Upload an image to begin.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <span>🗺️</span> Step 1 — Map Skin Depth
        </h3>
        <button
          onClick={run}
          disabled={isRunning}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Running…" : depthMap ? "Re-run" : "Estimate Depth"}
        </button>
      </div>

      <p className="text-xs text-zinc-400">
        Single-image depth estimation on the full photo to understand the 3D
        curvature of the skin surface.
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

      {depthMap && (
        <>
          <div className="flex gap-1 rounded-lg bg-zinc-800/80 p-0.5">
            {(["depth", "normal"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPreview(t)}
                className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  preview === t
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t === "depth" ? "Depth Map" : "Normal Map"}
              </button>
            ))}
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${preview === "depth" ? depthMap.depthBase64 : depthMap.normalBase64}`}
              alt={preview === "depth" ? "Depth map" : "Normal map"}
              className="h-full w-full object-contain"
            />
          </div>

          <p className="text-[11px] text-zinc-400">
            Method: <strong className="text-zinc-200">{depthMap.method}</strong>
          </p>
        </>
      )}

      {stepState.status === "error" && (
        <p className="text-xs text-red-400">{stepState.message}</p>
      )}
    </div>
  );
}
