/* ─────────────────────────────────────────────────────────────
   Server-side mesh grid warping and Thin Plate Spline (TPS)

   This module provides localized, non-uniform surface flattening
   by dividing the image into a grid and warping each cell
   independently based on:
     1. Depth map data (per-cell depth → stretch correction)
     2. Relief mask (embossed/divoted regions)
     3. Curve highlight mask (user-painted curvature)

   Unlike the global cylindrical unwrap, mesh warping handles:
     • Non-uniform curvature (e.g. elbow + forearm)
     • Local dents (collarbone, between bones)
     • Asymmetric stretch (one side of a limb wraps more)

   The TPS solver is a pure JS implementation (no native deps).
   ───────────────────────────────────────────────────────────── */

import sharp from 'sharp';

// ── Types ────────────────────────────────────────────────────

interface MeshWarpOptions {
  /** Grid cells per short side. Default 12. */
  resolution: number;
  /** Depth map: grayscale buffer (brighter = closer). */
  depthMap?: Buffer;
  /** Relief mask: 128 = neutral, >128 = embossed, <128 = divoted. */
  reliefMask?: Buffer;
  /** Curve mask: 0 = no curvature, 1-255 = curvature level. */
  curveMask?: Buffer;
  curveMaskAngleDeg?: number;
  /** Overall strength multiplier (0-2). */
  strength: number;
}

interface GridPoint {
  /** Original grid position (pixels). */
  ox: number;
  oy: number;
  /** Warped grid position (pixels). */
  wx: number;
  wy: number;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Apply localized mesh grid warping to a grayscale image buffer.
 * Returns the warped image and the number of grid cells used.
 */
export async function applyMeshWarp(
  imgBuf: Buffer,
  W: number,
  H: number,
  opts: MeshWarpOptions,
): Promise<{ buf: Buffer; gridCells: number }> {
  const res = Math.max(4, Math.min(32, opts.resolution));
  const shortSide = Math.min(W, H);
  const cellSize = Math.floor(shortSide / res);
  const gridW = Math.ceil(W / cellSize) + 1; // +1 for boundary vertices
  const gridH = Math.ceil(H / cellSize) + 1;
  const numCells = (gridW - 1) * (gridH - 1);

  // Parse the depth map if provided
  let depthRaw: Buffer | null = null;
  if (opts.depthMap) {
    depthRaw = await sharp(opts.depthMap)
      .resize(W, H, { fit: 'fill' })
      .grayscale()
      .removeAlpha()
      .raw()
      .toBuffer();
  }

  // Parse relief mask
  let reliefRaw: Buffer | null = null;
  if (opts.reliefMask) {
    reliefRaw = await sharp(opts.reliefMask)
      .resize(W, H, { fit: 'fill' })
      .grayscale()
      .removeAlpha()
      .raw()
      .toBuffer();
  }

  // Parse curve mask
  let curveRaw: Buffer | null = null;
  if (opts.curveMask) {
    curveRaw = await sharp(opts.curveMask)
      .resize(W, H, { fit: 'fill' })
      .grayscale()
      .removeAlpha()
      .raw()
      .toBuffer();
  }

  // Build grid vertices
  const grid: GridPoint[] = [];
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const ox = Math.min(gx * cellSize, W - 1);
      const oy = Math.min(gy * cellSize, H - 1);
      grid.push({ ox, oy, wx: ox, wy: oy });
    }
  }

  // Calculate displacement for each grid vertex
  const strength = Math.max(0, Math.min(2, opts.strength));

  for (let i = 0; i < grid.length; i++) {
    const gp = grid[i];
    const px = clamp(Math.round(gp.ox), 0, W - 1);
    const py = clamp(Math.round(gp.oy), 0, H - 1);
    const idx = py * W + px;

    let dx = 0;
    let dy = 0;

    // 1. Depth-based displacement: estimate surface normal direction
    //    and displace to "flatten" curved areas
    if (depthRaw) {
      const { nx, ny } = sampleDepthGradient(depthRaw, W, H, px, py, cellSize);
      // Displace in the direction opposite to the surface normal
      // to undo the 3D→2D projection compression
      dx += nx * cellSize * 0.3 * strength;
      dy += ny * cellSize * 0.3 * strength;
    }

    // 2. Relief-based displacement: embossed areas → expand outward,
    //    divoted areas → compress inward
    if (reliefRaw) {
      const reliefVal = reliefRaw[idx]; // 0-255, 128 = neutral
      const reliefOffset = (reliefVal - 128) / 128; // -1 to +1
      if (Math.abs(reliefOffset) > 0.05) {
        // Expand/compress radially from image center
        const rcx = px - W / 2;
        const rcy = py - H / 2;
        const rDist = Math.sqrt(rcx * rcx + rcy * rcy) || 1;
        dx += (rcx / rDist) * reliefOffset * cellSize * 0.2 * strength;
        dy += (rcy / rDist) * reliefOffset * cellSize * 0.2 * strength;
      }
    }

    // 3. Curve mask: directional stretch along the specified axis
    if (curveRaw) {
      const curveVal = curveRaw[idx]; // 0-255
      if (curveVal > 2) {
        const curvNorm = curveVal / 255; // 0-1
        const angleRad = ((opts.curveMaskAngleDeg ?? 0) * Math.PI) / 180;
        // Stretch perpendicular to the axis (undo cylindrical compression)
        const perpX = -Math.sin(angleRad);
        const perpY = Math.cos(angleRad);
        // Distance from the axis center → more stretch at edges
        const axisX = Math.cos(angleRad);
        const axisY = Math.sin(angleRad);
        const distPerp = (px - W / 2) * perpX + (py - H / 2) * perpY;
        const maxPerp = shortSide / 2;
        const edgeFactor = clamp(Math.abs(distPerp) / maxPerp, 0, 1);

        const stretchAmount = curvNorm * edgeFactor * cellSize * 0.4 * strength;
        dx += perpX * Math.sign(distPerp) * stretchAmount;
        dy += perpY * Math.sign(distPerp) * stretchAmount;
      }
    }

    gp.wx = gp.ox + dx;
    gp.wy = gp.oy + dy;
  }

  // Smooth grid displacements to prevent seams (Laplacian smoothing, 2 passes)
  for (let pass = 0; pass < 2; pass++) {
    const smoothed = grid.map((g) => ({ ...g }));
    for (let gy = 1; gy < gridH - 1; gy++) {
      for (let gx = 1; gx < gridW - 1; gx++) {
        const i = gy * gridW + gx;
        const up = (gy - 1) * gridW + gx;
        const dn = (gy + 1) * gridW + gx;
        const lt = gy * gridW + (gx - 1);
        const rt = gy * gridW + (gx + 1);
        // 60% self + 10% each neighbor
        smoothed[i].wx = grid[i].wx * 0.6 + (grid[up].wx + grid[dn].wx + grid[lt].wx + grid[rt].wx) * 0.1;
        smoothed[i].wy = grid[i].wy * 0.6 + (grid[up].wy + grid[dn].wy + grid[lt].wy + grid[rt].wy) * 0.1;
      }
    }
    for (let i = 0; i < grid.length; i++) {
      grid[i].wx = smoothed[i].wx;
      grid[i].wy = smoothed[i].wy;
    }
  }

  // Apply the warp via inverse bilinear interpolation
  const srcRaw = await sharp(imgBuf).grayscale().removeAlpha().raw().toBuffer();
  const out = Buffer.alloc(W * H, 0);

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      // Find which grid cell this pixel belongs to
      const gx = Math.min(Math.floor(px / cellSize), gridW - 2);
      const gy = Math.min(Math.floor(py / cellSize), gridH - 2);

      // Bilinear position within the cell (0-1)
      const tx = (px - gx * cellSize) / cellSize;
      const ty = (py - gy * cellSize) / cellSize;

      // Four corners: warped positions → interpolate source position
      const tl = grid[gy * gridW + gx];
      const tr = grid[gy * gridW + gx + 1];
      const bl = grid[(gy + 1) * gridW + gx];
      const br = grid[(gy + 1) * gridW + gx + 1];

      // Inverse: where in the warped image does this output pixel map to?
      // We want: for output pixel (px,py), find the source pixel
      // The grid stores original→warped, so we need inverse mapping.
      // Use the displacement vectors to compute inverse offset.
      const dispX = bilerp(
        tl.wx - tl.ox, tr.wx - tr.ox,
        bl.wx - bl.ox, br.wx - br.ox,
        tx, ty,
      );
      const dispY = bilerp(
        tl.wy - tl.oy, tr.wy - tr.oy,
        bl.wy - bl.oy, br.wy - br.oy,
        tx, ty,
      );

      // Source = current position minus the displacement (inverse warp)
      const srcX = px - dispX;
      const srcY = py - dispY;

      // Bilinear sample from source
      const cX = clamp(srcX, 0, W - 1.001);
      const cY = clamp(srcY, 0, H - 1.001);
      const ix = Math.floor(cX);
      const iy = Math.floor(cY);
      const fx = cX - ix;
      const fy = cY - iy;
      const ix1 = Math.min(ix + 1, W - 1);
      const iy1 = Math.min(iy + 1, H - 1);

      const v =
        srcRaw[iy * W + ix] * (1 - fx) * (1 - fy) +
        srcRaw[iy * W + ix1] * fx * (1 - fy) +
        srcRaw[iy1 * W + ix] * (1 - fx) * fy +
        srcRaw[iy1 * W + ix1] * fx * fy;

      out[py * W + px] = Math.round(v);
    }
  }

  const result = await sharp(out, { raw: { width: W, height: H, channels: 1 } })
    .png()
    .toBuffer();

  return { buf: result, gridCells: numCells };
}

