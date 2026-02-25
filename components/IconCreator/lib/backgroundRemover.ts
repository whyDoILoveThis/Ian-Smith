/**
 * IconCreator — Background Remover
 *
 * Implements a flood-fill (magic-wand) style background removal:
 *  1. Samples the background color from pixel (0, 0)
 *  2. Seeds from ALL edge pixels that match the background color
 *  3. Performs iterative DFS to find all connected pixels within tolerance
 *  4. Sets matching pixels' alpha channel to 0 (transparent)
 *
 * This approach handles backgrounds that wrap around the logo from any edge.
 */

// ─── Color Distance ──────────────────────────────────────────────────────────

/**
 * Euclidean RGB distance between two colors.
 * Range: 0 (identical) to ~441 (black vs white).
 */
function colorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

// ─── Flood Fill ──────────────────────────────────────────────────────────────

/**
 * Remove the background from raw ImageData in-place.
 *
 * @param imageData - The canvas ImageData to modify
 * @param tolerance - Color distance threshold (0–100). Higher = more aggressive.
 * @returns The same ImageData reference, now with background pixels made transparent.
 */
export function removeBackground(
  imageData: ImageData,
  tolerance: number = 30,
): ImageData {
  const { width, height, data } = imageData;

  // Visited bitmap — 1 byte per pixel, 0 = unvisited, 1 = visited
  const visited = new Uint8Array(width * height);

  // ── Sample background color from (0, 0) ──
  const seedR = data[0];
  const seedG = data[1];
  const seedB = data[2];

  // ── Helper: attempt to add a pixel as a flood-fill seed ──
  const stack: number[] = []; // interleaved [x, y, x, y, ...]

  function trySeed(x: number, y: number): void {
    const idx = y * width + x;
    if (visited[idx]) return;

    const pIdx = idx * 4;
    const dist = colorDistance(
      data[pIdx], data[pIdx + 1], data[pIdx + 2],
      seedR, seedG, seedB,
    );

    if (dist <= tolerance) {
      visited[idx] = 1;
      stack.push(x, y);
    }
  }

  // ── Seed from ALL border pixels that match the background color ──
  // Top & bottom edges
  for (let x = 0; x < width; x++) {
    trySeed(x, 0);
    trySeed(x, height - 1);
  }
  // Left & right edges (skip corners, already done)
  for (let y = 1; y < height - 1; y++) {
    trySeed(0, y);
    trySeed(width - 1, y);
  }

  // ── Iterative DFS flood fill ──
  while (stack.length > 0) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    const pIdx = (cy * width + cx) * 4;

    // Make pixel fully transparent
    data[pIdx + 3] = 0;

    // Expand to 4-connected neighbors
    if (cx > 0)            trySeed(cx - 1, cy);
    if (cx < width - 1)    trySeed(cx + 1, cy);
    if (cy > 0)            trySeed(cx, cy - 1);
    if (cy < height - 1)   trySeed(cx, cy + 1);
  }

  return imageData;
}
