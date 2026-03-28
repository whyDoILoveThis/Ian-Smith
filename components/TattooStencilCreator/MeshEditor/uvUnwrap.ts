/* ─────────────────────────────────────────────────────────────
   MeshEditor – UV unwrap + stencil export
   Implements ARAP (As-Rigid-As-Possible) UV flattening that
   minimises per-triangle distortion, then renders the projected
   tattoo texture into a flat stencil image.
   ───────────────────────────────────────────────────────────── */
import * as THREE from "three";
import type { UnwrapResult, StencilSettings } from "./types";

// ── ARAP UV Parameterisation ─────────────────────────────────

/**
 * Compute ARAP-quality UV coordinates for the deformed mesh.
 *
 * Stage 1: Use the existing UV as an initial guess.
 * Stage 2: For each triangle, compute the best-fit rotation
 *   that maps the 3D triangle to its 2D UV projection.
 * Stage 3: Solve for new 2D positions that minimise the
 *   sum of (rotated 3D edge - 2D edge)² over all edges.
 * Repeat stages 2-3 for `iterations` rounds.
 *
 * This is a simplified ARAP that can run quickly on the main
 * thread for meshes up to ~20k triangles.
 */
function computeARAPUVs(
  geo: THREE.BufferGeometry,
  iterations: number = 8,
): { uvs: Float32Array; avgDistortion: number; maxDistortion: number } {
  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
  const idx = geo.index!;
  const vCount = posAttr.count;
  const triCount = idx.count / 3;

  // Working UV array (2 floats per vertex)
  const uv = new Float32Array(vCount * 2);
  for (let i = 0; i < vCount; i++) {
    uv[i * 2] = uvAttr.getX(i);
    uv[i * 2 + 1] = uvAttr.getY(i);
  }

  // Build per-triangle data: 3D edge vectors, cotangent weights
  const triIndices = new Int32Array(triCount * 3);
  for (let i = 0; i < idx.count; i++) triIndices[i] = idx.getX(i);

  // Edge-pair structures for the global step
  const edges: [number, number, number][] = []; // [v0, v1, triIdx]
  for (let t = 0; t < triCount; t++) {
    const i0 = triIndices[t * 3], i1 = triIndices[t * 3 + 1], i2 = triIndices[t * 3 + 2];
    edges.push([i0, i1, t], [i1, i2, t], [i2, i0, t]);
  }

  // Cotangent weights for each edge
  const cotWeights = new Float32Array(edges.length);
  for (let t = 0; t < triCount; t++) {
    const i0 = triIndices[t * 3], i1 = triIndices[t * 3 + 1], i2 = triIndices[t * 3 + 2];
    const p0 = new THREE.Vector3().fromBufferAttribute(posAttr, i0);
    const p1 = new THREE.Vector3().fromBufferAttribute(posAttr, i1);
    const p2 = new THREE.Vector3().fromBufferAttribute(posAttr, i2);

    // Cotangent opposite each edge
    const e01 = new THREE.Vector3().subVectors(p1, p0);
    const e02 = new THREE.Vector3().subVectors(p2, p0);
    const e12 = new THREE.Vector3().subVectors(p2, p1);

    const cot0 = cotAngle(e01, e02);
    const cot1 = cotAngle(e01.clone().negate(), e12);
    const cot2 = cotAngle(e02.clone().negate(), e12.clone().negate());

    cotWeights[t * 3] = Math.max(cot2, 0.01);   // edge 0-1, opposite 2
    cotWeights[t * 3 + 1] = Math.max(cot0, 0.01); // edge 1-2, opposite 0
    cotWeights[t * 3 + 2] = Math.max(cot1, 0.01); // edge 2-0, opposite 1
  }

  // Pre-compute 3D edge vectors per triangle
  const edges3D: Float32Array[] = [];
  for (let t = 0; t < triCount; t++) {
    const i0 = triIndices[t * 3], i1 = triIndices[t * 3 + 1], i2 = triIndices[t * 3 + 2];
    const arr = new Float32Array(6);
    arr[0] = posAttr.getX(i1) - posAttr.getX(i0);
    arr[1] = posAttr.getY(i1) - posAttr.getY(i0);
    arr[2] = posAttr.getX(i2) - posAttr.getX(i1);
    arr[3] = posAttr.getY(i2) - posAttr.getY(i1);
    arr[4] = posAttr.getX(i0) - posAttr.getX(i2);
    arr[5] = posAttr.getY(i0) - posAttr.getY(i2);
    edges3D.push(arr);
  }

  // ARAP iteration
  const rotations = new Float32Array(triCount * 4); // [cos, sin, cos, sin] per tri (2x2 rotation flattened)

  for (let iter = 0; iter < iterations; iter++) {
    // ── Local step: fit rotation per triangle ──
    for (let t = 0; t < triCount; t++) {
      const i0 = triIndices[t * 3], i1 = triIndices[t * 3 + 1], i2 = triIndices[t * 3 + 2];
      // Current UV edges
      const ue01x = uv[i1 * 2] - uv[i0 * 2], ue01y = uv[i1 * 2 + 1] - uv[i0 * 2 + 1];
      const ue12x = uv[i2 * 2] - uv[i1 * 2], ue12y = uv[i2 * 2 + 1] - uv[i1 * 2 + 1];
      const ue20x = uv[i0 * 2] - uv[i2 * 2], ue20y = uv[i0 * 2 + 1] - uv[i2 * 2 + 1];

      // SVD-free closest rotation: accumulate covariance S = Σ wᵢ pᵢ qᵢᵀ
      const e3 = edges3D[t];
      let s00 = 0, s01 = 0, s10 = 0, s11 = 0;
      const w0 = cotWeights[t * 3], w1 = cotWeights[t * 3 + 1], w2 = cotWeights[t * 3 + 2];

      s00 += w0 * e3[0] * ue01x; s01 += w0 * e3[0] * ue01y;
      s10 += w0 * e3[1] * ue01x; s11 += w0 * e3[1] * ue01y;

      s00 += w1 * e3[2] * ue12x; s01 += w1 * e3[2] * ue12y;
      s10 += w1 * e3[3] * ue12x; s11 += w1 * e3[3] * ue12y;

      s00 += w2 * e3[4] * ue20x; s01 += w2 * e3[4] * ue20y;
      s10 += w2 * e3[5] * ue20x; s11 += w2 * e3[5] * ue20y;

      // Extract rotation from 2x2 SVD: R = V Uᵀ simplified
      // For 2D the rotation angle = atan2(s10 - s01, s00 + s11)
      const angle = Math.atan2(s10 - s01, s00 + s11);
      rotations[t * 4] = Math.cos(angle);
      rotations[t * 4 + 1] = Math.sin(angle);
    }

    // ── Global step: solve for UV positions ──
    // Use weighted Jacobi iteration (avoid building full sparse matrix)
    const newUv = new Float32Array(uv);
    const wSum = new Float32Array(vCount);

    // Reset accumulators
    const accX = new Float32Array(vCount);
    const accY = new Float32Array(vCount);

    for (let e = 0; e < edges.length; e++) {
      const [vi, vj, t] = edges[e];
      const w = cotWeights[e];
      const cosR = rotations[t * 4], sinR = rotations[t * 4 + 1];

      // 3D edge rotated to 2D target
      const eidx = e % 3;
      const ex3 = edges3D[t][eidx * 2], ey3 = edges3D[t][eidx * 2 + 1];
      const rx = cosR * ex3 - sinR * ey3;
      const ry = sinR * ex3 + cosR * ey3;

      accX[vi] += w * (uv[vj * 2] - rx);
      accY[vi] += w * (uv[vj * 2 + 1] - ry);
      accX[vj] += w * (uv[vi * 2] + rx);
      accY[vj] += w * (uv[vi * 2 + 1] + ry);

      wSum[vi] += w;
      wSum[vj] += w;
    }

    // Update positions (skip first vertex to pin the parameterisation)
    for (let i = 1; i < vCount; i++) {
      if (wSum[i] > 1e-10) {
        newUv[i * 2] = accX[i] / wSum[i];
        newUv[i * 2 + 1] = accY[i] / wSum[i];
      }
    }
    uv.set(newUv);
  }

  // Normalise UVs to 0..1
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (let i = 0; i < vCount; i++) {
    minU = Math.min(minU, uv[i * 2]);
    maxU = Math.max(maxU, uv[i * 2]);
    minV = Math.min(minV, uv[i * 2 + 1]);
    maxV = Math.max(maxV, uv[i * 2 + 1]);
  }
  const rangeU = maxU - minU || 1;
  const rangeV = maxV - minV || 1;
  const scale = Math.max(rangeU, rangeV);
  for (let i = 0; i < vCount; i++) {
    uv[i * 2] = (uv[i * 2] - minU) / scale;
    uv[i * 2 + 1] = (uv[i * 2 + 1] - minV) / scale;
  }

  // Compute per-triangle distortion
  let totalDistortion = 0;
  let maxDistortion = 0;
  for (let t = 0; t < triCount; t++) {
    const i0 = triIndices[t * 3], i1 = triIndices[t * 3 + 1], i2 = triIndices[t * 3 + 2];
    // 3D edge lengths
    const p0 = new THREE.Vector3().fromBufferAttribute(posAttr, i0);
    const p1 = new THREE.Vector3().fromBufferAttribute(posAttr, i1);
    const p2 = new THREE.Vector3().fromBufferAttribute(posAttr, i2);
    const l01_3d = p0.distanceTo(p1);
    const l12_3d = p1.distanceTo(p2);
    const l20_3d = p2.distanceTo(p0);
    // 2D edge lengths
    const l01_2d = Math.hypot(uv[i1 * 2] - uv[i0 * 2], uv[i1 * 2 + 1] - uv[i0 * 2 + 1]);
    const l12_2d = Math.hypot(uv[i2 * 2] - uv[i1 * 2], uv[i2 * 2 + 1] - uv[i1 * 2 + 1]);
    const l20_2d = Math.hypot(uv[i0 * 2] - uv[i2 * 2], uv[i0 * 2 + 1] - uv[i2 * 2 + 1]);

    const r01 = l01_3d > 1e-8 ? l01_2d / l01_3d : 1;
    const r12 = l12_3d > 1e-8 ? l12_2d / l12_3d : 1;
    const r20 = l20_3d > 1e-8 ? l20_2d / l20_3d : 1;

    const d = (Math.abs(r01 - 1) + Math.abs(r12 - 1) + Math.abs(r20 - 1)) / 3;
    totalDistortion += d;
    maxDistortion = Math.max(maxDistortion, d);
  }

  return {
    uvs: uv,
    avgDistortion: triCount > 0 ? totalDistortion / triCount : 0,
    maxDistortion,
  };
}

