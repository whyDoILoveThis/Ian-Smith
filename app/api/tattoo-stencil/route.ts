/* ─────────────────────────────────────────────────────────────
   POST /api/tattoo-stencil   (Pipeline v6 — LAB color-space)

   Takes a photo of a tattoo on a body part and generates a
   flat, clean, high-contrast stencil (PNG + optional SVG).

   Major improvements over v5:
     • Works in CIE-LAB color space — separates lightness from
       chrominance, making ink detection lighting-invariant.
     • Supports a user-painted tattoo highlight mask: the user
       paints over the tattoo, giving us supervised ink/skin
       samples for robust statistical separation.
     • Supports polygon-based limb outline for better cylinder
       fitting via PCA.
     • Uses Otsu's automatic thresholding — adapts to every
       image instead of hard-coded values.

   Pipeline:
     1. Decode → flatten alpha → optional crop → resize
     2. Light denoise (median 3)
     3. Convert to CIE-LAB per-pixel
     4. Ink/skin separation:
        a) Supervised: use tattoo mask to sample ink & skin stats
        b) Unsupervised: background-estimation in LAB space
     5. Generate "ink score" map (0-255)
     6. Optional cylindrical unwrap (polygon outline or AI)
     7. Otsu auto-threshold → binary stencil
     8. Cleanup: median, anti-alias
     9. Straighten limb axis
    10. Output PNG + optional SVG
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// ── Tunables ─────────────────────────────────────────────────

/** How much to weight chrominance vs luminance in the ink score.
 *  Higher = more weight on color difference (good for coloured tattoos).
 *  Lower  = more weight on darkness (good for black ink). */
const CHROMA_WEIGHT = { low: 0.3, medium: 0.5, high: 0.8 } as const;

/** Background-estimate blur sigma as fraction of short side. */
const BG_SIGMA_FRAC = 0.12;

/** Post-Otsu threshold bias.  Positive = stricter, negative = looser. */
const THRESHOLD_BIAS = { low: 25, medium: 0, high: -20 } as const;

/** Curvature multiplier — values >1 make unwrapping more aggressive. */
const UNWRAP_AGGRESSION = 1.35;

/** Angular edge-fade start (radians). Score is attenuated from here to ±90°
 *  to prevent dark-spot artifacts at the cylinder boundary. */
const EDGE_FADE_START = 60 * Math.PI / 180;

// ── Server-local types ───────────────────────────────────────

interface BBox { x: number; y: number; width: number; height: number }
interface Landmark { x: number; y: number; z: number; visibility: number }
interface LimbRegion {
  boundingBox: BBox;
  angle: number;
  limbType: string;
  confidence: number;
  landmarks: Landmark[];
}
interface Point2D { x: number; y: number }
interface LimbOutline { points: Point2D[] }
interface TattooHighlight { maskBase64: string; width: number; height: number }
interface CurveHighlight { maskBase64: string; width: number; height: number; curvaturePercent: number; angleDeg: number }
interface StencilOptions {
  generateSvg: boolean;
  contrastLevel: 'low' | 'medium' | 'high';
  edgeThickness: 'thin' | 'medium' | 'thick';
  noiseReduction: 'low' | 'medium' | 'high';
  curvatureStrength: number;
}
interface UnwrapDebugInfo {
  applied: boolean;
  source: 'outline' | 'landmarks' | 'curve-mask' | 'none';
  centerX?: number;
  centerY?: number;
  radius?: number;
  angle?: number;
  imageW?: number;
  imageH?: number;
  halfLength?: number;
  outlinePoints?: { x: number; y: number }[];
  tattooHighlightBase64?: string;
  curveHighlightBase64?: string;
  curvaturePercent?: number;
}
interface UnwrapResult { buf: Buffer; debug: UnwrapDebugInfo }

// ── Route configuration ──────────────────────────────────────

export const runtime = 'nodejs';
export const maxDuration = 60;

