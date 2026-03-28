/* ─────────────────────────────────────────────────────────────
   MeshEditor – human body-part mesh generators
   Parametric geometry builders that approximate real limb/torso
   shapes so tattoos can be placed on anatomically correct surfaces.
   ───────────────────────────────────────────────────────────── */
import * as THREE from "three";
import type { SubdivisionLevel, MeshShapeParams } from "./types";

function seg(base: number, level: SubdivisionLevel): number {
  return base * level;
}

// ── helpers ──────────────────────────────────────────────────

/** Create a tapered cylinder (Lathe-based) with a radius profile.
 *  When MeshShapeParams are provided, applies oval cross-section,
 *  height scaling, taper, and flatness deformations. */
function buildLatheShape(
  radiusProfile: [number, number][], // height → radius pairs (normalised 0..1 → actual)
  height: number,
  radialSegs: number,
  heightSegs: number,
  arc: number = Math.PI * 2,
  params?: MeshShapeParams,
): THREE.BufferGeometry {
  // Build a 2D profile curve for LatheGeometry
  const h = height * (params?.height ?? 1);
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= heightSegs; i++) {
    const t = i / heightSegs; // 0..1
    // Interpolate radius from the profile
    let r = lerpProfile(radiusProfile, t);
    // Apply taper: linearly reduce radius toward top
    if (params?.taper) {
      r *= 1 - params.taper * t;
    }
    points.push(new THREE.Vector2(r, (t - 0.5) * h));
  }

  const geo = new THREE.LatheGeometry(points, radialSegs, 0, arc);

  // Apply oval + flatness deformations in post
  if (params && (params.radiusX !== 1 || params.radiusY !== 1 || params.flatness > 0)) {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      const y = pos.getY(i);
      let z = pos.getZ(i);

      // Oval: scale X and Z independently
      x *= params.radiusX;
      z *= params.radiusY;

      // Flatness: flatten the negative-Z side (like palm side of forearm)
      if (params.flatness > 0 && z < 0) {
        z *= 1 - params.flatness * 0.7; // compress negative Z
      }

      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }

  geo.computeVertexNormals();
  return geo;
}

/** Linear-interpolate a radius profile at parameter t ∈ [0,1]. */
function lerpProfile(profile: [number, number][], t: number): number {
  if (profile.length === 0) return 0.5;
  if (t <= profile[0][0]) return profile[0][1];
  if (t >= profile[profile.length - 1][0]) return profile[profile.length - 1][1];

  for (let i = 1; i < profile.length; i++) {
    if (t <= profile[i][0]) {
      const prev = profile[i - 1];
      const curr = profile[i];
      const frac = (t - prev[0]) / (curr[0] - prev[0]);
      return prev[1] + (curr[1] - prev[1]) * frac;
    }
  }
  return profile[profile.length - 1][1];
}

// ── forearm ──────────────────────────────────────────────────
// Tapered cylinder: wider at elbow, slimmer at wrist, slight
// bowing outward in the middle for the muscle belly.

export function buildForearm(level: SubdivisionLevel, params?: MeshShapeParams): THREE.BufferGeometry {
  const profile: [number, number][] = [
    [0.0, 0.42],  // wrist
    [0.15, 0.48], // lower forearm
    [0.40, 0.58], // muscle belly peak
    [0.65, 0.55], // upper forearm narrows slightly
    [0.85, 0.52], // near elbow
    [1.0, 0.50],  // elbow
  ];
  return buildLatheShape(profile, 3.5, seg(64, level), seg(48, level), Math.PI * 2, params);
}

// ── upper arm ────────────────────────────────────────────────
// Wider at shoulder/deltoid, bulges for bicep, tapers at elbow.

export function buildUpperArm(level: SubdivisionLevel, params?: MeshShapeParams): THREE.BufferGeometry {
  const profile: [number, number][] = [
    [0.0, 0.48],  // elbow
    [0.20, 0.52], // lower bicep
    [0.45, 0.62], // bicep peak
    [0.65, 0.58], // upper bicep
    [0.85, 0.65], // deltoid insertion
    [1.0, 0.70],  // shoulder cap
  ];
  return buildLatheShape(profile, 3.2, seg(64, level), seg(48, level), Math.PI * 2, params);
}

// ── calf ─────────────────────────────────────────────────────
// Pronounced bulge at the gastrocnemius, slims to ankle.