function cotAngle(a: THREE.Vector3, b: THREE.Vector3): number {
  const dot = a.dot(b);
  const cross = new THREE.Vector3().crossVectors(a, b).length();
  return cross > 1e-10 ? dot / cross : 0;
}

// ── Main export ──────────────────────────────────────────────

const DEFAULT_STENCIL_SETTINGS: StencilSettings = {
  outputSize: 2048,
  contrast: 1.0,
  lineThickness: 1.0,
  denoiseIterations: 1,
  threshold: 128,
  invert: false,
};

/**
 * Unwrap the deformed mesh to a flat stencil image using ARAP UV
 * parameterisation, then render the tattoo texture into UV space.
 * Applies post-processing for crisp, artifact-free output.
 */
export function unwrapMeshToStencil(
  geo: THREE.BufferGeometry,
  texture: THREE.Texture,
  outputSizeOrSettings?: number | Partial<StencilSettings>,
): UnwrapResult {
  const settings: StencilSettings =
    typeof outputSizeOrSettings === "number"
      ? { ...DEFAULT_STENCIL_SETTINGS, outputSize: outputSizeOrSettings }
      : { ...DEFAULT_STENCIL_SETTINGS, ...outputSizeOrSettings };

  const outputSize = settings.outputSize;

  const uv = geo.attributes.uv as THREE.BufferAttribute | undefined;
  if (!uv) throw new Error("Geometry has no UV coordinates.");
  if (!geo.index) throw new Error("Geometry must be indexed.");

  // ── Compute ARAP UVs ──────────────────────────────────────
  const { uvs: arapUV, avgDistortion, maxDistortion } = computeARAPUVs(geo);

  const idx = geo.index;

  // ── render to canvas ───────────────────────────────────────
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, outputSize, outputSize);

  // Get the source image from the texture
  const srcCanvas = document.createElement("canvas");
  const img = texture.image as HTMLImageElement | HTMLCanvasElement;
  srcCanvas.width = img.width || outputSize;
  srcCanvas.height = img.height || outputSize;
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true })!;
  srcCtx.drawImage(img, 0, 0, srcCanvas.width, srcCanvas.height);

  const triCount = idx.count / 3;

  for (let t = 0; t < triCount; t++) {
    const i0 = idx.getX(t * 3);
    const i1 = idx.getX(t * 3 + 1);
    const i2 = idx.getX(t * 3 + 2);

    const u0x = arapUV[i0 * 2] * outputSize,
          u0y = (1 - arapUV[i0 * 2 + 1]) * outputSize;
    const u1x = arapUV[i1 * 2] * outputSize,
          u1y = (1 - arapUV[i1 * 2 + 1]) * outputSize;
    const u2x = arapUV[i2 * 2] * outputSize,
          u2y = (1 - arapUV[i2 * 2 + 1]) * outputSize;

    const sx0 = uv.getX(i0) * srcCanvas.width,
          sy0 = (1 - uv.getY(i0)) * srcCanvas.height;
    const sx1 = uv.getX(i1) * srcCanvas.width,
          sy1 = (1 - uv.getY(i1)) * srcCanvas.height;
    const sx2 = uv.getX(i2) * srcCanvas.width,
          sy2 = (1 - uv.getY(i2)) * srcCanvas.height;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(u0x, u0y);
    ctx.lineTo(u1x, u1y);
    ctx.lineTo(u2x, u2y);
    ctx.closePath();
    ctx.clip();

    drawAffineTriangle(
      ctx, srcCanvas,
      sx0, sy0, sx1, sy1, sx2, sy2,
      u0x, u0y, u1x, u1y, u2x, u2y,
    );

    ctx.restore();
  }

  // ── Post-processing pipeline ───────────────────────────────
  applyStencilPostProcessing(ctx, outputSize, settings);

  return {
    stencilBase64: canvas.toDataURL("image/png").split(",")[1],
    width: outputSize,
    height: outputSize,
    avgDistortion,
    maxDistortion,
  };
}

