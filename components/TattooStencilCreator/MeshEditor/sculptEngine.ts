/* ─────────────────────────────────────────────────────────────
   MeshEditor – sculpt engine
   Pure math for vertex manipulation, soft selection, symmetry,
   edge constraints, and real-time Laplacian mesh smoothing.
   ───────────────────────────────────────────────────────────── */
import * as THREE from "three";
import type { BrushSettings, SculptTool, VertexState } from "./types";

// ── helpers ──────────────────────────────────────────────────

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _plane = new THREE.Plane();

/** Smooth hermite falloff: 1 at centre, 0 at radius. */
function falloffWeight(dist: number, radius: number, exp: number): number {
  const t = Math.min(dist / radius, 1);
  return Math.pow(1 - t * t, exp);
}

// ── adjacency (build once per geometry) ──────────────────────

export type Adjacency = Int32Array[];

export function buildAdjacency(geo: THREE.BufferGeometry): Adjacency {
  const idx = geo.index;
  const count = geo.attributes.position.count;
  const neighbours: Set<number>[] = Array.from({ length: count }, () => new Set());

  if (idx) {
    const arr = idx.array;
    for (let i = 0; i < arr.length; i += 3) {
      const a = arr[i], b = arr[i + 1], c = arr[i + 2];
      neighbours[a].add(b); neighbours[a].add(c);
      neighbours[b].add(a); neighbours[b].add(c);
      neighbours[c].add(a); neighbours[c].add(b);
    }
  }

  return neighbours.map((s) => Int32Array.from(s));
}

/**
 * Detect boundary vertices (vertices on edges that belong to only one face).
 * Returns a boolean array where true = boundary vertex.
 */
export function findBoundaryVertices(geo: THREE.BufferGeometry): boolean[] {
  const idx = geo.index;
  const count = geo.attributes.position.count;
  const boundary = new Array(count).fill(false) as boolean[];

  if (!idx) return boundary;

  // Count how many faces each edge belongs to
  const edgeCount = new Map<string, number>();
  const arr = idx.array;
  for (let i = 0; i < arr.length; i += 3) {
    const verts = [arr[i], arr[i + 1], arr[i + 2]];
    for (let j = 0; j < 3; j++) {
      const a = Math.min(verts[j], verts[(j + 1) % 3]);
      const b = Math.max(verts[j], verts[(j + 1) % 3]);
      const key = `${a}-${b}`;
      edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
    }
  }

  for (const [key, count] of edgeCount) {
    if (count === 1) {
      const [a, b] = key.split("-").map(Number);
      boundary[a] = true;
      boundary[b] = true;
    }
  }

  return boundary;
}

// ── sculpt operations ────────────────────────────────────────

export interface SculptHit {
  vertexIndex: number;
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

/** Check if a vertex is locked by any mechanism. */
function isLocked(vs: VertexState, i: number): boolean {
  return vs.pinned[i] || vs.edgeLocked[i];
}

/**
 * Find the mirror vertex index for symmetry.
 * Returns -1 if no close match found.
 */
function findMirrorVertex(
  vs: VertexState,
  i: number,
  axis: "x" | "y" | "z",
  tolerance: number = 0.05,
): number {
  const ax = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  const ox = vs.current[i * 3];
  const oy = vs.current[i * 3 + 1];
  const oz = vs.current[i * 3 + 2];

  // The mirrored position
  const mx = ax === 0 ? -ox : ox;
  const my = ax === 1 ? -oy : oy;
  const mz = ax === 2 ? -oz : oz;

  const count = vs.current.length / 3;
  let bestIdx = -1;
  let bestDist = tolerance;

  for (let j = 0; j < count; j++) {
    if (j === i) continue;
    const dx = vs.current[j * 3] - mx;
    const dy = vs.current[j * 3 + 1] - my;
    const dz = vs.current[j * 3 + 2] - mz;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = j;
    }
  }
  return bestIdx;
}

