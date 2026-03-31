/* ─────────────────────────────────────────────────────────────
   POST /api/unwrap/inpaint

   Fills missing/occluded regions of a flattened tattoo image.

   Primary: sharp-based multi-pass blur inpainting (always works,
   no external API required).

   Body: { imageBase64, maskBase64, styleHint?, strength? }
   Returns: { success, inpaintedBase64, inpaintMaskBase64, fillPercent }
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

function res(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

/**
 * Multi-pass Gaussian blur inpainting via sharp.
 *
 * Strategy:
 * 1. Heavy blur of the full image  → fills gaps with nearby colour
 * 2. Feather the mask edges         → smooth transition zone
 * 3. Composite: original where mask=black, blurred where mask=white
 * 4. Light sharpen pass to restore crispness in filled areas
 */
async function sharpInpaint(
  imgBuf: Buffer,
  maskBuf: Buffer,
  strength: number,
): Promise<{ resultBuf: Buffer; fillPercent: number }> {
  const meta = await sharp(imgBuf).metadata();
  const w = meta.width ?? 512;
  const h = meta.height ?? 512;

  // Ensure consistent size + RGBA
  const img = sharp(imgBuf).resize(w, h).ensureAlpha();
  const raw = await img.raw().toBuffer();

  // Normalise mask to single-channel 0/255, same size
  const maskGray = await sharp(maskBuf)
    .resize(w, h, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();

  // ── Pass 1: heavy Gaussian blur ──
  const sigma1 = Math.max(8, Math.round(Math.min(w, h) * 0.04));
  const blurred1 = await sharp(imgBuf)
    .resize(w, h)
    .ensureAlpha()
    .blur(sigma1)
    .raw()
    .toBuffer();

  // ── Pass 2: medium blur for transition zone ──
  const sigma2 = Math.max(3, Math.round(sigma1 / 3));
  const blurred2 = await sharp(imgBuf)
    .resize(w, h)
    .ensureAlpha()
    .blur(sigma2)
    .raw()
    .toBuffer();

  // ── Feather the mask (blur it) for smooth transitions ──
  const featherSigma = Math.max(2, Math.round(sigma1 / 4));
  const feathered = await sharp(maskBuf)
    .resize(w, h, { fit: "fill" })
    .grayscale()
    .blur(featherSigma)
    .raw()
    .toBuffer();

  // ── Composite using feathered mask ──
  const out = Buffer.alloc(w * h * 4);
  let maskSum = 0;

  for (let i = 0; i < w * h; i++) {
    // feathered alpha: 0 = keep original, 255 = fully fill
    const alpha = (feathered[i] / 255) * strength;
    maskSum += maskGray[i];

    const ri = i * 4;
    for (let c = 0; c < 3; c++) {
      // Blend heavy blur for full-gap centres, medium blur at edges
      const edgeFactor = Math.min(1, alpha * 2); // 0..1
      const blendedFill =
        blurred1[ri + c] * edgeFactor + blurred2[ri + c] * (1 - edgeFactor);
      out[ri + c] = Math.round(raw[ri + c] * (1 - alpha) + blendedFill * alpha);
    }
    out[ri + 3] = 255; // fully opaque
  }

  const fillPercent = Math.round((maskSum / (w * h * 255)) * 10000) / 100;

  // ── Reassemble + light sharpen ──
  const resultBuf = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .sharpen({ sigma: 1.2 })
    .png()
    .toBuffer();

  return { resultBuf, fillPercent };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, maskBase64, strength } = body ?? {};

    if (!imageBase64 || !maskBase64) {
      return res({ success: false, error: "Missing imageBase64 or maskBase64" }, 400);
    }

    const imgBuf = Buffer.from(imageBase64, "base64");
    const maskBuf = Buffer.from(maskBase64, "base64");

    const { resultBuf, fillPercent } = await sharpInpaint(
      imgBuf,
      maskBuf,
      Math.max(0, Math.min(1, strength ?? 0.75)),
    );

    return res({
      success: true,
      inpaintedBase64: resultBuf.toString("base64"),
      inpaintMaskBase64: maskBase64,
      fillPercent,
    });
  } catch (err) {
    console.error("[unwrap/inpaint] Error:", err);
    return res({ success: false, error: "Internal server error" }, 500);
  }
}
