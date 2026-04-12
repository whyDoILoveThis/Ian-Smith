/* ─────────────────────────────────────────────────────────────
   Step 6 – Ink Extractor (Tattoo Segmenter)
   Runs RMBG-1.4 in the browser on the CLEANED, FLATTENED image
   (after depth → flatten → inpaint → style-restore) so the
   model sees a normalised image free of harsh lighting and
   curvature. Then uses adaptive luminance thresholding to
   isolate just the tattoo ink from skin.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback, useRef, useState } from "react";
import { useUnwrapStore } from "../store";
import type { SegmentationResult, TattooStyleHint } from "../types";
import {
  getSegmentationModel,
  getRawImage,
  type ProgressCallback,
} from "../modelLoader";

/* ── Real segmentation via RMBG-1.4 + ink detection ─────────── */
async function runSegmentation(
  imgSrc: string,
  w: number,
  h: number,
  onProgress?: ProgressCallback,
): Promise<SegmentationResult> {
  // 1. Load RMBG-1.4 model + processor
  const { model, processor } = await getSegmentationModel(onProgress);
  const RawImage = await getRawImage();

  // 2. Load image
  const rawImg = await RawImage.fromURL(imgSrc);

  // 3. Pre-process image through the processor
  const { pixel_values } = await (processor as Function)(rawImg);

  // 4. Run RMBG-1.4 inference
  const { output } = await (model as Function)({ input: pixel_values });

  // 5. Convert output tensor to mask image
  // output is a tensor [1, H, W] with values 0-1 — multiply by 255 to get alpha mask
  const maskRaw = RawImage.fromTensor(output[0].mul(255).to("uint8")) as {
    resize: (
      w: number,
      h: number,
    ) => Promise<{ data: Uint8Array; width: number; height: number }>;
  };

  // 6. Resize mask to match original image dimensions
  const resizedMask = await maskRaw.resize(w, h);
  const maskData = resizedMask.data as Uint8Array;

  // 5. Load original image pixels
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = rej;
    img.src = imgSrc;
  });

  const oc = document.createElement("canvas");
  oc.width = w;
  oc.height = h;
  const octx = oc.getContext("2d")!;
  octx.drawImage(img, 0, 0, w, h);
  const origPixels = octx.getImageData(0, 0, w, h).data;

  // 6. Create foreground-only image + detect ink via luminance on foreground
  const mc = document.createElement("canvas");
  mc.width = w;
  mc.height = h;
  const mctx = mc.getContext("2d")!;
  const md = mctx.createImageData(w, h);

  const ec = document.createElement("canvas");
  ec.width = w;
  ec.height = h;
  const ectx = ec.getContext("2d")!;
  const ed = ectx.createImageData(w, h);

  // determine mask data stride (1 channel or 4 channels)
  const stride = maskData.length === w * h ? 1 : 4;
  let inkPixelCount = 0;
  let totalFgPixels = 0;

  // Adaptive ink detection: compute mean luminance of foreground first
  let lumSum = 0;
  let lumSqSum = 0;
  let fgCount = 0;
  for (let i = 0; i < w * h; i++) {
    const mi = stride === 1 ? i : i * 4;
    if (maskData[mi] > 128) {
      const pi = i * 4;
      const lum =
        0.299 * origPixels[pi] +
        0.587 * origPixels[pi + 1] +
        0.114 * origPixels[pi + 2];
      lumSum += lum;
      lumSqSum += lum * lum;
      fgCount++;
    }
  }
  const meanLum = fgCount > 0 ? lumSum / fgCount : 128;
  const stdLum =
    fgCount > 1
      ? Math.sqrt((lumSqSum - (lumSum * lumSum) / fgCount) / (fgCount - 1))
      : 40;
  // Ink threshold: mean minus 0.8 standard deviations, clamped to reasonable range
  const inkThreshold = Math.max(60, Math.min(180, meanLum - stdLum * 0.8));

  for (let i = 0; i < w * h; i++) {
    const mi = stride === 1 ? i : i * 4;
    const fgAlpha = maskData[mi]; // 0-255 foreground confidence
    const pi = i * 4;
    const r = origPixels[pi],
      g = origPixels[pi + 1],
      b = origPixels[pi + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Use soft foreground threshold with confidence scaling
    const isForeground = fgAlpha > 80;

    if (isForeground) {
      totalFgPixels++;
      // Adaptive ink detection: pixels darker than the adaptive threshold
      // Also check saturation — shadows tend to be desaturated while ink has color/is very dark
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
      const isInk =
        lum < inkThreshold || (lum < inkThreshold + 20 && sat > 0.15);
      if (isInk) inkPixelCount++;

      // Mask: white = tattoo ink, black = skin/bg
      const v = isInk ? 255 : 0;
      md.data[pi] = v;
      md.data[pi + 1] = v;
      md.data[pi + 2] = v;
      md.data[pi + 3] = 255;

      // Extracted: keep original pixels where ink, transparent otherwise
      ed.data[pi] = r;
      ed.data[pi + 1] = g;
      ed.data[pi + 2] = b;
      ed.data[pi + 3] = isInk ? 255 : 0;
    } else {
      // Background — black mask, transparent extraction
      md.data[pi] = 0;
      md.data[pi + 1] = 0;
      md.data[pi + 2] = 0;
      md.data[pi + 3] = 255;

      ed.data[pi] = 0;
      ed.data[pi + 1] = 0;
      ed.data[pi + 2] = 0;
      ed.data[pi + 3] = 0;
    }
  }

  mctx.putImageData(md, 0, 0);
  const maskBase64 = mc.toDataURL("image/png").split(",")[1];

  ectx.putImageData(ed, 0, 0);
  const extractedBase64 = ec.toDataURL("image/png").split(",")[1];

  // 7. Rough style detection from ink density
  const inkRatio = totalFgPixels > 0 ? inkPixelCount / totalFgPixels : 0;
  let styleHint: TattooStyleHint = "unknown";
  if (inkRatio > 0.6) styleHint = "blackwork";
  else if (inkRatio > 0.35) styleHint = "traditional";
  else if (inkRatio > 0.15) styleHint = "geometric";
  else if (inkRatio > 0.05) styleHint = "watercolor";

  const confidence =
    totalFgPixels > 100 ? Math.min(0.95, 0.6 + inkRatio * 0.4) : 0.3;

  return { maskBase64, extractedBase64, styleHint, confidence };
}