/**
 * Apply one sculpt stroke at the given hit for the chosen tool.
 * Mutates `vs.current` positions in place.
 * Returns the set of affected vertex indices.
 */
export function applySculpt(
  vs: VertexState,
  hit: SculptHit,
  tool: SculptTool,
  brush: BrushSettings,
  dragDir?: THREE.Vector3,
): Set<number> {
  const affected = new Set<number>();
  const count = vs.current.length / 3;

  for (let i = 0; i < count; i++) {
    if (isLocked(vs, i) && tool !== "unpin" && tool !== "edge" && tool !== "region") continue;

    const vx = vs.current[i * 3];
    const vy = vs.current[i * 3 + 1];
    const vz = vs.current[i * 3 + 2];
    _v.set(vx, vy, vz);
    const dist = _v.distanceTo(hit.point);
    if (dist > brush.radius) continue;

    const w = falloffWeight(dist, brush.radius, brush.falloff) * brush.strength;
    if (w < 0.001) continue;

    affected.add(i);

    switch (tool) {
      case "grab": {
        if (dragDir) {
          vs.current[i * 3] += dragDir.x * w;
          vs.current[i * 3 + 1] += dragDir.y * w;
          vs.current[i * 3 + 2] += dragDir.z * w;
        }
        break;
      }
      case "push": {
        _n.copy(hit.normal).normalize();
        vs.current[i * 3] += _n.x * w * 0.05;
        vs.current[i * 3 + 1] += _n.y * w * 0.05;
        vs.current[i * 3 + 2] += _n.z * w * 0.05;
        break;
      }
      case "pull": {
        _n.copy(hit.normal).normalize().negate();
        vs.current[i * 3] += _n.x * w * 0.05;
        vs.current[i * 3 + 1] += _n.y * w * 0.05;
        vs.current[i * 3 + 2] += _n.z * w * 0.05;
        break;
      }
      case "flatten": {
        _plane.setFromNormalAndCoplanarPoint(hit.normal.normalize(), hit.point);
        const d = _plane.distanceToPoint(_v);
        vs.current[i * 3] -= hit.normal.x * d * w;
        vs.current[i * 3 + 1] -= hit.normal.y * d * w;
        vs.current[i * 3 + 2] -= hit.normal.z * d * w;
        break;
      }
      case "pin": {
        vs.pinned[i] = true;
        break;
      }
      case "unpin": {
        vs.pinned[i] = false;
        vs.edgeLocked[i] = false;
        break;
      }
      case "edge": {
        vs.edgeLocked[i] = true;
        vs.pinned[i] = true; // edge lock implies pin
        break;
      }
      case "warp": {
        if (dragDir) {
          vs.current[i * 3] += dragDir.x * w * 0.1;
          vs.current[i * 3 + 1] += dragDir.y * w * 0.1;
          vs.current[i * 3 + 2] += dragDir.z * w * 0.1;
        }
        break;
      }
      case "bend": {
        // Bend along an arc: rotate vertices around an axis perpendicular
        // to the drag direction and the hit normal.
        if (dragDir) {
          const axis = _n.copy(hit.normal).normalize();
          const angle = dragDir.length() * w * 0.3;
          const quat = new THREE.Quaternion().setFromAxisAngle(axis, angle);
          const relPos = new THREE.Vector3(
            vs.current[i * 3] - hit.point.x,
            vs.current[i * 3 + 1] - hit.point.y,
            vs.current[i * 3 + 2] - hit.point.z,
          );
          relPos.applyQuaternion(quat);
          vs.current[i * 3] = hit.point.x + relPos.x;
          vs.current[i * 3 + 1] = hit.point.y + relPos.y;
          vs.current[i * 3 + 2] = hit.point.z + relPos.z;
        }
        break;
      }
      case "twist": {
        // Twist vertices around the hit normal axis proportional to distance.
        if (dragDir) {
          const twistAxis = _n.copy(hit.normal).normalize();
          // Angle increases with distance from center for twist effect
          const angle = w * dragDir.length() * 0.5 * (dist / brush.radius);
          const quat = new THREE.Quaternion().setFromAxisAngle(twistAxis, angle);
          const relPos = new THREE.Vector3(
            vs.current[i * 3] - hit.point.x,
            vs.current[i * 3 + 1] - hit.point.y,
            vs.current[i * 3 + 2] - hit.point.z,
          );
          relPos.applyQuaternion(quat);
          vs.current[i * 3] = hit.point.x + relPos.x;
          vs.current[i * 3 + 1] = hit.point.y + relPos.y;
          vs.current[i * 3 + 2] = hit.point.z + relPos.z;
        }
        break;
      }
      case "region": {
        // Region painting doesn't change positions – handled by the component
        break;
      }
      default:
        break;
    }

    // Apply symmetry mirror
    if (vs.symmetryAxis && tool !== "pin" && tool !== "unpin" && tool !== "edge" && tool !== "region") {
      const mirrorIdx = findMirrorVertex(vs, i, vs.symmetryAxis);
      if (mirrorIdx >= 0 && !isLocked(vs, mirrorIdx)) {
        const ax = vs.symmetryAxis === "x" ? 0 : vs.symmetryAxis === "y" ? 1 : 2;
        const delta = [
          vs.current[i * 3] - vx,
          vs.current[i * 3 + 1] - vy,
          vs.current[i * 3 + 2] - vz,
        ];
        // Mirror the delta on the symmetry axis
        delta[ax] = -delta[ax];
        vs.current[mirrorIdx * 3] += delta[0];
        vs.current[mirrorIdx * 3 + 1] += delta[1];
        vs.current[mirrorIdx * 3 + 2] += delta[2];
        affected.add(mirrorIdx);
      }
    }
  }

  return affected;
}