// ── Helpers ──────────────────────────────────────────────────

/** Sample the depth gradient at a pixel position using a Sobel-like operator. */
function sampleDepthGradient(
  depthRaw: Buffer,
  W: number,
  H: number,
  px: number,
  py: number,
  kernelSize: number,
): { nx: number; ny: number } {
  const r = Math.max(1, Math.floor(kernelSize / 4));
  const x0 = clamp(px - r, 0, W - 1);
  const x1 = clamp(px + r, 0, W - 1);
  const y0 = clamp(py - r, 0, H - 1);
  const y1 = clamp(py + r, 0, H - 1);

  const dL = depthRaw[py * W + x0];
  const dR = depthRaw[py * W + x1];
  const dU = depthRaw[y0 * W + px];
  const dD = depthRaw[y1 * W + px];

  // Gradient in depth: positive = surface slopes toward camera on right/down
  const gx = (dR - dL) / (x1 - x0 || 1);
  const gy = (dD - dU) / (y1 - y0 || 1);

  // Normalise to unit-ish scale
  const mag = Math.sqrt(gx * gx + gy * gy) || 1;
  return {
    nx: gx / mag,
    ny: gy / mag,
  };
}

/** Bilinear interpolation of four corner values. */
function bilerp(
  tl: number,
  tr: number,
  bl: number,
  br: number,
  tx: number,
  ty: number,
): number {
  const top = tl * (1 - tx) + tr * tx;
  const bot = bl * (1 - tx) + br * tx;
  return top * (1 - ty) + bot * ty;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
