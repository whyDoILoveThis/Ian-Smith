/* ─────────────────────────────────────────────────────────────
   curveDeformer – smooth arc / spline deformation engine
   Given a set of control points, builds a CatmullRom spline and
   bends nearby vertices to follow the curve.  Useful for wing
   tips, lettering wraps, collarbone arcs, etc.
   ───────────────────────────────────────────────────────────── */
import * as THREE from "three";
import type { CurveControlPoint, CurveDirection, HookSettings, VertexState } from "./types";

/**
 * Resolve a CurveDirection string into a unit vector.
 * "auto" returns null (use default behaviour).
 */
function resolveDirection(dir: CurveDirection): THREE.Vector3 | null {
  switch (dir) {
    case "+x": return new THREE.Vector3(1, 0, 0);
    case "-x": return new THREE.Vector3(-1, 0, 0);
    case "+y": return new THREE.Vector3(0, 1, 0);
    case "-y": return new THREE.Vector3(0, -1, 0);
    case "+z": return new THREE.Vector3(0, 0, 1);
    case "-z": return new THREE.Vector3(0, 0, -1);
    default: return null;
  }
}

/**
 * Apply a curve-based deformation to the mesh.
 *
 * Algorithm:
 * 1. Build a straight "rest axis" from first → last control point.
 * 2. Build a CatmullRom spline through all control points.
 * 3. For each vertex within `influenceRadius` of the rest axis:
 *    a. Project onto the rest axis → parameter t ∈ [0,1].
 *    b. Sample the spline at t → curved position.
 *    c. Compute displacement = curvedPos − axisPos.
 *    d. Apply displacement with smooth falloff based on distance from axis.
 *
 * When `direction` != "auto", the displacement is projected/constrained
 * so that the curve only bends toward that direction.
 */
export function applyCurveDeformation(
  vs: VertexState,
  controlPoints: CurveControlPoint[],
  influenceRadius: number,
  direction: CurveDirection = "auto",
): void {
  if (controlPoints.length < 2) return;

  const pts = controlPoints.map(
    (cp) => new THREE.Vector3(cp.position[0], cp.position[1], cp.position[2]),
  );

  // Rest axis: straight line from first to last
  const axisStart = pts[0].clone();
  const axisEnd = pts[pts.length - 1].clone();
  const axisDir = axisEnd.clone().sub(axisStart);
  const axisLen = axisDir.length();
  if (axisLen < 1e-6) return;
  const axisNorm = axisDir.clone().normalize();

  // Spline through all points
  const spline = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);

  const count = vs.current.length / 3;
  const rSq = influenceRadius * influenceRadius;
  const dirVec = resolveDirection(direction);

  for (let i = 0; i < count; i++) {
    if (vs.pinned[i] || vs.edgeLocked[i]) continue;

    const vx = vs.current[i * 3];
    const vy = vs.current[i * 3 + 1];
    const vz = vs.current[i * 3 + 2];
    const v = new THREE.Vector3(vx, vy, vz);

    // Project vertex onto rest axis
    const toV = v.clone().sub(axisStart);
    const t = THREE.MathUtils.clamp(toV.dot(axisNorm) / axisLen, 0, 1);

    // Point on rest axis at parameter t
    const axisPoint = axisStart.clone().lerp(axisEnd, t);

    // Distance from axis (perpendicular)
    const distFromAxis = v.distanceTo(axisPoint);
    if (distFromAxis > influenceRadius) continue;

    // Smooth falloff: 1 at axis, 0 at influenceRadius
    const falloff = 1 - (distFromAxis / influenceRadius) ** 2;

    // Point on spline at parameter t
    const splinePoint = spline.getPointAt(t);

    // Displacement = spline position − axis position
    let dx = (splinePoint.x - axisPoint.x) * falloff;
    let dy = (splinePoint.y - axisPoint.y) * falloff;
    let dz = (splinePoint.z - axisPoint.z) * falloff;

    // Constrain displacement to the specified direction
    if (dirVec) {
      const disp = new THREE.Vector3(dx, dy, dz);
      const proj = dirVec.clone().multiplyScalar(disp.dot(dirVec));
      // Keep the full component along the axis direction but replace perpendicular
      // components with only the projected direction
      const axisComponent = axisNorm.clone().multiplyScalar(disp.dot(axisNorm));
      const result = axisComponent.add(proj);
      dx = result.x;
      dy = result.y;
      dz = result.z;
    }

    vs.current[i * 3] += dx;
    vs.current[i * 3 + 1] += dy;
    vs.current[i * 3 + 2] += dz;
  }
}