/* ── Component ──────────────────────────────────────────────── */
export default function TattooSegmenter() {
  const {
    sourceImage,
    styleRestore,
    inpaint,
    flatten,
    segmentation,
    setSegmentation,
    updateStep,
    setCurrentStep,
    steps,
  } = useUnwrapStore();

  const [preview, setPreview] = useState<"mask" | "extracted">("mask");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stepState = steps["segmentation"];
  const isRunning = stepState.status === "running";

  // Use the best upstream result (style-restored > inpainted > flattened)
  const inputBase64 =
    styleRestore?.refinedBase64 ??
    inpaint?.inpaintedBase64 ??
    flatten?.flattenedBase64;
  const ready = !!inputBase64 && !!sourceImage;

  const run = useCallback(async () => {
    if (!inputBase64 || !sourceImage) return;
    updateStep("segmentation", {
      status: "running",
      progress: 0,
      message: "Loading RMBG-1.4 model…",
    });
    setCurrentStep("segmentation");

    try {
      // Pass data URL directly — blob URLs cause issues with HF transformers caching
      const dataUrl = `data:image/png;base64,${inputBase64}`;

      const result = await runSegmentation(
        dataUrl,
        sourceImage.width,
        sourceImage.height,
        (info) => {
          if (info.status === "progress" && info.progress != null) {
            const pct = Math.round(info.progress);
            updateStep("segmentation", {
              progress: Math.min(60, pct * 0.6),
              message: info.file
                ? `Downloading ${info.file.split("/").pop()} — ${pct}%`
                : `Loading model — ${pct}%`,
            });
          } else if (info.status === "ready") {
            updateStep("segmentation", {
              progress: 65,
              message: "Model loaded — extracting ink…",
            });
          }
        },
      );

      updateStep("segmentation", {
        progress: 90,
        message: "Generating ink mask…",
      });

      setSegmentation(result);
      updateStep("segmentation", {
        status: "complete",
        progress: 100,
        message: `Done – confidence ${(result.confidence * 100).toFixed(0)}%, style: ${result.styleHint}`,
      });
    } catch (err) {
      updateStep("segmentation", {
        status: "error",
        progress: 0,
        message: err instanceof Error ? err.message : "Ink extraction failed",
        error: String(err),
      });
    }
  }, [inputBase64, sourceImage, updateStep, setCurrentStep, setSegmentation]);

  if (!ready) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
        Complete Step 5 (Restore & Clean) first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <span>👁️</span> Step 6 — Extract Ink
        </h3>
        <button
          onClick={run}
          disabled={isRunning}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Running…" : segmentation ? "Re-run" : "Segment"}
        </button>
      </div>

      <p className="text-xs text-zinc-400">
        AI extracts just the tattoo ink from the clean, flattened image.
        Produces a binary mask and an extracted ink layer ready for stencil
        conversion.
      </p>

      {stepState.status === "running" && (
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

      {segmentation && (
        <>
          {/* Toggle tabs */}
          <div className="flex gap-1 rounded-lg bg-zinc-800/80 p-0.5">
            {(["mask", "extracted"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPreview(t)}
                className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  preview === t
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t === "mask" ? "Mask" : "Extracted"}
              </button>
            ))}
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-950">
            <canvas ref={canvasRef} className="hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${
                preview === "mask"
                  ? segmentation.maskBase64
                  : segmentation.extractedBase64
              }`}
              alt={preview === "mask" ? "Tattoo mask" : "Extracted tattoo"}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400">
            <span>
              Confidence:{" "}
              <strong className="text-zinc-200">
                {(segmentation.confidence * 100).toFixed(0)}%
              </strong>
            </span>
            <span>
              Style hint:{" "}
              <strong className="text-zinc-200">
                {segmentation.styleHint}
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
