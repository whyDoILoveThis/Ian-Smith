/* ─────────────────────────────────────────────────────────────
   Client-side monocular depth estimation

   Combines two strategies:
     1. Landmark-based: uses MediaPipe z-coordinates to seed
        depth at known body points, then interpolated via
        inverse-distance weighting (IDW).
     2. Gradient-based: edge-aware Sobel magnitude gives local
        curvature cues (ridges / valleys). Not true depth but
        a useful proxy for surface bumpiness.

   The two maps are blended into a single "combined" depth map
   that the API can use for depth-aware mesh warping.

   All values are normalised 0-255 (brighter = closer).
   ───────────────────────────────────────────────────────────── */

import type { DepthMapData, PoseLandmark } from '../types';

// ── Public API ───────────────────────────────────────────────

/**
 * Estimate a depth map for the given image.
 * If landmarks are available, uses IDW interpolation of their Z values.
 * Always runs gradient estimation as a secondary signal.
 * Returns a combined depth map.
 */
export async function estimateDepthMap(
  imageFile: File,
  width: number,
  height: number,
  landmarks?: PoseLandmark[] | null,
): Promise<DepthMapData> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Draw the original image at processing size
  const img = await loadImage(imageFile);
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);
  const imageData = ctx.getImageData(0, 0, width, height);

  // Gradient-based depth proxy
  const gradientMap = computeGradientDepth(imageData, width, height);

  if (landmarks && landmarks.length > 5) {
    // Landmark-based depth
    const landmarkMap = computeLandmarkDepth(landmarks, width, height);
    // Blend: 60% landmarks, 40% gradient
    const combined = blendMaps(landmarkMap, gradientMap, 0.6, width, height);
    return {
      mapBase64: mapToBase64(combined, width, height, canvas, ctx),
      width,
      height,
      source: 'combined',
    };
  }

  return {
    mapBase64: mapToBase64(gradientMap, width, height, canvas, ctx),
    width,
    height,
    source: 'gradient',
  };
}

// ── Landmark-based depth (IDW interpolation of Z) ────────────

function computeLandmarkDepth(
  landmarks: PoseLandmark[],
  W: number,
  H: number,
): Uint8Array {
  const map = new Float32Array(W * H);

  // Filter to visible landmarks with meaningful Z
  const seeds = landmarks
    .filter((lm) => lm.visibility > 0.4)
    .map((lm) => ({
      px: lm.x * W,
      py: lm.y * H,
      z: lm.z, // negative = closer to camera in MediaPipe
    }));

  if (seeds.length < 3) {
    // Not enough seeds — return flat mid-gray
    const out = new Uint8Array(W * H);
    out.fill(128);
    return out;
  }

  // Normalise Z values to 0-1 range (inverted: closer = higher value)
  let zMin = Infinity,
    zMax = -Infinity;
  for (const s of seeds) {
    if (s.z < zMin) zMin = s.z;
    if (s.z > zMax) zMax = s.z;
  }
  const zRange = Math.max(0.001, zMax - zMin);
  const normSeeds = seeds.map((s) => ({
    ...s,
    zNorm: 1 - (s.z - zMin) / zRange, // inverted: closer = brighter
  }));

  // IDW interpolation (power=2) for every pixel
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let weightSum = 0;
      let valueSum = 0;
      for (const s of normSeeds) {
        const dx = x - s.px;
        const dy = y - s.py;
        const d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          // Exact landmark position
          map[y * W + x] = s.zNorm;
          weightSum = 1;
          valueSum = s.zNorm;
          break;
        }
        const w = 1 / d2; // power=2
        weightSum += w;
        valueSum += w * s.zNorm;
      }
      if (weightSum > 0) {
        map[y * W + x] = valueSum / weightSum;
      }
    }
  }

  // Convert to Uint8
  const out = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    out[i] = Math.round(map[i] * 255);
  }
  return out;
}

// ── Gradient-based depth proxy (Sobel magnitude) ─────────────

function computeGradientDepth(
  imageData: ImageData,
  W: number,
  H: number,
): Uint8Array {
  const data = imageData.data;
  // Convert to grayscale luminance
  const gray = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Sobel 3x3 kernels
  const gx = new Float32Array(W * H);
  const gy = new Float32Array(W * H);

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const tl = gray[(y - 1) * W + (x - 1)];
      const tc = gray[(y - 1) * W + x];
      const tr = gray[(y - 1) * W + (x + 1)];
      const ml = gray[y * W + (x - 1)];
      const mr = gray[y * W + (x + 1)];
      const bl = gray[(y + 1) * W + (x - 1)];
      const bc = gray[(y + 1) * W + x];
      const br = gray[(y + 1) * W + (x + 1)];

      gx[y * W + x] = -tl - 2 * ml - bl + tr + 2 * mr + br;
      gy[y * W + x] = -tl - 2 * tc - tr + bl + 2 * bc + br;
    }
  }

  // Magnitude
  const mag = new Float32Array(W * H);
  let maxMag = 0;
  for (let i = 0; i < W * H; i++) {
    const m = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]);
    mag[i] = m;
    if (m > maxMag) maxMag = m;
  }

  // Normalise to 0-255, invert (flat areas = bright/close, edges = dark/far)
  const out = new Uint8Array(W * H);
  if (maxMag < 1) {
    out.fill(128);
    return out;
  }
  for (let i = 0; i < W * H; i++) {
    out[i] = Math.round((1 - mag[i] / maxMag) * 255);
  }
  return out;
}

// ── Helpers ──────────────────────────────────────────────────

function blendMaps(
  a: Uint8Array,
  b: Uint8Array,
  wA: number,
  W: number,
  H: number,
): Uint8Array {
  const wB = 1 - wA;
  const out = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    out[i] = Math.round(a[i] * wA + b[i] * wB);
  }
  return out;
}

function mapToBase64(
  map: Uint8Array,
  W: number,
  H: number,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): string {
  canvas.width = W;
  canvas.height = H;
  const out = ctx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    out.data[i * 4] = map[i];
    out.data[i * 4 + 1] = map[i];
    out.data[i * 4 + 2] = map[i];
    out.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL('image/png').split(',')[1];
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}
