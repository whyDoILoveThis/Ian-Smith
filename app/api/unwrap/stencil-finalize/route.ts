/* ─────────────────────────────────────────────────────────────
   POST /api/unwrap/stencil-finalize

   Takes a refined tattoo image and produces a clean stencil
   using sharp (threshold, denoise, cleanup) + potrace (SVG).

   Body: {
     imageBase64,
     outputStyle?: "line-art" | "shaded" | "dotwork",
     smoothing?: "none" | "light" | "medium" | "heavy",
     generateSvg?: boolean
   }
   Returns: { success, stencilBase64, svgData?, width, height }
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { trace as potraceTrace } from "potrace";

function res(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

/** Promisified potrace trace. */
function traceToSvg(buf: Buffer, threshold: number): Promise<string> {
  return new Promise((resolve, reject) => {
    potraceTrace(
      buf,
      {
        threshold,
        turdSize: 4,
        optCurve: true,
        optTolerance: 0.3,
        color: "#000000",
        background: "#ffffff",
      },
      (err, svg) => {
        if (err) reject(err);
        else resolve(svg);
      },
    );
  });
}

/** Otsu's method — find optimal threshold for bimodal histogram. */
function otsuThreshold(histogram: number[], total: number): number {
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * histogram[i];

  let sumBg = 0;
  let wBg = 0;
  let maxVariance = 0;
  let bestT = 128;

  for (let t = 0; t < 256; t++) {
    wBg += histogram[t];
    if (wBg === 0) continue;
    const wFg = total - wBg;
    if (wFg === 0) break;

    sumBg += t * histogram[t];
    const meanBg = sumBg / wBg;
    const meanFg = (sumAll - sumBg) / wFg;
    const diff = meanBg - meanFg;
    const variance = wBg * wFg * diff * diff;

    if (variance > maxVariance) {
      maxVariance = variance;
      bestT = t;
    }
  }

  return bestT;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      imageBase64,
      outputStyle = "line-art",
      smoothing = "medium",
      generateSvg = true,
    } = body ?? {};

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res({ success: false, error: "Missing imageBase64" }, 400);
    }

    const imgBuf = Buffer.from(imageBase64, "base64");

    // 1. Convert to grayscale
    let pipeline = sharp(imgBuf).grayscale();

    // 2. Smoothing pass
    const smoothMap = { none: 0, light: 1, medium: 3, heavy: 5 };
    const medianSize = smoothMap[smoothing as keyof typeof smoothMap] ?? 3;
    if (medianSize > 0) {
      pipeline = pipeline.median(medianSize);
    }

    // 3. Get raw pixels for Otsu threshold
    const grayBuf = await pipeline.raw().toBuffer({ resolveWithObject: true });
    const { data: grayData, info } = grayBuf;
    const { width, height } = info;
    const totalPixels = width * height;

    // Build histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < grayData.length; i++) {
      histogram[grayData[i]]++;
    }
    const threshold = otsuThreshold(histogram, totalPixels);

    // 4. Apply threshold based on output style
    let stencilBuf: Buffer;

    if (outputStyle === "shaded") {
      // Keep grayscale, just enhance contrast
      stencilBuf = await sharp(imgBuf)
        .grayscale()
        .linear(1.4, 128 * (1 - 1.4))
        .png()
        .toBuffer();
    } else if (outputStyle === "dotwork") {
      // Ordered dithering — apply through sharp threshold with slight offset
      stencilBuf = await sharp(imgBuf)
        .grayscale()
        .threshold(threshold)
        .png()
        .toBuffer();
    } else {
      // line-art — clean B&W via Otsu
      stencilBuf = await sharp(imgBuf)
        .grayscale()
        .median(medianSize || 1)
        .threshold(threshold)
        .png()
        .toBuffer();
    }

    // 5. Final cleanup — remove small speckles
    stencilBuf = await sharp(stencilBuf).median(3).png().toBuffer();

    const stencilBase64 = stencilBuf.toString("base64");

    // 6. Optional SVG vectorization via potrace
    let svgData: string | undefined;
    if (generateSvg) {
      try {
        svgData = await traceToSvg(stencilBuf, threshold);
      } catch (err) {
        console.warn("[unwrap/stencil-finalize] SVG trace failed:", err);
      }
    }

    return res({
      success: true,
      stencilBase64,
      svgData,
      width,
      height,
    });
  } catch (err) {
    console.error("[unwrap/stencil-finalize] Error:", err);
    return res({ success: false, error: "Internal server error" }, 500);
  }
}