// ── POST handler ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const t0 = Date.now();

  try {
    const body = await request.json();
    const { imageBase64, limbRegion, limbOutline, tattooHighlight, curveHighlight, options } = body as {
      imageBase64: string;
      limbRegion?: LimbRegion;
      limbOutline?: LimbOutline;
      tattooHighlight?: TattooHighlight;
      curveHighlight?: CurveHighlight;
      options: StencilOptions;
    };

    if (!imageBase64) {
      return res({ success: false, error: 'No image provided.' }, 400);
    }

    /* ── Decode & validate ─────────────────────────────────── */
    const srcBuf = Buffer.from(imageBase64, 'base64');
    let origW: number, origH: number;
    try {
      const meta = await sharp(srcBuf).metadata();
      if (!meta.width || !meta.height) {
        return res({ success: false, error: 'Unreadable image format.' }, 400);
      }
      origW = meta.width;
      origH = meta.height;
    } catch {
      return res({
        success: false,
        error: 'Could not decode image. Upload a valid JPEG, PNG, or WebP.',
      }, 400);
    }

    /* ── 2. Flatten alpha · optional crop · resize ─────────── */
    let cropX = 0, cropY = 0, cropW = origW, cropH = origH;
    const base = () => sharp(srcBuf).flatten({ background: '#ffffff' });
    let chain;

    // Only auto-crop when no user geometry is provided
    const hasUserGeometry = !!limbOutline || !!tattooHighlight;

    if (!hasUserGeometry && limbRegion?.boundingBox) {
      const b = limbRegion.boundingBox;
      cropX = clamp(Math.round(b.x), 0, origW - 1);
      cropY = clamp(Math.round(b.y), 0, origH - 1);
      cropW = clamp(Math.round(b.width), 1, origW - cropX);
      cropH = clamp(Math.round(b.height), 1, origH - cropY);
      if (cropW > 30 && cropH > 30) {
        chain = base().extract({ left: cropX, top: cropY, width: cropW, height: cropH });
      } else {
        cropX = 0; cropY = 0; cropW = origW; cropH = origH;
        chain = base();
      }
    } else {
      chain = base();
    }

    const rgbPng = await chain
      .resize(1536, 1536, { fit: 'inside', withoutEnlargement: true })
      .removeAlpha()
      .toFormat('png')
      .toBuffer();

    const gMeta = await sharp(rgbPng).metadata();
    const W = gMeta.width!;
    const H = gMeta.height!;
    const numPixels = W * H;

    /* ── 3. Light denoise ──────────────────────────────────── */
    const denoisedBuf = await sharp(rgbPng).median(3).removeAlpha().raw().toBuffer();

    /* ── 4. Convert to CIE-LAB ─────────────────────────────── */
    const labL = new Float32Array(numPixels);
    const labA = new Float32Array(numPixels);
    const labB = new Float32Array(numPixels);

    for (let i = 0; i < numPixels; i++) {
      const r = denoisedBuf[i * 3] / 255;
      const g = denoisedBuf[i * 3 + 1] / 255;
      const b = denoisedBuf[i * 3 + 2] / 255;
      const [L, a, bVal] = rgbToLab(r, g, b);
      labL[i] = L;
      labA[i] = a;
      labB[i] = bVal;
    }

    /* ── 5. Ink/skin separation ────────────────────────────── */
    // Always use unsupervised separation — it gives the cleanest ink scores.
    // When a tattoo highlight mask is provided, it's used purely for clipping
    // in step 7 (not for changing the detection algorithm).  The supervised
    // approach was producing patchy results because the hand-painted mask
    // blends ink + skin pixels, giving noisy class statistics.
    let inkScoreMap: Uint8Array;
    const separationMethod: 'supervised' | 'unsupervised' = 'unsupervised';

    inkScoreMap = unsupervisedSeparation(
      labL, labA, labB, W, H, options.contrastLevel,
    );

    // Debug: log ink-score distribution to help diagnose blank outputs
    {
      let sMin = 255, sMax = 0, sSum = 0;
      for (let i = 0; i < numPixels; i++) {
        if (inkScoreMap[i] < sMin) sMin = inkScoreMap[i];
        if (inkScoreMap[i] > sMax) sMax = inkScoreMap[i];
        sSum += inkScoreMap[i];
      }
      console.log('[tattoo-stencil] InkScore: min=%d max=%d mean=%.1f',
        sMin, sMax, sSum / numPixels);
    }

    // Pre-stencil grayscale for debug overlay
    const preStencilBuf = await sharp(
      Buffer.from(inkScoreMap),
      { raw: { width: W, height: H, channels: 1 } },
    ).png({ compressionLevel: 8 }).toBuffer();
    const preStencilBase64 = preStencilBuf.toString('base64');

    /* ── 6. Cylindrical unwrap ─────────────────────────────── */
    const curvK = typeof options.curvatureStrength === 'number'
      ? Math.max(0.25, Math.min(3.0, options.curvatureStrength))
      : 1.0;

    let unwrapDebug: UnwrapDebugInfo = { applied: false, source: 'none' };
    let scoreBuf = await sharp(
      Buffer.from(inkScoreMap),
      { raw: { width: W, height: H, channels: 1 } },
    ).png().toBuffer();

    // Priority 1: user-painted curve mask (most direct control)
    if (curveHighlight?.maskBase64) {
      const ur = await curveMaskUnwrap(
        scoreBuf, W, H, curveHighlight,
      );
      if (ur.debug.applied) scoreBuf = ur.buf;
      unwrapDebug = ur.debug;
    }
    // Priority 2: polygon outline → PCA cylinder
    else if (limbOutline && limbOutline.points.length >= 3) {
      const ur = await cylindricalUnwrapFromOutline(
        scoreBuf, W, H, limbOutline, curvK,
      );
      if (ur.debug.applied) scoreBuf = ur.buf;
      unwrapDebug = ur.debug;
    }
    // Priority 3: AI-detected landmarks
    else if (limbRegion && limbRegion.confidence > 0.85) {
      const ur = await cylindricalUnwrapFromLandmarks(
        scoreBuf, W, H, limbRegion,
        origW, origH, cropX, cropY, cropW, cropH, curvK,
      );
      if (ur.debug.applied) scoreBuf = ur.buf;
      unwrapDebug = ur.debug;
    }

    // Attach tattoo highlight mask to debug info for visual feedback
    if (tattooHighlight?.maskBase64) {
      unwrapDebug.tattooHighlightBase64 = tattooHighlight.maskBase64;
    }
    // Also attach curve highlight for debug
    if (curveHighlight?.maskBase64) {
      unwrapDebug.curveHighlightBase64 = curveHighlight.maskBase64;
    }

    /* ── 7. Auto-threshold (Otsu) → binary stencil ─────────── */
    const scoreRaw = await sharp(scoreBuf)
      .removeAlpha()
      .grayscale()
      .raw()
      .toBuffer();

    const sMeta2 = await sharp(scoreBuf).metadata();
    const sW = sMeta2.width ?? W;
    const sH = sMeta2.height ?? H;
    const scorePixels = sW * sH;

    const hist = new Uint32Array(256);
    for (let i = 0; i < scorePixels; i++) hist[scoreRaw[i]]++;

    // When cylindrical unwrap was applied, pixels outside the cylinder
    // are zero-filled and edge-faded pixels may have very low values.
    // Exclude bins 0–3 from Otsu so these don't skew the threshold.
    let otsuTotal = scorePixels;
    if (unwrapDebug.applied) {
      for (let b = 0; b <= 3; b++) {
        otsuTotal -= hist[b];
        hist[b] = 0;
      }
    }
    const autoThresh = otsuThreshold(hist, otsuTotal);
    const bias = THRESHOLD_BIAS[options.contrastLevel];
    const finalThresh = clamp(autoThresh + bias, 10, 245);

    console.log('[tattoo-stencil] Otsu threshold=%d, bias=%d, final=%d, unwrap=%s',
      autoThresh, bias, finalThresh, unwrapDebug.applied ? unwrapDebug.source : 'none');

    const binaryBuf = Buffer.alloc(scorePixels, 255); // default white
    for (let i = 0; i < scorePixels; i++) {
      // Skip zero/near-zero pixels from unwrap edge-fade (leave white)
      if (unwrapDebug.applied && scoreRaw[i] <= 3) continue;
      binaryBuf[i] = scoreRaw[i] >= finalThresh ? 0 : 255;
    }

    // If user painted a tattoo highlight, clip stencil to that region only.
    // Anything outside the highlight mask is forced white (not tattoo).
    if (tattooHighlight?.maskBase64) {
      const clipMask = Buffer.from(tattooHighlight.maskBase64, 'base64');
      const clipRaw = await sharp(clipMask)
        .resize(sW, sH, { fit: 'fill' })
        .grayscale()
        .removeAlpha()
        .raw()
        .toBuffer();
      for (let i = 0; i < scorePixels; i++) {
        if (clipRaw[i] <= 128) binaryBuf[i] = 255; // outside highlight → white
      }
    }

    // If user drew an outline polygon, also clip to inside the polygon.
    if (limbOutline && limbOutline.points.length >= 3) {
      // Build a polygon mask at stencil resolution
      const polyPts = limbOutline.points.map(p => ({
        x: p.x * sW,
        y: p.y * sH,
      }));
      for (let py = 0; py < sH; py++) {
        for (let px = 0; px < sW; px++) {
          if (!pointInPolygon(px, py, polyPts)) {
            binaryBuf[py * sW + px] = 255; // outside polygon → white
          }
        }
      }
    }

    let stencilBuf = await sharp(
      binaryBuf,
      { raw: { width: sW, height: sH, channels: 1 } },
    ).png().toBuffer();

    /* ── 8. Cleanup ─────────────────────────────────────── */
    // No blur — Otsu already gives clean binary edges.
    // The blur+threshold was causing lumpy/wavery lines.
    // Potrace's turdSize handles remaining single-pixel noise.

    /* ── 9. Straighten limb axis ───────────────────────────── */
    if (limbRegion?.angle && Math.abs(limbRegion.angle) > 5) {
      stencilBuf = await sharp(stencilBuf)
        .rotate(-limbRegion.angle, { background: '#ffffff' })
        .png()
        .toBuffer();
    }

    /* ── 10. Final output ──────────────────────────────────── */
    const pngBuf = await sharp(stencilBuf).png({ compressionLevel: 6 }).toBuffer();
    const sMeta = await sharp(pngBuf).metadata();
    const pngBase64 = pngBuf.toString('base64');

    let svgData: string | undefined;
    if (options.generateSvg) {
      try { svgData = await traceToSvg(pngBuf); } catch (e) {
        console.warn('[tattoo-stencil] SVG skipped:', e);
      }
    }

    return res({
      success: true,
      data: {
        pngBase64,
        svgData,
        preStencilBase64,
        metadata: {
          originalWidth: origW,
          originalHeight: origH,
          stencilWidth: sMeta.width ?? 0,
          stencilHeight: sMeta.height ?? 0,
          limbDetected: !!limbRegion,
          limbType: limbRegion?.limbType,
          processingTimeMs: Date.now() - t0,
          unwrapDebug,
          separationMethod,
        },
      },
    });
  } catch (err) {
    console.error('[tattoo-stencil] Pipeline error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown processing error.';
    return res({ success: false, error: `Stencil generation failed: ${msg}` }, 500);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CIE-LAB colour space conversion
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Convert sRGB (0-1) to CIE-LAB. Returns [L, a, b]. */
function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // sRGB → linear RGB
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Linear RGB → XYZ (D65 illuminant)
  let x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  let y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / 1.00000;
  let z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;

  // XYZ → LAB
  const epsilon = 0.008856;
  const kappa = 903.3;
  x = x > epsilon ? Math.cbrt(x) : (kappa * x + 16) / 116;
  y = y > epsilon ? Math.cbrt(y) : (kappa * y + 16) / 116;
  z = z > epsilon ? Math.cbrt(z) : (kappa * z + 16) / 116;

  const L = 116 * y - 16;     // 0 – 100
  const a = 500 * (x - y);    // approx -128 – 127
  const bVal = 200 * (y - z); // approx -128 – 127
  return [L, a, bVal];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Supervised separation (user-painted tattoo mask)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function supervisedSeparation(
  labL: Float32Array, labA: Float32Array, labB: Float32Array,
  W: number, H: number,
  tattooHighlight: TattooHighlight,
  contrast: 'low' | 'medium' | 'high',
): Promise<Uint8Array> {
  const maskBuf = Buffer.from(tattooHighlight.maskBase64, 'base64');
  const maskRaw = await sharp(maskBuf)
    .resize(W, H, { fit: 'fill' })
    .grayscale()
    .removeAlpha()
    .raw()
    .toBuffer();

  const numPixels = W * H;

  // First pass: compute means
  let inkL = 0, inkA = 0, inkB = 0, inkCount = 0;
  let skinL = 0, skinA = 0, skinB = 0, skinCount = 0;

  for (let i = 0; i < numPixels; i++) {
    if (maskRaw[i] > 128) {
      inkL += labL[i]; inkA += labA[i]; inkB += labB[i]; inkCount++;
    } else {
      skinL += labL[i]; skinA += labA[i]; skinB += labB[i]; skinCount++;
    }
  }

  if (inkCount < 10) {
    return unsupervisedSeparation(labL, labA, labB, W, H, contrast);
  }

  const inkMeanL = inkL / inkCount;
  const inkMeanA = inkA / inkCount;
  const inkMeanB = inkB / inkCount;
  const skinMeanL = skinCount > 0 ? skinL / skinCount : 70;
  const skinMeanA = skinCount > 0 ? skinA / skinCount : 15;
  const skinMeanB = skinCount > 0 ? skinB / skinCount : 20;

  // Second pass: compute variances → std deviations
  let skinLVar = 0, skinAVar = 0, skinBVar = 0;
  for (let i = 0; i < numPixels; i++) {
    if (maskRaw[i] <= 128) {
      skinLVar += (labL[i] - skinMeanL) ** 2;
      skinAVar += (labA[i] - skinMeanA) ** 2;
      skinBVar += (labB[i] - skinMeanB) ** 2;
    }
  }
  const skinStdL = Math.max(3, Math.sqrt(skinLVar / Math.max(1, skinCount)));
  const skinStdA = Math.max(2, Math.sqrt(skinAVar / Math.max(1, skinCount)));
  const skinStdB = Math.max(2, Math.sqrt(skinBVar / Math.max(1, skinCount)));

  // Score: distance from skin model in standardised LAB space
  const chromaW = CHROMA_WEIGHT[contrast];
  const lumaW = 1.0 - chromaW * 0.5;
  const rawScores = new Float32Array(numPixels);
  let maxScore = 0;

  for (let i = 0; i < numPixels; i++) {
    const dL = Math.abs(labL[i] - skinMeanL) / skinStdL;
    const dA = Math.abs(labA[i] - skinMeanA) / skinStdA;
    const dB = Math.abs(labB[i] - skinMeanB) / skinStdB;
    const chromaDist = Math.sqrt(dA * dA + dB * dB);
    const score = lumaW * dL + chromaW * chromaDist;
    rawScores[i] = score;
    if (score > maxScore) maxScore = score;
  }

  if (maxScore < 0.1) maxScore = 1;
  const scoreMap = new Uint8Array(numPixels);
  for (let i = 0; i < numPixels; i++) {
    scoreMap[i] = clamp(Math.round((rawScores[i] / maxScore) * 255), 0, 255);
  }
  return scoreMap;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Unsupervised separation (background estimation in LAB)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function unsupervisedSeparation(
  labL: Float32Array, labA: Float32Array, labB: Float32Array,
  W: number, H: number,
  contrast: 'low' | 'medium' | 'high',
): Uint8Array {
  const numPixels = W * H;

  // Estimate skin as the median LAB value (majority of pixels)
  // Use histogram on L channel (quantised to 0-100)
  const lHist = new Uint32Array(101);
  for (let i = 0; i < numPixels; i++) {
    lHist[clamp(Math.round(labL[i]), 0, 100)]++;
  }
  let peakBin = 0, peakCount = 0;
  for (let b = 0; b < 101; b++) {
    if (lHist[b] > peakCount) { peakCount = lHist[b]; peakBin = b; }
  }

  // Average LAB values of pixels near the L-peak (within ±8)
  let sL = 0, sA = 0, sB = 0, sCnt = 0;
  for (let i = 0; i < numPixels; i++) {
    if (Math.abs(labL[i] - peakBin) <= 8) {
      sL += labL[i]; sA += labA[i]; sB += labB[i]; sCnt++;
    }
  }
  const skinMeanL = sCnt > 0 ? sL / sCnt : peakBin;
  const skinMeanA = sCnt > 0 ? sA / sCnt : 0;
  const skinMeanB = sCnt > 0 ? sB / sCnt : 0;

  // Score each pixel by distance from estimated skin color
  const chromaW = CHROMA_WEIGHT[contrast];
  const lumaW = 1.0 - chromaW * 0.5;
  const rawScores = new Float32Array(numPixels);
  let maxScore = 0;

  for (let i = 0; i < numPixels; i++) {
    const dL = Math.abs(labL[i] - skinMeanL);
    const dA = Math.abs(labA[i] - skinMeanA);
    const dB = Math.abs(labB[i] - skinMeanB);
    const chromaDist = Math.sqrt(dA * dA + dB * dB);
    const score = lumaW * dL + chromaW * chromaDist;
    rawScores[i] = score;
    if (score > maxScore) maxScore = score;
  }

  if (maxScore < 1) return new Uint8Array(numPixels);

  const scoreMap = new Uint8Array(numPixels);
  for (let i = 0; i < numPixels; i++) {
    scoreMap[i] = clamp(Math.round((rawScores[i] / maxScore) * 255), 0, 255);
  }
  return scoreMap;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Otsu's automatic thresholding
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function otsuThreshold(histogram: Uint32Array, total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0, wB = 0, maxVariance = 0, bestThreshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) {
      maxVariance = variance;
      bestThreshold = t;
    }
  }
  return bestThreshold;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Point-in-polygon (ray casting)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function pointInPolygon(
  x: number, y: number,
  poly: { x: number; y: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if ((yi > y) !== (yj > y) &&
        x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Cylindrical surface unwrapping
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * User-painted curve mask → cylinder unwrap.
 * The yellow mask stores per-pixel curvature as a grayscale value:
 *   0 = not painted (no curvature)
 *   1–255 = curvature level (maps to ~0.4 %–100 %)
 * The unwrap uses a cross-section curvature profile along the user-
 * specified axis so that different brush strokes with different
 * curvature levels produce proportionally different amounts of stretch.
 */
async function curveMaskUnwrap(
  imgBuf: Buffer,
  W: number, H: number,
  curveHighlight: CurveHighlight,
): Promise<UnwrapResult> {
  const noOp: UnwrapDebugInfo = { applied: false, source: 'curve-mask' };

  const maskBuf = Buffer.from(curveHighlight.maskBase64, 'base64');
  const maskRaw = await sharp(maskBuf)
    .resize(W, H, { fit: 'fill' })
    .grayscale()
    .removeAlpha()
    .raw()
    .toBuffer();

  // Collect non-zero mask pixels with their curvature values
  const maskedPts: { x: number; y: number; curv: number }[] = [];
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const v = maskRaw[py * W + px];
      if (v > 2) {
        maskedPts.push({ x: px, y: py, curv: v / 255 });
      }
    }
  }

  if (maskedPts.length < 50) return { buf: imgBuf, debug: noOp };

  // Centroid of the masked region
  let cx = 0, cy = 0;
  for (const p of maskedPts) { cx += p.x; cy += p.y; }
  cx /= maskedPts.length;
  cy /= maskedPts.length;

  // Use user-specified angle (degrees → radians)
  const angle = (curveHighlight.angleDeg ?? 0) * Math.PI / 180;
  const cosA = Math.cos(angle), sinA = Math.sin(angle);

  // Find perpendicular width and along extent of masked region
  let minAcross = Infinity, maxAcross = -Infinity;
  let minAlong = Infinity, maxAlong = -Infinity;
  for (const p of maskedPts) {
    const along  =  (p.x - cx) * cosA + (p.y - cy) * sinA;
    const across = -(p.x - cx) * sinA + (p.y - cy) * cosA;
    minAcross = Math.min(minAcross, across);
    maxAcross = Math.max(maxAcross, across);
    minAlong  = Math.min(minAlong, along);
    maxAlong  = Math.max(maxAlong, along);
  }

  const perpWidth = maxAcross - minAcross;
  if (perpWidth < 10) return { buf: imgBuf, debug: noOp };

  const halfLength = Math.max(Math.abs(minAlong), Math.abs(maxAlong));

  // ── Build curvature profile along the axis ───────────────
  // Each bin covers one pixel along the axis direction.
  const alongMin = minAlong - 2;
  const alongMax = maxAlong + 2;
  const alongRange = alongMax - alongMin;
  const NUM_BINS = Math.max(1, Math.ceil(alongRange));
  const binCurv   = new Float32Array(NUM_BINS);
  const binCounts = new Uint32Array(NUM_BINS);

  for (const p of maskedPts) {
    const along = (p.x - cx) * cosA + (p.y - cy) * sinA;
    const t = (along - alongMin) / alongRange;
    const idx = clamp(Math.floor(t * (NUM_BINS - 1)), 0, NUM_BINS - 1);
    binCurv[idx]   += p.curv;
    binCounts[idx] ++;
  }
  for (let i = 0; i < NUM_BINS; i++) {
    if (binCounts[i] > 0) binCurv[i] /= binCounts[i];
  }

  // Smooth the profile (box blur, radius 4) to prevent seams
  const smoothed = new Float32Array(NUM_BINS);
  const BLUR_R = 4;
  for (let i = 0; i < NUM_BINS; i++) {
    let sum = 0, cnt = 0;
    for (let j = -BLUR_R; j <= BLUR_R; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < NUM_BINS) { sum += binCurv[idx]; cnt++; }
    }
    smoothed[i] = sum / cnt;
  }

  // Weighted-average curvature for debug / radius readout
  let totalCurv = 0;
  for (const p of maskedPts) totalCurv += p.curv;
  const avgCurv = totalCurv / maskedPts.length;
  const avgCurvPct = Math.round(avgCurv * 100);
  const effAvg = Math.min(1.5, avgCurv * UNWRAP_AGGRESSION);
  const avgRadius = (perpWidth / 2) / Math.max(0.1, effAvg);

  console.log(
    '[tattoo-stencil] CurveMask unwrap: center=(%.1f,%.1f) angle=%d° perpW=%.1f avgCurv=%d%% eff=%d%% avgR=%.1f px=%d bins=%d',
    cx, cy, curveHighlight.angleDeg, perpWidth, avgCurvPct,
    Math.round(effAvg * 100), avgRadius, maskedPts.length, NUM_BINS,
  );

  const debug: UnwrapDebugInfo = {
    applied: true, source: 'curve-mask',
    centerX: cx, centerY: cy, radius: avgRadius, angle, imageW: W, imageH: H,
    halfLength,
    curvaturePercent: avgCurvPct,
  };

  const buf = await applyCylindricalUnwrapVariable(
    imgBuf, W, H, cx, cy, angle, perpWidth, smoothed, alongMin, alongRange,
  );
  return { buf, debug };
}

/**
 * Polygon outline → cylinder geometry via PCA.
 */
async function cylindricalUnwrapFromOutline(
  imgBuf: Buffer,
  W: number, H: number,
  outline: LimbOutline,
  curvK: number,
): Promise<UnwrapResult> {
  const noOp: UnwrapDebugInfo = { applied: false, source: 'outline' };
  const pts = outline.points;
  if (pts.length < 3) return { buf: imgBuf, debug: noOp };

  // Convert normalised → pixel coords
  const px = pts.map(p => ({ x: p.x * W, y: p.y * H }));

  // ── Area centroid (not vertex centroid) ──────────────────
  // Shoelace formula: immune to uneven vertex placement
  let signedArea2 = 0, areaCx = 0, areaCy = 0;
  for (let i = 0; i < px.length; i++) {
    const j = (i + 1) % px.length;
    const cross = px[i].x * px[j].y - px[j].x * px[i].y;
    signedArea2 += cross;
    areaCx += (px[i].x + px[j].x) * cross;
    areaCy += (px[i].y + px[j].y) * cross;
  }
  const area6 = 3 * signedArea2;          // 6A
  // Fall back to vertex average if polygon is degenerate (zero area)
  const cx = Math.abs(area6) > 1e-6
    ? areaCx / area6
    : px.reduce((s, p) => s + p.x, 0) / px.length;
  const cy = Math.abs(area6) > 1e-6
    ? areaCy / area6
    : px.reduce((s, p) => s + p.y, 0) / px.length;

  // ── Uniform edge sampling for PCA ──────────────────────
  // Interpolate points along each edge so vertex density
  // doesn't bias the principal axis
  const edgeSamples: { x: number; y: number }[] = [];
  const SAMPLES_PER_EDGE = 8;
  for (let i = 0; i < px.length; i++) {
    const j = (i + 1) % px.length;
    for (let s = 0; s < SAMPLES_PER_EDGE; s++) {
      const t = s / SAMPLES_PER_EDGE;
      edgeSamples.push({
        x: px[i].x + (px[j].x - px[i].x) * t,
        y: px[i].y + (px[j].y - px[i].y) * t,
      });
    }
  }

  // PCA: covariance matrix from uniform edge samples
  // Run in ISOTROPIC space (scale to square) so non-square images
  // don't distort the visual angle. Use max(W,H) as common scale.
  const maxDim = Math.max(W, H);
  const isoX = maxDim / W;   // >1 if image is taller than wide
  const isoY = maxDim / H;   // >1 if image is wider than tall
  let cxx = 0, cxy = 0, cyy = 0;
  for (const p of edgeSamples) {
    const dx = (p.x - cx) * isoX, dy = (p.y - cy) * isoY;
    cxx += dx * dx; cxy += dx * dy; cyy += dy * dy;
  }

  // Major axis angle (in isotropic/visual space)
  const isoAngle = 0.5 * Math.atan2(2 * cxy, cxx - cyy);

  // Convert iso angle back to pixel-space angle for the unwrap transform.
  // In pixel space, the axis direction vector is (cos(isoAngle)/isoX, sin(isoAngle)/isoY).
  const axisDx = Math.cos(isoAngle) / isoX;
  const axisDy = Math.sin(isoAngle) / isoY;
  const angle = Math.atan2(axisDy, axisDx);
  const cosA = Math.cos(angle), sinA = Math.sin(angle);

  // Width perpendicular to axis + extent along axis (in pixel space)
  let minAcross = Infinity, maxAcross = -Infinity;
  let minAlong = Infinity, maxAlong = -Infinity;
  for (const p of px) {
    const along  =  (p.x - cx) * cosA + (p.y - cy) * sinA;
    const across = -(p.x - cx) * sinA + (p.y - cy) * cosA;
    minAcross = Math.min(minAcross, across);
    maxAcross = Math.max(maxAcross, across);
    minAlong  = Math.min(minAlong, along);
    maxAlong  = Math.max(maxAlong, along);
  }
  const radius = ((maxAcross - minAcross) / 2) * curvK;
  if (radius < 15) return { buf: imgBuf, debug: noOp };

  // Half-length along the cylinder axis (for debug grid extent)
  const halfLength = Math.max(Math.abs(minAlong), Math.abs(maxAlong));

  console.log('[tattoo-stencil] Outline PCA: center=(%.1f,%.1f) isoAngle=%.1f° pixAngle=%.1f° radius=%.1f halfLen=%.1f W=%d H=%d',
    cx, cy, isoAngle * 180 / Math.PI, angle * 180 / Math.PI, radius, halfLength, W, H);

  const debug: UnwrapDebugInfo = {
    applied: true, source: 'outline',
    centerX: cx, centerY: cy, radius, angle, imageW: W, imageH: H,
    halfLength,
    outlinePoints: outline.points, // normalised 0-1 for debug overlay
  };
  const buf = await applyCylindricalUnwrap(imgBuf, W, H, cx, cy, angle, radius);
  return { buf, debug };
}

/**
 * AI-detected landmarks → cylinder geometry (fallback).
 */
async function cylindricalUnwrapFromLandmarks(
  imgBuf: Buffer,
  W: number, H: number,
  limb: LimbRegion,
  origW: number, origH: number,
  cropX: number, cropY: number,
  cropW: number, cropH: number,
  curvK: number,
): Promise<UnwrapResult> {
  const noOp: UnwrapDebugInfo = { applied: false, source: 'landmarks' };
  const vis = limb.landmarks.filter((l) => l.visibility > 0.6);
  if (vis.length < 3) return { buf: imgBuf, debug: noOp };

  const sx = W / cropW;
  const sy = H / cropH;
  const toLocal = (lm: Landmark) => ({
    x: (lm.x * origW - cropX) * sx,
    y: (lm.y * origH - cropY) * sy,
  });

  const first = toLocal(vis[0]);
  const last  = toLocal(vis[vis.length - 1]);

  if (first.x < -W * 0.2 || first.x > W * 1.2 ||
      first.y < -H * 0.2 || first.y > H * 1.2 ||
      last.x < -W * 0.2 || last.x > W * 1.2 ||
      last.y < -H * 0.2 || last.y > H * 1.2) {
    return { buf: imgBuf, debug: noOp };
  }

  const midX = (first.x + last.x) / 2;
  const midY = (first.y + last.y) / 2;
  const angle = Math.atan2(last.y - first.y, last.x - first.x);
  const radius = ((limb.boundingBox.width * sx) / 2) * curvK;

  if (radius < 30 || radius > Math.min(W, H) * 0.5) return { buf: imgBuf, debug: noOp };

  const debug: UnwrapDebugInfo = {
    applied: true, source: 'landmarks',
    centerX: midX, centerY: midY, radius, angle, imageW: W, imageH: H,
  };
  const buf = await applyCylindricalUnwrap(imgBuf, W, H, midX, midY, angle, radius);
  return { buf, debug };
}

/**
 * Core cylindrical unwrap — inverse cylindrical projection.
 * Works on a single-channel grayscale buffer (the ink score map).
 * Used by the polygon-outline and AI-landmarks paths (single uniform radius).
 *
 * Includes edge-fade to prevent dark-spot artifacts at the cylinder boundary.
 */
async function applyCylindricalUnwrap(
  imgBuf: Buffer,
  W: number, H: number,
  midX: number, midY: number,
  angle: number, radius: number,
): Promise<Buffer> {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const stretchRatio = Math.PI / 2;
  const extraPerp = (stretchRatio - 1) * radius;

  const padX = Math.ceil(Math.abs(sinA) * extraPerp);
  const padY = Math.ceil(Math.abs(cosA) * extraPerp);
  const outW = W + padX * 2;
  const outH = H + padY * 2;

  const outMidX = midX + padX;
  const outMidY = midY + padY;

  const maxArc = (Math.PI / 2) * radius;
  const thetaLimit = Math.PI / 2;

  const raw = await sharp(imgBuf).grayscale().raw().toBuffer();
  const out = Buffer.alloc(outW * outH, 0);

  for (let py = 0; py < outH; py++) {
    for (let px = 0; px < outW; px++) {
      const dx = px - outMidX;
      const dy = py - outMidY;
      const along  =  dx * cosA + dy * sinA;
      const across = -dx * sinA + dy * cosA;

      if (Math.abs(across) > maxArc) continue;

      const theta = across / radius;
      const absTheta = Math.abs(theta);

      // Cosine edge-fade: smooth roll-off from EDGE_FADE_START to ±90°
      let fade = 1;
      if (absTheta > EDGE_FADE_START) {
        const t = (absTheta - EDGE_FADE_START) / (thetaLimit - EDGE_FADE_START);
        fade = 0.5 * (1 + Math.cos(Math.PI * Math.min(t, 1)));
        if (fade <= 0.001) continue;
      }

      const inputAcross = radius * Math.sin(theta);
      const srcX = midX + along * cosA - inputAcross * sinA;
      const srcY = midY + along * sinA + inputAcross * cosA;

      // Clamp-sample at boundaries instead of skipping (prevents black edge pixels)
      const cX = Math.max(0, Math.min(W - 1.001, srcX));
      const cY = Math.max(0, Math.min(H - 1.001, srcY));
      const ix = Math.floor(cX);
      const iy = Math.floor(cY);
      const fx = cX - ix;
      const fy = cY - iy;
      const ix1 = Math.min(ix + 1, W - 1);
      const iy1 = Math.min(iy + 1, H - 1);
      const v =
        raw[iy  * W + ix]  * (1 - fx) * (1 - fy) +
        raw[iy  * W + ix1] * fx       * (1 - fy) +
        raw[iy1 * W + ix]  * (1 - fx) * fy +
        raw[iy1 * W + ix1] * fx       * fy;

      // If the source was far out of bounds, apply extra fade to avoid border artifacts
      let boundaryFade = 1;
      const oobX = Math.max(0, -srcX, srcX - (W - 1));
      const oobY = Math.max(0, -srcY, srcY - (H - 1));
      const oob = Math.max(oobX, oobY);
      if (oob > 0) boundaryFade = Math.max(0, 1 - oob / 8);

      out[py * outW + px] = Math.round(v * fade * boundaryFade);
    }
  }

  console.log(
    '[tattoo-stencil] Unwrap canvas: %dx%d → %dx%d (pad %d,%d, stretch %.2fx)',
    W, H, outW, outH, padX, padY, stretchRatio,
  );

  return sharp(out, { raw: { width: outW, height: outH, channels: 1 } })
    .png()
    .toBuffer();
}

/**
 * Variable-radius cylindrical unwrap driven by a per-cross-section
 * curvature profile.  Each bin of the profile gives the average curvature
 * for that position along the axis.  Where curvature is 0 (no brush
 * strokes), pixels pass through unchanged.  Where curvature > 0 the
 * inverse cylindrical mapping is applied with a local radius derived
 * from `(perpWidth/2) / (curvature * UNWRAP_AGGRESSION)`.
 */
async function applyCylindricalUnwrapVariable(
  imgBuf: Buffer,
  W: number, H: number,
  midX: number, midY: number,
  angle: number,
  perpWidth: number,
  curvProfile: Float32Array,
  alongMin: number,
  alongRange: number,
): Promise<Buffer> {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const numBins = curvProfile.length;
  const thetaLimit = Math.PI / 2;

  // Find max curvature for canvas sizing
  let maxCurv = 0;
  for (let i = 0; i < numBins; i++) {
    if (curvProfile[i] > maxCurv) maxCurv = curvProfile[i];
  }

  const effMax = Math.min(1.5, maxCurv * UNWRAP_AGGRESSION);
  const minRadius = (perpWidth / 2) / Math.max(0.1, effMax);
  const maxArc = thetaLimit * minRadius;
  const maxExpansion = Math.max(0, maxArc - perpWidth / 2);

  const padX = Math.ceil(Math.abs(sinA) * maxExpansion) + 2;
  const padY = Math.ceil(Math.abs(cosA) * maxExpansion) + 2;
  const outW = W + padX * 2;
  const outH = H + padY * 2;

  const outMidX = midX + padX;
  const outMidY = midY + padY;

  const raw = await sharp(imgBuf).grayscale().raw().toBuffer();
  const out = Buffer.alloc(outW * outH, 0);

  for (let py = 0; py < outH; py++) {
    for (let px = 0; px < outW; px++) {
      const dx = px - outMidX;
      const dy = py - outMidY;
      const along  =  dx * cosA + dy * sinA;
      const across = -dx * sinA + dy * cosA;

      // Interpolate curvature from the profile
      const t = (along - alongMin) / alongRange;
      const binF = t * (numBins - 1);
      const lo = clamp(Math.floor(binF), 0, numBins - 1);
      const hi = Math.min(lo + 1, numBins - 1);
      const frac = binF - lo;
      const localRaw = curvProfile[lo] * (1 - frac) + curvProfile[hi] * frac;
      const localCurv = Math.min(1.5, localRaw * UNWRAP_AGGRESSION);

      let srcX: number, srcY: number;
      let fade = 1;

      if (localCurv < 0.005) {
        // No curvature — pass through to the corresponding input pixel
        srcX = px - padX;
        srcY = py - padY;
      } else {
        const localRadius = (perpWidth / 2) / localCurv;
        const localMaxArc = thetaLimit * localRadius;
        if (Math.abs(across) > localMaxArc) continue;

        const theta = across / localRadius;
        const absTheta = Math.abs(theta);

        // Cosine edge-fade: smooth roll-off from EDGE_FADE_START to ±90°
        if (absTheta > EDGE_FADE_START) {
          const et = (absTheta - EDGE_FADE_START) / (thetaLimit - EDGE_FADE_START);
          fade = 0.5 * (1 + Math.cos(Math.PI * Math.min(et, 1)));
          if (fade <= 0.001) continue;
        }

        const inputAcross = localRadius * Math.sin(theta);
        srcX = midX + along * cosA - inputAcross * sinA;
        srcY = midY + along * sinA + inputAcross * cosA;
      }

      // Clamp-sample at boundaries instead of skipping (prevents black edge pixels)
      const cX = Math.max(0, Math.min(W - 1.001, srcX));
      const cY = Math.max(0, Math.min(H - 1.001, srcY));
      const ix = Math.floor(cX);
      const iy = Math.floor(cY);
      const fx = cX - ix;
      const fy = cY - iy;
      const ix1 = Math.min(ix + 1, W - 1);
      const iy1 = Math.min(iy + 1, H - 1);
      const v =
        raw[iy  * W + ix]  * (1 - fx) * (1 - fy) +
        raw[iy  * W + ix1] * fx       * (1 - fy) +
        raw[iy1 * W + ix]  * (1 - fx) * fy +
        raw[iy1 * W + ix1] * fx       * fy;

      // Extra fade when source coordinate was out of bounds (clamped)
      let boundaryFade = 1;
      const oobX = Math.max(0, -srcX, srcX - (W - 1));
      const oobY = Math.max(0, -srcY, srcY - (H - 1));
      const oob = Math.max(oobX, oobY);
      if (oob > 0) boundaryFade = Math.max(0, 1 - oob / 8);

      out[py * outW + px] = Math.round(v * fade * boundaryFade);
    }
  }

  console.log(
    '[tattoo-stencil] Variable unwrap: %dx%d → %dx%d (pad %d,%d, maxCurv=%d%%, bins=%d)',
    W, H, outW, outH, padX, padY, Math.round(maxCurv * 100), numBins,
  );

  return sharp(out, { raw: { width: outW, height: outH, channels: 1 } })
    .png()
    .toBuffer();
}

// ── Potrace SVG vectoriser ───────────────────────────────────

async function traceToSvg(png: Buffer): Promise<string> {
  const potrace = require('potrace'); // eslint-disable-line
  return new Promise<string>((resolve, reject) => {
    potrace.trace(png, {
      threshold: 128,
      turdSize: 15,
      optCurve: true,
      optTolerance: 0.4,
      alphaMax: 1.3,
    }, (err: Error | null, svg: string) => err ? reject(err) : resolve(svg));
  });
}

// ── Helpers ──────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function res(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}