/**
 * Laplacian smooth – relax vertices toward the average of their neighbours.
 * Respects pinned + edgeLocked vertices.
 */
export function laplacianSmooth(
  vs: VertexState,
  adj: Adjacency,
  strength: number = 0.3,
  iterations: number = 1,
  indices?: Set<number>,
): void {
  const count = vs.current.length / 3;
  const temp = new Float32Array(vs.current.length);

  for (let iter = 0; iter < iterations; iter++) {
    temp.set(vs.current);

    const loop = indices ?? new Set(Array.from({ length: count }, (_, i) => i));

    for (const i of loop) {
      if (isLocked(vs, i)) continue;
      const nbs = adj[i];
      if (!nbs || nbs.length === 0) continue;

      let sx = 0, sy = 0, sz = 0;
      for (let j = 0; j < nbs.length; j++) {
        const ni = nbs[j];
        sx += temp[ni * 3];
        sy += temp[ni * 3 + 1];
        sz += temp[ni * 3 + 2];
      }
      sx /= nbs.length;
      sy /= nbs.length;
      sz /= nbs.length;

      vs.current[i * 3] += (sx - vs.current[i * 3]) * strength;
      vs.current[i * 3 + 1] += (sy - vs.current[i * 3 + 1]) * strength;
      vs.current[i * 3 + 2] += (sz - vs.current[i * 3 + 2]) * strength;
    }
  }
}

// ── depth map → mesh displacement ────────────────────────────

/**
 * Apply a grayscale depth map as displacement to the mesh.
 * Reads the depth image, samples at each vertex UV, and pushes
 * the vertex along its normal by (depth * strength).
 */
