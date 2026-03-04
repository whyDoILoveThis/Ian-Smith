/* ─────────────────────────────────────────────────────────────
   POST /api/tattoo-stencil   (Pipeline v5)

   Takes a photo of a tattoo on a body part, isolates the ink
   from the skin, and generates a flat, clean, high-contrast
   stencil image (PNG + optional SVG) suitable for transfer.

   Pipeline:
     1. Decode → flatten alpha → optional crop → resize → gray 1-ch
     2. Light denoise (median 3)
     3. Background subtraction (large Gaussian blur = skin estimate)
     4. Manual linear normalize (NOT Sharp's aggressive percentile)
     5. Pre-threshold blur (suppress texture noise)
     6. Threshold to binary → negate (ink = black, paper = white)
     7. Median cleanup + anti-alias
     8. Optional cylindrical unwrap (only with very high confidence)
     9. Optional axis straighten
    10. Output PNG + optional SVG
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// ── Tunables ─────────────────────────────────────────────────

/**
 * Threshold applied AFTER manual linear normalisation (0-255).
 * After linear scale, 255 = absolute darkest pixel in the diff.
 * Most real tattoo ink lands in the 80-200 range after linear scale.
 *
 * "low"  contrast → high threshold → only strongest ink lines
 * "high" contrast → low threshold → captures shading & faint lines
 */
const DIFF_THRESH = { low: 140, medium: 100, high: 65 } as const;

/**
 * Background-estimate blur sigma as a fraction of the shorter
 * image dimension.  Must be much larger than any tattoo stroke
 * so the blur averages completely over the ink lines.
 */
const BG_SIGMA_FRAC = 0.12;

/**
 * Pre-threshold blur sigma as a fraction of the short side.
 * Removes skin texture / sensor noise from the difference image
 * BEFORE the hard threshold, so only real ink edges survive.
 * ~0.3-0.6 % → 3-6 px on a 1024px image.
 */
const PRE_BLUR_FRAC = { low: 0.003, medium: 0.004, high: 0.006 } as const;

/**
 * Final anti-alias sigma (absolute pixels).
 */
const SMOOTH_SIGMA = { thin: 0.5, medium: 0.8, thick: 1.2 } as const;

// ── Types (server-local) ─────────────────────────────────────

interface BBox { x: number; y: number; width: number; height: number }
interface Landmark { x: number; y: number; z: number; visibility: number }
interface LimbRegion {
  boundingBox: BBox;
  angle: number;
  limbType: string;
  confidence: number;
  landmarks: Landmark[];
}
/** User-drawn wrap boundary (normalised 0-1 coords). */
interface WrapBoundary {
  axisStart: { x: number; y: number };
  axisEnd: { x: number; y: number };
  leftEdge: { x: number; y: number };
  rightEdge: { x: number; y: number };
}
interface StencilOptions {
  generateSvg: boolean;
  contrastLevel: 'low' | 'medium' | 'high';
  edgeThickness: 'thin' | 'medium' | 'thick';
  noiseReduction: 'low' | 'medium' | 'high';
  curvatureStrength: number;
}

/** Debug telemetry returned alongside the unwrapped buffer. */
interface UnwrapDebugInfo {
  applied: boolean;
  source: 'boundary' | 'landmarks' | 'none';
  centerX?: number;
  centerY?: number;
  radius?: number;
  angle?: number;
  imageW?: number;
  imageH?: number;
}

/** Return type of the unwrap entry-point functions. */
interface UnwrapResult {
  buf: Buffer;
  debug: UnwrapDebugInfo;
}

// ── Route configuration ──────────────────────────────────────

export const runtime = 'nodejs';
export const maxDuration = 60;