// ── Screenshot-based export ──────────────────────────────────

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Take a WebGL canvas screenshot, crop to the tattoo area,
 * then convert to a crisp black-and-white stencil using the
 * same post-processing pipeline.
 *
 * `crop` coordinates are normalised 0–1 relative to canvas dims.
 * If no crop is given, the whole canvas is used.
 */
export function screenshotToStencil(
  glCanvas: HTMLCanvasElement,
  crop: CropRect | null,
  settings: Partial<StencilSettings> = {},
): UnwrapResult {
  const merged: StencilSettings = {
    outputSize: 2048,
    contrast: 1.0,
    lineThickness: 1.0,
    denoiseIterations: 1,
    threshold: 128,
    invert: false,
    ...settings,
  };

  const outputSize = merged.outputSize;
  const cw = glCanvas.width;
  const ch = glCanvas.height;

  // Compute pixel crop rect
  const sx = crop ? Math.round(crop.x * cw) : 0;
  const sy = crop ? Math.round(crop.y * ch) : 0;
  const sw = crop ? Math.round(crop.w * cw) : cw;
  const sh = crop ? Math.round(crop.h * ch) : ch;

  // Draw the cropped region to a temp canvas at full source resolution
  const tmp = document.createElement("canvas");
  tmp.width = sw;
  tmp.height = sh;
  const tmpCtx = tmp.getContext("2d", { willReadFrequently: true })!;
  tmpCtx.drawImage(glCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

  // Scale to outputSize (square)
  const out = document.createElement("canvas");
  out.width = outputSize;
  out.height = outputSize;
  const outCtx = out.getContext("2d", { willReadFrequently: true })!;

  // Fill white first (any background outside the tattoo will be white)
  outCtx.fillStyle = "#fff";
  outCtx.fillRect(0, 0, outputSize, outputSize);

  // Fit the crop into the square, preserving aspect ratio
  const aspect = sw / sh;
  let dw: number, dh: number, dx: number, dy: number;
  if (aspect >= 1) {
    dw = outputSize;
    dh = Math.round(outputSize / aspect);
    dx = 0;
    dy = Math.round((outputSize - dh) / 2);
  } else {
    dh = outputSize;
    dw = Math.round(outputSize * aspect);
    dx = Math.round((outputSize - dw) / 2);
    dy = 0;
  }
  outCtx.drawImage(tmp, 0, 0, sw, sh, dx, dy, dw, dh);

  // Apply grayscale → contrast → line thickness → denoise → threshold → invert
  applyStencilPostProcessing(outCtx, outputSize, merged);

  return {
    stencilBase64: out.toDataURL("image/png").split(",")[1],
    width: outputSize,
    height: outputSize,
  };
}

// ── Stencil post-processing (exported for screenshot pipeline) ──

export function applyStencilPostProcessing(
  ctx: CanvasRenderingContext2D,
  size: number,
  settings: StencilSettings,
): void {
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;

  // 1) Convert to grayscale
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = gray;
    d[i + 1] = gray;
    d[i + 2] = gray;
  }

  // 2) Apply contrast
  if (settings.contrast !== 1.0) {
    const factor = (259 * (settings.contrast * 128 + 255)) / (255 * (259 - settings.contrast * 128));
    for (let i = 0; i < d.length; i += 4) {
      d[i] = clamp(factor * (d[i] - 128) + 128);
      d[i + 1] = clamp(factor * (d[i + 1] - 128) + 128);
      d[i + 2] = clamp(factor * (d[i + 2] - 128) + 128);
    }
  }

  // 3) Line thickness via morphological dilate/erode
  if (settings.lineThickness !== 1.0) {
    applyLineThickness(d, size, settings.lineThickness);
  }

  // 4) Denoise: median filter passes to remove salt-and-pepper artifacts
  for (let pass = 0; pass < settings.denoiseIterations; pass++) {
    applyMedianFilter(d, size);
  }

  // 5) Threshold to black/white
  for (let i = 0; i < d.length; i += 4) {
    const gray = d[i];
    let bw = gray < settings.threshold ? 0 : 255;
    if (settings.invert) bw = 255 - bw;
    d[i] = bw;
    d[i + 1] = bw;
    d[i + 2] = bw;
    d[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/** Thicken or thin dark lines using morphological operations. */
function applyLineThickness(
  d: Uint8ClampedArray,
  size: number,
  thickness: number,
): void {
  if (thickness <= 0.5) return;
  const passes = Math.round(Math.abs(thickness - 1.0) * 2);
  if (passes === 0) return;

  const tmp = new Uint8ClampedArray(d.length);
  const dilate = thickness > 1.0; // >1 = dilate dark = thicker lines

  for (let p = 0; p < passes; p++) {
    tmp.set(d);
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const idx = (y * size + x) * 4;
        // 3x3 neighbourhood
        const vals = [
          tmp[((y - 1) * size + x) * 4],
          tmp[((y + 1) * size + x) * 4],
          tmp[(y * size + x - 1) * 4],
          tmp[(y * size + x + 1) * 4],
          tmp[idx],
        ];
        const v = dilate ? Math.min(...vals) : Math.max(...vals);
        d[idx] = v;
        d[idx + 1] = v;
        d[idx + 2] = v;
      }
    }
  }
}

/** 3×3 median filter to remove salt-and-pepper noise / artifacts. */
function applyMedianFilter(d: Uint8ClampedArray, size: number): void {
  const tmp = new Uint8ClampedArray(d.length);
  tmp.set(d);
  const neighbours = new Uint8Array(9);

  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          neighbours[n++] = tmp[((y + dy) * size + (x + dx)) * 4];
        }
      }
      neighbours.sort();
      const med = neighbours[4];
      const idx = (y * size + x) * 4;
      d[idx] = med;
      d[idx + 1] = med;
      d[idx + 2] = med;
    }
  }
}

