/* ─────────────────────────────────────────────────────────────
   Limb extraction from MediaPipe pose landmarks
   • Identifies which limbs are visible
   • Computes bounding boxes & orientation
   • Selects the "best" limb for tattoo isolation
   • Estimates surface curvature for flattening
   ───────────────────────────────────────────────────────────── */

import { POSE_LANDMARKS } from '../lib/constants';
import type { PoseLandmark, LimbRegion, LimbType, BoundingBox } from '../types';

// ── Internal types ───────────────────────────────────────────

interface LimbDefinition {
  type: LimbType;
  indices: number[];
}

// ── Configuration ────────────────────────────────────────────

const VISIBILITY_THRESHOLD = 0.5;
const PADDING_FACTOR = 0.35; // 35 % padding around the limb

const LIMB_DEFS: LimbDefinition[] = [
  {
    type: 'left_arm',
    indices: [
      POSE_LANDMARKS.LEFT_SHOULDER,
      POSE_LANDMARKS.LEFT_ELBOW,
      POSE_LANDMARKS.LEFT_WRIST,
      POSE_LANDMARKS.LEFT_PINKY,
      POSE_LANDMARKS.LEFT_INDEX,
    ],
  },
  {
    type: 'right_arm',
    indices: [
      POSE_LANDMARKS.RIGHT_SHOULDER,
      POSE_LANDMARKS.RIGHT_ELBOW,
      POSE_LANDMARKS.RIGHT_WRIST,
      POSE_LANDMARKS.RIGHT_PINKY,
      POSE_LANDMARKS.RIGHT_INDEX,
    ],
  },
  {
    type: 'left_leg',
    indices: [
      POSE_LANDMARKS.LEFT_HIP,
      POSE_LANDMARKS.LEFT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE,
    ],
  },
  {
    type: 'right_leg',
    indices: [
      POSE_LANDMARKS.RIGHT_HIP,
      POSE_LANDMARKS.RIGHT_KNEE,
      POSE_LANDMARKS.RIGHT_ANKLE,
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────

function avgVisibility(landmarks: PoseLandmark[], indices: number[]): number {
  let sum = 0;
  let count = 0;
  for (const i of indices) {
    if (i < landmarks.length) {
      sum += landmarks[i].visibility;
      count++;
    }
  }
  return count ? sum / count : 0;
}

function boundingBoxFromLandmarks(
  landmarks: PoseLandmark[],
  indices: number[],
  imgW: number,
  imgH: number,
): BoundingBox {
  let minX = 1,
    minY = 1,
    maxX = 0,
    maxY = 0;

  for (const i of indices) {
    if (i >= landmarks.length) continue;
    const lm = landmarks[i];
    if (lm.visibility < VISIBILITY_THRESHOLD) continue;
    minX = Math.min(minX, lm.x);
    minY = Math.min(minY, lm.y);
    maxX = Math.max(maxX, lm.x);
    maxY = Math.max(maxY, lm.y);
  }

  const w = maxX - minX;
  const h = maxY - minY;
  const padX = w * PADDING_FACTOR;
  const padY = h * PADDING_FACTOR;

  return {
    x: Math.round(Math.max(0, minX - padX) * imgW),
    y: Math.round(Math.max(0, minY - padY) * imgH),
    width: Math.round(Math.min(1, w + 2 * padX) * imgW),
    height: Math.round(Math.min(1, h + 2 * padY) * imgH),
  };
}

function limbAngle(landmarks: PoseLandmark[], indices: number[]): number {
  const visible = indices
    .filter((i) => i < landmarks.length && landmarks[i].visibility > VISIBILITY_THRESHOLD)
    .map((i) => landmarks[i]);
  if (visible.length < 2) return 0;

  const first = visible[0];
  const last = visible[visible.length - 1];
  return Math.atan2(last.y - first.y, last.x - first.x) * (180 / Math.PI);
}

// ── Public API ───────────────────────────────────────────────

/**
 * Extract all visible limb regions from a set of pose landmarks.
 * Results are sorted by confidence (highest first).
 */
export function extractLimbRegions(
  landmarks: PoseLandmark[],
  imageWidth: number,
  imageHeight: number,
): LimbRegion[] {
  const regions: LimbRegion[] = [];

  for (const def of LIMB_DEFS) {
    const confidence = avgVisibility(landmarks, def.indices);
    if (confidence < VISIBILITY_THRESHOLD) continue;

    const box = boundingBoxFromLandmarks(landmarks, def.indices, imageWidth, imageHeight);
    if (box.width < 30 || box.height < 30) continue;

    regions.push({
      landmarks: def.indices.filter((i) => i < landmarks.length).map((i) => landmarks[i]),
      boundingBox: box,
      limbType: def.type,
      confidence,
      angle: limbAngle(landmarks, def.indices),
    });
  }

  return regions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Pick the single best limb for stencil extraction.
 * Prefers arms (most common tattoo placement), then largest visible region.
 */
export function selectBestLimb(regions: LimbRegion[]): LimbRegion | null {
  if (!regions.length) return null;

  const arms = regions.filter((r) => r.limbType.includes('arm'));
  if (arms.length) {
    return arms.reduce((best, cur) => {
      const score = (r: LimbRegion) =>
        r.confidence * 0.6 + ((r.boundingBox.width * r.boundingBox.height) / 1e6) * 0.4;
      return score(cur) > score(best) ? cur : best;
    });
  }

  return regions[0]; // fall back to legs
}

/**
 * Rough cylindrical-surface estimate for flattening.
 * Returns the centre, radius, and axis angle of the limb cylinder.
 */
export function estimateSurfaceCurvature(
  region: LimbRegion,
  imgW: number,
  imgH: number,
): { centerX: number; centerY: number; radius: number; axisAngle: number } {
  const visible = region.landmarks.filter((lm) => lm.visibility > VISIBILITY_THRESHOLD);

  if (visible.length < 2) {
    const { x, y, width, height } = region.boundingBox;
    return { centerX: x + width / 2, centerY: y + height / 2, radius: width / 2, axisAngle: 0 };
  }

  const centerX = visible.reduce((s, lm) => s + lm.x * imgW, 0) / visible.length;
  const centerY = visible.reduce((s, lm) => s + lm.y * imgH, 0) / visible.length;
  const radius = region.boundingBox.width / 2;

  const first = visible[0];
  const last = visible[visible.length - 1];
  const axisAngle = Math.atan2(
    (last.y - first.y) * imgH,
    (last.x - first.x) * imgW,
  );

  return { centerX, centerY, radius, axisAngle };
}