export function buildCalf(level: SubdivisionLevel, params?: MeshShapeParams): THREE.BufferGeometry {
  const profile: [number, number][] = [
    [0.0, 0.38],  // ankle
    [0.12, 0.40], // lower shin
    [0.30, 0.55], // calf muscle peak
    [0.55, 0.52], // mid-calf
    [0.80, 0.48], // below knee
    [1.0, 0.46],  // knee
  ];
  return buildLatheShape(profile, 3.8, seg(64, level), seg(48, level), Math.PI * 2, params);
}

// ── thigh ────────────────────────────────────────────────────
// Large, gently tapers from hip to knee with quad bulge.

export function buildThigh(level: SubdivisionLevel, params?: MeshShapeParams): THREE.BufferGeometry {
  const profile: [number, number][] = [
    [0.0, 0.50],  // knee
    [0.20, 0.58], // lower quad
    [0.45, 0.68], // mid quad
    [0.70, 0.72], // upper quad
    [0.90, 0.74], // near hip
    [1.0, 0.72],  // hip joint
  ];
  return buildLatheShape(profile, 4.0, seg(64, level), seg(48, level), Math.PI * 2, params);
}

// ── shoulder ─────────────────────────────────────────────────
// Hemisphere/dome shape for deltoid/shoulder cap.

export function buildShoulder(level: SubdivisionLevel, params?: MeshShapeParams): THREE.BufferGeometry {
  const s = seg(48, level);
  const geo = new THREE.SphereGeometry(1.2, s, s, 0, Math.PI * 2, 0, Math.PI * 0.55);
  if (params) {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        pos.getX(i) * params.radiusX,
        pos.getY(i) * params.height,
        pos.getZ(i) * params.radiusY,
      );
    }
    pos.needsUpdate = true;
  }
  geo.computeVertexNormals();
  return geo;
}

// ── chest ────────────────────────────────────────────────────
// Curved plane that approximates pectoral region – slight barrel curve.

export function buildChest(level: SubdivisionLevel, params?: MeshShapeParams): THREE.BufferGeometry {
  const segsX = seg(48, level);
  const segsY = seg(48, level);
  const sx = params?.radiusX ?? 1;
  const sy = params?.height ?? 1;
  const geo = new THREE.PlaneGeometry(4 * sx, 3 * sy, segsX, segsY);

  // Barrel-curve: push vertices along Z based on their X distance from center
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Barrel: cosine curve so sides wrap back
    const xNorm = x / 2; // -1..1
    const yNorm = y / 1.5;
    const z = 0.6 * Math.cos(xNorm * Math.PI * 0.45) + 0.15 * Math.cos(yNorm * Math.PI * 0.3);
    pos.setZ(i, z);
  }

  geo.computeVertexNormals();
  return geo;
}

// ── back ─────────────────────────────────────────────────────
// Wider curved plane with slight spine-valley in the middle.

export function buildBack(level: SubdivisionLevel, params?: MeshShapeParams): THREE.BufferGeometry {
  const segsX = seg(48, level);
  const segsY = seg(64, level);
  const sx = params?.radiusX ?? 1;
  const sy = params?.height ?? 1;
  const geo = new THREE.PlaneGeometry(4.5 * sx, 5 * sy, segsX, segsY);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const xNorm = x / 2.25;
    const yNorm = y / 2.5;
    // General barrel curvature
    let z = 0.5 * Math.cos(xNorm * Math.PI * 0.4);
    // Spine valley (dip in the middle)
    z -= 0.12 * Math.exp(-xNorm * xNorm * 8);
    // Slight shoulder-blade bumps
    z += 0.08 * Math.exp(-((xNorm - 0.5) ** 2 + (yNorm - 0.4) ** 2) * 6);
    z += 0.08 * Math.exp(-((xNorm + 0.5) ** 2 + (yNorm - 0.4) ** 2) * 6);
    pos.setZ(i, z);
  }

  geo.computeVertexNormals();
  return geo;
}

// ── dispatcher ───────────────────────────────────────────────

export function buildBodyMesh(
  shape: string,
  level: SubdivisionLevel,
  params?: MeshShapeParams,
): THREE.BufferGeometry | null {
  switch (shape) {
    case "forearm": return buildForearm(level, params);
    case "upper-arm": return buildUpperArm(level, params);
    case "calf": return buildCalf(level, params);
    case "thigh": return buildThigh(level, params);
    case "shoulder": return buildShoulder(level, params);
    case "chest": return buildChest(level, params);
    case "back": return buildBack(level, params);
    default: return null;
  }
}