/**
 * Apply a flap / uncurve deformation to the mesh.
 *
 * Algorithm – rigid trapdoor rotation:
 * 1. Control points define a **hinge line** (first → last point).
 * 2. Every vertex in the painted region is rotated as a rigid body
 *    around the hinge axis by the given angle.
 * 3. Non-region vertices are never touched – the flap is "cut out"
 *    from the surrounding mesh like a tin-can lid peeling open.
 */
export function applyHookDeformation(
  vs: VertexState,
  controlPoints: CurveControlPoint[],
  settings: HookSettings,
  regionFilter?: number,
): void {
  if (controlPoints.length < 2) return;

  const pts = controlPoints.map(
    (cp) => new THREE.Vector3(cp.position[0], cp.position[1], cp.position[2]),
  );

  // Hinge line from first → last control point
  const hingeStart = pts[0].clone();
  const hingeEnd = pts[pts.length - 1].clone();
  const hingeDir = hingeEnd.clone().sub(hingeStart);
  const hingeLen = hingeDir.length();
  if (hingeLen < 1e-6) return;
  const hingeNorm = hingeDir.clone().normalize();

  // Determine flap direction (which side of hinge to unfold)
  let flapDir = resolveDirection(settings.direction);
  if (!flapDir) {
    // "auto" – pick a direction perpendicular to the hinge
    const up = new THREE.Vector3(0, 1, 0);
    flapDir = new THREE.Vector3().crossVectors(hingeNorm, up);
    if (flapDir.length() < 0.1) {
      flapDir.crossVectors(hingeNorm, new THREE.Vector3(1, 0, 0));
    }
    flapDir.normalize();
  }

  // Ensure flapDir is perpendicular to hinge axis
  flapDir.sub(hingeNorm.clone().multiplyScalar(flapDir.dot(hingeNorm))).normalize();

  const angleRad = (settings.angle * Math.PI) / 180;
  const count = vs.current.length / 3;

  // Build quaternion for uniform rigid rotation around the hinge
  const quat = new THREE.Quaternion().setFromAxisAngle(hingeNorm, angleRad);

  for (let i = 0; i < count; i++) {
    if (vs.pinned[i] || vs.edgeLocked[i]) continue;
    // Only affect vertices in the painted region (clean cut-out)
    if (regionFilter !== undefined && vs.regionId[i] !== regionFilter) continue;

    const vx = vs.current[i * 3];
    const vy = vs.current[i * 3 + 1];
    const vz = vs.current[i * 3 + 2];
    const v = new THREE.Vector3(vx, vy, vz);

    // Project onto hinge line to find the closest pivot point
    const toV = v.clone().sub(hingeStart);
    const tParam = toV.dot(hingeNorm) / hingeLen;
    const tClamped = THREE.MathUtils.clamp(tParam, 0, 1);
    const closestOnHinge = hingeStart.clone().lerp(hingeEnd, tClamped);

    // Offset from hinge
    const offset = v.clone().sub(closestOnHinge);

    // Rotate the offset around the hinge axis (rigid body – same angle for all)
    const rotatedOffset = offset.clone().applyQuaternion(quat);

    // Set new position
    vs.current[i * 3] = closestOnHinge.x + rotatedOffset.x;
    vs.current[i * 3 + 1] = closestOnHinge.y + rotatedOffset.y;
    vs.current[i * 3 + 2] = closestOnHinge.z + rotatedOffset.z;
  }

  // ── Flatten pass: project rotated region vertices onto a flat plane ──
  if (settings.flatten) {
    // Collect all affected vertex indices and compute centroid + average normal
    const affected: number[] = [];
    const centroid = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      if (vs.pinned[i] || vs.edgeLocked[i]) continue;
      if (regionFilter !== undefined && vs.regionId[i] !== regionFilter) continue;
      affected.push(i);
      centroid.x += vs.current[i * 3];
      centroid.y += vs.current[i * 3 + 1];
      centroid.z += vs.current[i * 3 + 2];
    }
    if (affected.length > 0) {
      centroid.divideScalar(affected.length);

      // Plane normal: cross product of hinge direction and the average
      // offset direction from hinge to centroid (gives the surface normal)
      const hingeToCentroid = centroid.clone().sub(hingeStart);
      // Remove hinge-parallel component
      hingeToCentroid.sub(hingeNorm.clone().multiplyScalar(hingeToCentroid.dot(hingeNorm)));
      let planeNormal: THREE.Vector3;
      if (hingeToCentroid.length() > 1e-6) {
        planeNormal = new THREE.Vector3().crossVectors(hingeNorm, hingeToCentroid.normalize()).normalize();
      } else {
        // Fallback: use world up
        planeNormal = new THREE.Vector3(0, 1, 0);
      }

      // Project each affected vertex onto the plane through the centroid
      for (const i of affected) {
        const vx = vs.current[i * 3];
        const vy = vs.current[i * 3 + 1];
        const vz = vs.current[i * 3 + 2];
        const dist = (vx - centroid.x) * planeNormal.x
                   + (vy - centroid.y) * planeNormal.y
                   + (vz - centroid.z) * planeNormal.z;
        vs.current[i * 3]     -= dist * planeNormal.x;
        vs.current[i * 3 + 1] -= dist * planeNormal.y;
        vs.current[i * 3 + 2] -= dist * planeNormal.z;
      }
    }
  }
}

