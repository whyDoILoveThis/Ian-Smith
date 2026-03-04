/* ─────────────────────────────────────────────────────────────
   Tattoo Stencil Creator – Constants & Configuration
   ───────────────────────────────────────────────────────────── */

// ── MediaPipe CDN paths (free, no API key required) ──────────
export const MEDIAPIPE_CDN_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

export const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

// ── File validation ──────────────────────────────────────────
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export const MIN_IMAGE_DIMENSION = 200;
export const MAX_IMAGE_DIMENSION = 4096;
export const PROCESSING_MAX_DIMENSION = 1536; // PNG is ~4× larger than JPEG; keep payload under 4.5 MB

// ── MediaPipe Pose landmark indices (33-point model) ─────────
export const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

// ── Processing-step UX labels ────────────────────────────────
export const STEP_DESCRIPTIONS: Record<string, string> = {
  idle: 'Ready to process',
  uploading: 'Preparing image…',
  'detecting-pose': 'Detecting body pose…',
  'isolating-limb': 'Isolating tattoo region…',
  'awaiting-boundary': 'Draw the limb boundaries on the image…',
  processing: 'Sending to processing pipeline…',
  flattening: 'Flattening surface curvature…',
  'generating-stencil': 'Generating stencil…',
  vectorizing: 'Creating vector output…',
  complete: 'Stencil ready!',
  error: 'An error occurred',
};

// ── Knobs mapped to numeric values used in the API ───────────
export const CONTRAST_MAP = { low: 1.3, medium: 1.6, high: 2.0 } as const;
export const EDGE_THICKNESS_MAP = { thin: 1, medium: 2, thick: 3 } as const;
export const NOISE_REDUCTION_MAP = { low: 0.5, medium: 1.0, high: 2.0 } as const;