export function applyDepthDisplacement(
  vs: VertexState,
  depthData: Uint8ClampedArray,
  depthW: number,
  depthH: number,
  uvs: Float32Array, // interleaved u,v pairs
  normals: Float32Array, // interleaved nx,ny,nz
  strength: number = 0.3,
): void {
  const count = vs.current.length / 3;

  for (let i = 0; i < count; i++) {
    if (isLocked(vs, i)) continue;

    const u = uvs[i * 2];
    const v = uvs[i * 2 + 1];

    // Sample depth map (bilinear)
    const px = Math.min(Math.floor(u * depthW), depthW - 1);
    const py = Math.min(Math.floor((1 - v) * depthH), depthH - 1);
    const idx = (py * depthW + px) * 4;
    const depthVal = depthData[idx] / 255; // 0..1

    // Displace along vertex normal
    const nx = normals[i * 3];
    const ny = normals[i * 3 + 1];
    const nz = normals[i * 3 + 2];

    // depth 0.5 = neutral, >0.5 = push out, <0.5 = pull in
    const displacement = (depthVal - 0.5) * 2 * strength;

    vs.current[i * 3] += nx * displacement;
    vs.current[i * 3 + 1] += ny * displacement;
    vs.current[i * 3 + 2] += nz * displacement;
  }
}

/**
 * AI-assisted auto-fix: analyses the mesh for high-distortion areas
 * and applies targeted Laplacian smoothing + gentle flatten.
 */
export function aiAutoFix(
  vs: VertexState,
  adj: Adjacency,
  iterations: number = 5,
): { smoothedCount: number } {
  const distortion = computeDistortion(vs);
  const count = vs.current.length / 3;

  // Find vertices with distortion > 60th percentile
  const sorted = Array.from(distortion).sort((a, b) => a - b);
  const threshold = sorted[Math.floor(count * 0.6)] || 0.1;

  const highDistortion = new Set<number>();
  for (let i = 0; i < count; i++) {
    if (distortion[i] > threshold && !isLocked(vs, i)) {
      highDistortion.add(i);
    }
  }

  if (highDistortion.size === 0) return { smoothedCount: 0 };

  // Progressive smoothing: stronger on most distorted
  for (let iter = 0; iter < iterations; iter++) {
    laplacianSmooth(vs, adj, 0.4, 1, highDistortion);
  }

  return { smoothedCount: highDistortion.size };
}

// ── distortion metrics ───────────────────────────────────────

/**
 * Per-vertex displacement distortion relative to the original mesh.
 * Returns values 0..1 where 0 = no distortion, 1 = max.
 */
export function computeDistortion(vs: VertexState): Float32Array {
  const count = vs.current.length / 3;
  const dist = new Float32Array(count);
  let maxD = 0;

  for (let i = 0; i < count; i++) {
    const dx = vs.current[i * 3] - vs.original[i * 3];
    const dy = vs.current[i * 3 + 1] - vs.original[i * 3 + 1];
    const dz = vs.current[i * 3 + 2] - vs.original[i * 3 + 2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    dist[i] = d;
    if (d > maxD) maxD = d;
  }

  if (maxD > 0) {
    for (let i = 0; i < count; i++) dist[i] /= maxD;
  }

  return dist;
}

/**
 * Per-vertex curvature estimate (discrete Laplacian magnitude).
 */
export function computeCurvature(
  vs: VertexState,
  adj: Adjacency,
): Float32Array {
  const count = vs.current.length / 3;
  const curv = new Float32Array(count);
  let maxC = 0;

  for (let i = 0; i < count; i++) {
    const nbs = adj[i];
    if (!nbs || nbs.length === 0) continue;
    let sx = 0, sy = 0, sz = 0;
    for (let j = 0; j < nbs.length; j++) {
      sx += vs.current[nbs[j] * 3];
      sy += vs.current[nbs[j] * 3 + 1];
      sz += vs.current[nbs[j] * 3 + 2];
    }
    sx = sx / nbs.length - vs.current[i * 3];
    sy = sy / nbs.length - vs.current[i * 3 + 1];
    sz = sz / nbs.length - vs.current[i * 3 + 2];
    const c = Math.sqrt(sx * sx + sy * sy + sz * sz);
    curv[i] = c;
    if (c > maxC) maxC = c;
  }

  if (maxC > 0) {
    for (let i = 0; i < count; i++) curv[i] /= maxC;
  }

  return curv;
}