// ── POST handler ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const t0 = Date.now();

  try {
    const body = await request.json();
    const { imageBase64, limbRegion, wrapBoundary, options } = body as {
      imageBase64: string;
      limbRegion?: LimbRegion;
      wrapBoundary?: WrapBoundary;
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

    /* ─────────────────────────────────────────────────────────
       STEP 1 — Flatten alpha · optional crop · resize · gray

       IMPORTANT: when wrapBoundary is provided the user has
       already defined the region of interest via control points
       whose normalised 0-1 coords are relative to the FULL
       image.  Cropping would put W/H into a different coordinate
       space and the boundary math would be wrong.  So we ONLY
       crop when no explicit boundary exists.
       ───────────────────────────────────────────────────────── */
    let cropX = 0, cropY = 0, cropW = origW, cropH = origH;

    const base = () => sharp(srcBuf).flatten({ background: '#ffffff' });
    let chain;

    if (!wrapBoundary && limbRegion?.boundingBox) {
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

    let grayBuf = await chain
      .resize(1536, 1536, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .removeAlpha()
      .toFormat('png')
      .toBuffer();

    const gMeta = await sharp(grayBuf).metadata();
    const W = gMeta.width!;
    const H = gMeta.height!;
    if (gMeta.channels !== 1) {
      grayBuf = await sharp(grayBuf).grayscale().removeAlpha().png().toBuffer();
    }

    /* ─────────────────────────────────────────────────────────
       STEP 2 — Light denoise
       ───────────────────────────────────────────────────────── */
    grayBuf = await sharp(grayBuf).median(3).png().toBuffer();

    /* ─────────────────────────────────────────────────────────
       STEP 2b — Cylindrical surface unwrap (BEFORE stencilize)

       Must happen on the continuous-tone grayscale so the
       geometry warp doesn't interact with binary thresholding.

       PRIORITY: user-drawn wrapBoundary (explicit human input).
       FALLBACK: auto-detected limbRegion (only at high confidence).
       ───────────────────────────────────────────────────────── */
    const curvK = typeof options.curvatureStrength === 'number'
      ? Math.max(0.25, Math.min(3.0, options.curvatureStrength))
      : 1.0;

    let unwrapDebug: UnwrapDebugInfo = { applied: false, source: 'none' };

    if (wrapBoundary) {
      const ur = await cylindricalUnwrapFromBoundary(
        grayBuf, W, H, wrapBoundary, curvK,
      );
      if (ur.debug.applied) grayBuf = ur.buf;
      unwrapDebug = ur.debug;
    } else if (limbRegion && limbRegion.confidence > 0.85) {
      const ur = await cylindricalUnwrapFromLandmarks(
        grayBuf, W, H, limbRegion,
        origW, origH, cropX, cropY, cropW, cropH, curvK,
      );
      if (ur.buf !== grayBuf) {
        grayBuf = ur.buf;
        unwrapDebug = ur.debug;
      }
    }

    /* ─────────────────────────────────────────────────────────
       STEP 3 — Background subtraction

       A very-large-sigma Gaussian blur estimates the local skin
       tone at every pixel.  Subtracting the original from it
       isolates anything darker than the surrounding area (= ink).

       difference = blurred − original   (≥ 0 everywhere)

       Now operates on the (possibly unwrapped) grayscale, so
       the stencilization runs exactly once.
       ───────────────────────────────────────────────────────── */
    const shortSide = Math.min(W, H);
    const bgSigma = Math.max(10, Math.round(shortSide * BG_SIGMA_FRAC));

    const bgRaw = await sharp(grayBuf).blur(bgSigma).raw().toBuffer();
    const fgRaw = await sharp(grayBuf).raw().toBuffer();

    const diffBuf = Buffer.alloc(W * H);
    let maxDiff = 0;
    for (let i = 0; i < W * H; i++) {
      const d = clamp(bgRaw[i] - fgRaw[i], 0, 255);
      diffBuf[i] = d;
      if (d > maxDiff) maxDiff = d;
    }

    if (maxDiff < 8) {
      return res({
        success: false,
        error: 'No tattoo detected — the image may lack contrast or the tattoo is too faint.',
      }, 422);
    }

    /* ─────────────────────────────────────────────────────────
       STEP 4 — Manual linear normalize

       Scale the difference linearly so the darkest ink pixel
       maps to 255.  This is MUCH gentler than Sharp's
       .normalize() which does percentile clipping and can
       amplify skin texture noise into full-range garbage.
       ───────────────────────────────────────────────────────── */
    const scale = 255 / maxDiff;
    const normBuf = Buffer.alloc(W * H);
    for (let i = 0; i < W * H; i++) {
      normBuf[i] = clamp(Math.round(diffBuf[i] * scale), 0, 255);
    }

    /* ─────────────────────────────────────────────────────────
       STEP 5 — Pre-threshold blur (suppress skin texture)

       A moderate Gaussian blur on the normalised difference
       image smooths out pores, hair, and JPEG artefacts so
       the threshold produces clean ink outlines instead of
       capturing every skin texture detail.
       ───────────────────────────────────────────────────────── */
    const preBlurSigma = Math.max(1.0, shortSide * PRE_BLUR_FRAC[options.noiseReduction]);

    let diffImg = await sharp(normBuf, { raw: { width: W, height: H, channels: 1 } })
      .blur(preBlurSigma + 0.1)
      .png()
      .toBuffer();

    /* ─────────────────────────────────────────────────────────
       STEP 6 — Threshold → binary stencil

       After linear normalise, 255 = darkest ink.
       threshold(T) → pixels ≥ T become white, < T become black.
       Negate so ink = black on white paper.
       ───────────────────────────────────────────────────────── */
    const threshVal = DIFF_THRESH[options.contrastLevel];
    let stencilBuf = await sharp(diffImg)
      .threshold(threshVal)
      .negate({ alpha: false })
      .png()
      .toBuffer();

    /* ─────────────────────────────────────────────────────────
       STEP 7 — Cleanup: median + anti-alias
       ───────────────────────────────────────────────────────── */
    // Remove isolated speck pixels
    stencilBuf = await sharp(stencilBuf).median(3).png().toBuffer();

    // Anti-alias jagged edges
    const smoothSigma = SMOOTH_SIGMA[options.edgeThickness];
    stencilBuf = await sharp(stencilBuf)
      .blur(smoothSigma + 0.1)
      .threshold(128)
      .png()
      .toBuffer();

    /* ─────────────────────────────────────────────────────────
       STEP 9 — Straighten limb axis
       ───────────────────────────────────────────────────────── */
    if (limbRegion?.angle && Math.abs(limbRegion.angle) > 5) {
      stencilBuf = await sharp(stencilBuf)
        .rotate(-limbRegion.angle, { background: '#ffffff' })
        .png()
        .toBuffer();
    }

    /* ─────────────────────────────────────────────────────────
       STEP 10 — Final output
       ───────────────────────────────────────────────────────── */
    const pngBuf = await sharp(stencilBuf).png({ compressionLevel: 6 }).toBuffer();
    const sMeta  = await sharp(pngBuf).metadata();
    const pngBase64 = pngBuf.toString('base64');

    // Pre-stencil grayscale for client-side before/after comparison.
    // grayBuf is already the (possibly unwrapped) denoised grayscale.
    const preStencilBase64 = (await sharp(grayBuf)
      .png({ compressionLevel: 8 })
      .toBuffer()).toString('base64');

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
//  Cylindrical surface unwrapping — TWO entry points:
//
//  A) cylindricalUnwrapFromBoundary  (human-defined geometry)
//  B) cylindricalUnwrapFromLandmarks (AI-detected, fallback)
//
//  Both compute the same pure-math inverse cylindrical projection.
//  The only difference is *where the cylinder parameters come from*.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * (A) User-drawn boundary → cylinder geometry.
 *
 * axisStart/axisEnd define the cylinder's centreline.
 * leftEdge/rightEdge define the visible radius.
 * All inputs are normalised 0-1 → we convert to pixel coords at W×H.
 */
async function cylindricalUnwrapFromBoundary(
  imgBuf: Buffer,
  W: number, H: number,
  boundary: WrapBoundary,
  curvK: number,
): Promise<UnwrapResult> {
  const noOp: UnwrapDebugInfo = { applied: false, source: 'boundary' };

  // Convert normalised 0-1 → pixel coords
  const axS = { x: boundary.axisStart.x * W, y: boundary.axisStart.y * H };
  const axE = { x: boundary.axisEnd.x * W,   y: boundary.axisEnd.y * H };
  const lE  = { x: boundary.leftEdge.x * W,  y: boundary.leftEdge.y * H };
  const rE  = { x: boundary.rightEdge.x * W, y: boundary.rightEdge.y * H };

  const midX = (axS.x + axE.x) / 2;
  const midY = (axS.y + axE.y) / 2;
  const angle = Math.atan2(axE.y - axS.y, axE.x - axS.x);

  // Radius = half the perpendicular distance between left & right edges
  // projected onto the axis-perpendicular direction.
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const lAcross = -(lE.x - midX) * sinA + (lE.y - midY) * cosA;
  const rAcross = -(rE.x - midX) * sinA + (rE.y - midY) * cosA;
  const diameter = Math.abs(rAcross - lAcross);
  const radius = (diameter / 2) * curvK;

  if (radius < 15) return { buf: imgBuf, debug: noOp }; // too small, skip

  const debug: UnwrapDebugInfo = {
    applied: true, source: 'boundary',
    centerX: midX, centerY: midY, radius, angle, imageW: W, imageH: H,
  };
  const buf = await applyCylindricalUnwrap(imgBuf, W, H, midX, midY, angle, radius);
  return { buf, debug };
}

/**
 * (B) AI-detected landmarks → cylinder geometry (fallback).
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
 * Core cylindrical unwrap — pure math, no AI.
 *
 * For each output pixel, compute where it maps on the curved
 * cylinder surface and bilinear-sample the source image.
 *
 *   θ = across / R         (arc-length to angle on the cylinder)
 *   inputAcross = R·sin(θ) (projected position in the flat camera view)
 *
 * This stretches the edges of the limb outward, correcting
 * foreshortening from the curved surface.
 */
async function applyCylindricalUnwrap(
  imgBuf: Buffer,
  W: number, H: number,
  midX: number, midY: number,
  angle: number, radius: number,
): Promise<Buffer> {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const maxArc = (Math.PI / 2) * radius;

  const raw = await sharp(imgBuf).removeAlpha().raw().toBuffer();
  const out = Buffer.alloc(W * H, 255);

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const dx = px - midX;
      const dy = py - midY;

      const along  =  dx * cosA + dy * sinA;
      const across = -dx * sinA + dy * cosA;

      if (Math.abs(across) > maxArc) continue;

      const theta = across / radius;
      const inputAcross = radius * Math.sin(theta);

      const srcX = midX + along * cosA - inputAcross * sinA;
      const srcY = midY + along * sinA + inputAcross * cosA;

      const ix = Math.floor(srcX);
      const iy = Math.floor(srcY);
      if (ix < 0 || ix >= W - 1 || iy < 0 || iy >= H - 1) continue;

      const fx = srcX - ix;
      const fy = srcY - iy;
      const i = iy * W + ix;
      const v =
        raw[i]         * (1 - fx) * (1 - fy) +
        raw[i + 1]     * fx       * (1 - fy) +
        raw[i + W]     * (1 - fx) * fy +
        raw[i + W + 1] * fx       * fy;

      out[py * W + px] = Math.round(v);
    }
  }

  return sharp(out, { raw: { width: W, height: H, channels: 1 } })
    .png()
    .toBuffer();
}

// ── Potrace SVG vectoriser ───────────────────────────────────

async function traceToSvg(png: Buffer): Promise<string> {
  const potrace = require('potrace'); // eslint-disable-line
  return new Promise<string>((resolve, reject) => {
    potrace.trace(png, {
      threshold: 128,
      turdSize: 15,        // suppress small speckles
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
