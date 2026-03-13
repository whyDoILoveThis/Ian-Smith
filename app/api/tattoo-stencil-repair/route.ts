/* ─────────────────────────────────────────────────────────────
   POST /api/tattoo-stencil-repair

   Two modes:
     • analyze  – Sends the stencil to Groq Vision to auto-detect
                   which side has clean lines vs artifacts.
     • repair   – Takes a user-painted reference mask (good area),
                   mirrors it across the auto-detected axis, and
                   blends the result into the damaged side.
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';

function res(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

// ── Entry point ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, stencilBase64, referenceMaskBase64 } = body ?? {};

    if (!stencilBase64 || typeof stencilBase64 !== 'string') {
      return res({ success: false, error: 'Missing stencilBase64' }, 400);
    }

    if (mode === 'analyze') return analyzeStencil(stencilBase64);
    if (mode === 'repair')  return repairStencil(stencilBase64, referenceMaskBase64);

    return res({ success: false, error: 'Invalid mode — use "analyze" or "repair"' }, 400);
  } catch (err) {
    console.error('[stencil-repair] Unexpected error:', err);
    return res({ success: false, error: 'Internal server error' }, 500);
  }
}

// ── AI Analysis (Groq Vision) ────────────────────────────────

async function analyzeStencil(stencilBase64: string) {
  if (!GROQ_API_KEY) {
    return res({ success: false, error: 'AI service not configured (missing GROQ_API_KEY)' });
  }

  // Down-scale for faster upload to Groq (max 512 px on longest side)
  const thumbBuf = await sharp(Buffer.from(stencilBase64, 'base64'))
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const thumbB64 = thumbBuf.toString('base64');

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  'This is a black-and-white tattoo stencil image that was generated from a photo using cylindrical surface unwrapping.',
                  'Due to the unwrap, one side often has clean sharp lines while the opposite side has artifacts such as dark blobs, cut-off lines, or distorted/smeared edges.',
                  'Examine the image carefully. Which side has the CLEANEST, most intact line-work?',
                  'Respond with ONLY a JSON object, no other text:',
                  '{"goodSide":"left"|"right"|"top"|"bottom","confidence":0.0-1.0}',
                ].join(' '),
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${thumbB64}` },
              },
            ],
          },
        ],
        max_tokens: 80,
        temperature: 0.1,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => 'unknown');
      console.error('[stencil-repair] Groq error:', groqRes.status, errText);
      return res({ success: false, error: 'AI service returned an error' });
    }

    const data = await groqRes.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';

    // Extract JSON from possibly wrapped response
    const jsonMatch = content.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const side = ['left', 'right', 'top', 'bottom'].includes(parsed.goodSide)
        ? parsed.goodSide
        : 'left';
      const confidence = typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;

      console.log('[stencil-repair] AI analysis: goodSide=%s confidence=%.2f', side, confidence);
      return res({ success: true, analysis: { goodSide: side, confidence } });
    }

    console.warn('[stencil-repair] AI gave unparseable response:', content);
    return res({ success: false, error: 'AI returned an unexpected format — try painting manually' });
  } catch (err) {
    console.error('[stencil-repair] AI analysis failed:', err);
    return res({ success: false, error: 'AI analysis failed — try painting manually' });
  }
}

// ── Mirror + Blend Repair ────────────────────────────────────

async function repairStencil(stencilBase64: string, maskBase64?: string) {
  if (!maskBase64) {
    return res({ success: false, error: 'Missing referenceMaskBase64' }, 400);
  }

  const stencilBuf = Buffer.from(stencilBase64, 'base64');
  const maskBuf    = Buffer.from(maskBase64, 'base64');

  // Decode stencil
  const { data: stencilRaw, info: sInfo } = await sharp(stencilBuf)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = sInfo.width;
  const H = sInfo.height;

  // Decode & resize mask to match the stencil
  const maskRaw = await sharp(maskBuf)
    .resize(W, H, { fit: 'fill' })
    .grayscale()
    .removeAlpha()
    .raw()
    .toBuffer();

  // ── Find centroid of the reference (good) region ──────────
  let cx = 0, cy = 0, count = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (maskRaw[y * W + x] > 128) {
        cx += x;
        cy += y;
        count++;
      }
    }
  }

  if (count < 100) {
    return res({ success: false, error: 'Reference area too small — paint a larger region' }, 400);
  }

  cx /= count;
  cy /= count;

  // ── Determine mirror axis (vertical or horizontal) ────────
  const offX = Math.abs(cx - W / 2);
  const offY = Math.abs(cy - H / 2);
  const useVertical = offX >= offY;

  console.log(
    '[stencil-repair] centroid=(%.0f,%.0f) off=(%.0f,%.0f) axis=%s refPx=%d dim=%dx%d',
    cx, cy, offX, offY, useVertical ? 'V' : 'H', count, W, H,
  );

  // ── Mirror-guided repair ────────────────────────────────────
  // Instead of wholesale replacing the damaged side with a mirror,
  // compare each pixel to its mirror counterpart. Only intervene
  // where the pixel looks like an unwrap artifact (much darker
  // than its mirror suggests it should be). Gradually blend based
  // on distance from the reference boundary so the center stays
  // intact and we get a smooth transition.
  const numPx = W * H;
  const out = Buffer.alloc(numPx);
  for (let i = 0; i < numPx; i++) out[i] = stencilRaw[i];

  // Build a distance field from the reference mask boundary.
  // Each non-reference pixel gets its distance to the nearest
  // reference pixel (Manhattan, capped for speed).
  const MAX_DIST = 200;
  const distMap = new Uint16Array(numPx);
  distMap.fill(MAX_DIST);
  // Mark reference pixels as distance 0
  for (let i = 0; i < numPx; i++) {
    if (maskRaw[i] > 128) distMap[i] = 0;
  }
  // Forward pass
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (x > 0) distMap[i] = Math.min(distMap[i], distMap[i - 1] + 1);
      if (y > 0) distMap[i] = Math.min(distMap[i], distMap[i - W] + 1);
    }
  }
  // Backward pass
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      if (x < W - 1) distMap[i] = Math.min(distMap[i], distMap[i + 1] + 1);
      if (y < H - 1) distMap[i] = Math.min(distMap[i], distMap[i + W] + 1);
    }
  }

  // Artifact-darkness threshold: if a pixel is this much darker
  // than the mirror says it should be, it's likely a dark blob.
  const DARK_THRESHOLD = 60;
  // Repair influence fades over this many pixels from the ref boundary.
  const FADE_DIST = 120;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;

      // Keep reference (good) pixels untouched
      if (maskRaw[i] > 128) continue;

      // Mirror position
      const mx = useVertical ? (W - 1 - x) : x;
      const my = useVertical ? y : (H - 1 - y);
      const mi = my * W + mx;

      // Only repair if the mirror source is inside the reference area
      if (mi < 0 || mi >= numPx || maskRaw[mi] <= 128) continue;

      const orig = stencilRaw[i];
      const mirr = stencilRaw[mi];

      // How much darker is this pixel compared to the mirror?
      // In a B&W stencil: 0 = black (ink), 255 = white (paper).
      // Dark-blob artifacts show up as unexpectedly dark pixels
      // where the mirror side is white/light.
      const darkDiff = mirr - orig; // positive if orig is darker

      if (darkDiff < DARK_THRESHOLD) {
        // Pixel is NOT suspiciously dark — keep the original.
        // This preserves existing good lines on the damaged side.
        continue;
      }

      // Blend strength: strong near the reference boundary, fading to zero far away.
      const dist = distMap[i];
      const blend = dist >= FADE_DIST ? 0 : 1 - dist / FADE_DIST;
      if (blend <= 0) continue;

      // For artifact pixels, push toward the mirror value.
      // Use a weighted blend so it's gradual, not binary.
      out[i] = Math.round(orig + (mirr - orig) * blend);
    }
  }

  // ── Light cleanup: median(3) + re-threshold for clean B&W ─
  const repairedPng = await sharp(
    out,
    { raw: { width: W, height: H, channels: 1 } },
  )
    .median(3)
    .threshold(128)
    .png({ compressionLevel: 6 })
    .toBuffer();

  console.log(
    '[stencil-repair] Repair complete: %dx%d, axis=%s, fadeDist=%dpx',
    W, H, useVertical ? 'vertical' : 'horizontal', FADE_DIST,
  );

  return res({ success: true, repairedBase64: repairedPng.toString('base64') });
}