/**
 * Draw srcCanvas mapped from triangle (s0,s1,s2) onto
 * destination triangle (d0,d1,d2) using canvas affine transform.
 */
function drawAffineTriangle(
  ctx: CanvasRenderingContext2D,
  srcCanvas: HTMLCanvasElement,
  sx0: number, sy0: number,
  sx1: number, sy1: number,
  sx2: number, sy2: number,
  dx0: number, dy0: number,
  dx1: number, dy1: number,
  dx2: number, dy2: number,
): void {
  const dsSx1 = sx1 - sx0, dsSy1 = sy1 - sy0;
  const dsSx2 = sx2 - sx0, dsSy2 = sy2 - sy0;
  const det = dsSx1 * dsSy2 - dsSx2 * dsSy1;
  if (Math.abs(det) < 1e-10) return;

  const detInv = 1 / det;
  const ddx1 = dx1 - dx0, ddy1 = dy1 - dy0;
  const ddx2 = dx2 - dx0, ddy2 = dy2 - dy0;

  const a = (dsSy2 * ddx1 - dsSy1 * ddx2) * detInv;
  const b = (dsSy2 * ddy1 - dsSy1 * ddy2) * detInv;
  const c = (-dsSx2 * ddx1 + dsSx1 * ddx2) * detInv;
  const d = (-dsSx2 * ddy1 + dsSx1 * ddy2) * detInv;
  const e = dx0 - a * sx0 - c * sy0;
  const f = dy0 - b * sx0 - d * sy0;

  ctx.setTransform(a, b, c, d, e, f);
  ctx.drawImage(srcCanvas, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