/**
 * Auto-split mesh into regions using seam boundaries.
 * Uses flood-fill on the mesh adjacency graph, stopping at seam edges.
 */
export function floodFillRegions(
  vs: VertexState,
  indexArray: Uint16Array | Uint32Array,
): void {
  const count = vs.current.length / 3;

  // Build adjacency from index buffer
  const adj = new Map<number, Set<number>>();
  for (let i = 0; i < count; i++) adj.set(i, new Set());

  for (let f = 0; f < indexArray.length; f += 3) {
    const a = indexArray[f];
    const b = indexArray[f + 1];
    const c = indexArray[f + 2];
    adj.get(a)!.add(b); adj.get(a)!.add(c);
    adj.get(b)!.add(a); adj.get(b)!.add(c);
    adj.get(c)!.add(a); adj.get(c)!.add(b);
  }

  // Reset all regions
  vs.regionId.fill(-1);

  let currentRegion = 0;

  for (let start = 0; start < count; start++) {
    if (vs.regionId[start] !== -1) continue;

    // BFS flood fill
    const queue = [start];
    vs.regionId[start] = currentRegion;

    while (queue.length > 0) {
      const v = queue.shift()!;
      const neighbors = adj.get(v);
      if (!neighbors) continue;

      for (const n of neighbors) {
        if (vs.regionId[n] !== -1) continue;

        // Check if edge v→n crosses a seam
        const seamKey = v < n ? `${v}-${n}` : `${n}-${v}`;
        if (vs.seams.has(seamKey)) continue;

        vs.regionId[n] = currentRegion;
        queue.push(n);
      }
    }

    currentRegion++;
  }
}
