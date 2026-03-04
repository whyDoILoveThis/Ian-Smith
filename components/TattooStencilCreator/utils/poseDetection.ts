/* ─────────────────────────────────────────────────────────────
   Client-side pose detection via MediaPipe Tasks-Vision
   Loads WASM + model from CDN – completely free, no API key.
   ───────────────────────────────────────────────────────────── */

import { MEDIAPIPE_CDN_BASE, POSE_MODEL_URL } from '../lib/constants';
import type { PoseLandmark } from '../types';

// Singleton – initialised once, reused across calls.
let instance: any = null; // eslint-disable-line
let initialising = false;

/**
 * Boot the PoseLandmarker (GPU → CPU fallback).
 * Safe to call multiple times – only initialises once.
 */
export async function initialisePoseDetection(): Promise<void> {
  if (instance) return;

  // Prevent duplicate init when called in parallel
  if (initialising) {
    while (initialising) await new Promise((r) => setTimeout(r, 100));
    return;
  }
  initialising = true;

  const delegates = ['GPU', 'CPU'] as const;

  for (const delegate of delegates) {
    try {
      const { PoseLandmarker, FilesetResolver } = await import(
        '@mediapipe/tasks-vision'
      );
      const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_CDN_BASE);

      instance = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate },
        runningMode: 'IMAGE',
        numPoses: 1,
      });

      initialising = false;
      return; // success
    } catch {
      // try next delegate
    }
  }

  initialising = false;
  throw new Error(
    'Failed to initialise pose detection. Ensure your browser supports WebAssembly.',
  );
}

/**
 * Run pose detection on an <img> element.
 * Returns 33 pose landmarks (normalised 0-1) or `null` if no person found.
 */
export async function detectPose(
  imageElement: HTMLImageElement,
): Promise<PoseLandmark[] | null> {
  await initialisePoseDetection();
  if (!instance) return null;

  try {
    const result = instance.detect(imageElement);
    if (!result.landmarks || result.landmarks.length === 0) return null;

    return result.landmarks[0].map((lm: any) => ({
      x: lm.x as number,
      y: lm.y as number,
      z: lm.z as number,
      visibility: (lm.visibility as number) ?? 0,
    }));
  } catch (err) {
    console.error('[TattooStencil] Pose detection failed:', err);
    return null;
  }
}

/** Release WASM resources. */
export function disposePoseDetection(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
