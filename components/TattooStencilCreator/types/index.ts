/* ─────────────────────────────────────────────────────────────
   Tattoo Stencil Creator – Shared Type Definitions
   ───────────────────────────────────────────────────────────── */

/** A single MediaPipe pose landmark (normalised 0-1). */
export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

/** Pixel-based bounding box. */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LimbType = 'left_arm' | 'right_arm' | 'left_leg' | 'right_leg';

/** A detected limb region with associated metadata. */
export interface LimbRegion {
  landmarks: PoseLandmark[];
  boundingBox: BoundingBox;
  limbType: LimbType;
  confidence: number;
  /** Rotation angle of the limb axis in degrees. */
  angle: number;
}

/** Debug info returned when cylindrical unwrap was applied. */
export interface UnwrapDebug {
  applied: boolean;
  source: 'boundary' | 'landmarks' | 'none';
  /** Cylinder centre in pixel coords (post-resize image space). */
  centerX?: number;
  centerY?: number;
  /** Effective radius in pixels (after curvatureStrength). */
  radius?: number;
  /** Cylinder axis angle in radians. */
  angle?: number;
  /** Image dimensions the unwrap operated on. */
  imageW?: number;
  imageH?: number;
}

/** The final stencil output returned by the API. */
export interface StencilResult {
  pngBase64: string;
  svgData?: string;
  /** Grayscale image before stencilization, for before/after comparisons. */
  preStencilBase64?: string;
  metadata: {
    originalWidth: number;
    originalHeight: number;
    stencilWidth: number;
    stencilHeight: number;
    limbDetected: boolean;
    limbType?: string;
    processingTimeMs: number;
    unwrapDebug?: UnwrapDebug;
  };
}

/** Granular processing steps visible to the user. */
export type ProcessingStep =
  | 'idle'
  | 'uploading'
  | 'detecting-pose'
  | 'isolating-limb'
  | 'awaiting-boundary'
  | 'processing'
  | 'flattening'
  | 'generating-stencil'
  | 'vectorizing'
  | 'complete'
  | 'error';

export interface ProcessingState {
  step: ProcessingStep;
  progress: number; // 0-100
  message: string;
  error?: string;
}

/** Client-side representation of the uploaded image. */
export interface UploadedImage {
  file: File;
  preview: string;
  width: number;
  height: number;
}

/** User-configurable processing parameters. */
export interface StencilOptions {
  generateSvg: boolean;
  contrastLevel: 'low' | 'medium' | 'high';
  edgeThickness: 'thin' | 'medium' | 'thick';
  noiseReduction: 'low' | 'medium' | 'high';
  /**
   * Multiplier applied to the derived cylinder radius.
   * 1.0 = standard cylindrical model.
   * <1.0 = stronger correction (thinner arm / telephoto).
   * >1.0 = weaker correction (thicker arm / wide-angle).
   */
  curvatureStrength: number;
}

/**
 * User-drawn wrap boundary — explicit human input that defines
 * the cylindrical surface of the limb the tattoo wraps around.
 *
 * All coordinates are normalised 0-1 relative to the uploaded image
 * (NOT pixel values) so they survive client-side resize / compression.
 *
 *   axisStart / axisEnd — the centre-line of the limb (from joint
 *       to joint, e.g. elbow → wrist). Defines the cylinder's axis.
 *
 *   leftEdge / rightEdge — the visible left and right silhouette
 *       edges of the limb *at the widest point*.  The perpendicular
 *       distance from the axis to each edge is used to compute radius.
 */
export interface WrapBoundary {
  /** Top of limb axis (normalised 0-1). */
  axisStart: { x: number; y: number };
  /** Bottom of limb axis (normalised 0-1). */
  axisEnd: { x: number; y: number };
  /** Left silhouette edge at widest point (normalised 0-1). */
  leftEdge: { x: number; y: number };
  /** Right silhouette edge at widest point (normalised 0-1). */
  rightEdge: { x: number; y: number };
}

/** Payload sent to POST /api/tattoo-stencil */
export interface StencilApiPayload {
  imageBase64: string;
  limbRegion?: LimbRegion;
  wrapBoundary?: WrapBoundary;
  options: StencilOptions;
}

/** Response from POST /api/tattoo-stencil */
export interface StencilApiResponse {
  success: boolean;
  data?: StencilResult;
  error?: string;
}

/** Sensible defaults. */
export const DEFAULT_STENCIL_OPTIONS: StencilOptions = {
  generateSvg: true,
  contrastLevel: 'medium',
  edgeThickness: 'medium',
  noiseReduction: 'medium',
  curvatureStrength: 1.0,
};
