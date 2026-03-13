/* ─────────────────────────────────────────────────────────────
   Tattoo Stencil Creator – Shared Type Definitions
   ───────────────────────────────────────────────────────────── */

/** A 2D point, normalised 0-1 relative to the image. */
export interface Point2D {
  x: number;
  y: number;
}

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

/**
 * Polygon outline of the limb boundary.
 * Ordered vertices (normalised 0-1). Minimum 3 points.
 * Used to derive cylinder parameters via PCA.
 */
export interface LimbOutline {
  points: Point2D[];
}

/**
 * User-painted mask highlighting the tattoo.
 * base64 PNG where white = tattoo ink area, black = skin.
 * Dimensions are the display canvas size (server resizes to match).
 */
export interface TattooHighlight {
  maskBase64: string;
  width: number;
  height: number;
}

/**
 * User-painted mask highlighting curved areas that need flattening.
 * base64 PNG where white = curved area, black = flat.
 * curvaturePercent: 0-100 how aggressively to unwrap (100 = maximum).
 */
export interface CurveHighlight {
  maskBase64: string;
  width: number;
  height: number;
  curvaturePercent: number;
  /** Cylinder axis angle in degrees (0 = horizontal →, 90 = vertical ↑). */
  angleDeg: number;
}

/** Debug info returned when cylindrical unwrap was applied. */
export interface UnwrapDebug {
  applied: boolean;
  source: 'outline' | 'landmarks' | 'curve-mask' | 'none';
  centerX?: number;
  centerY?: number;
  radius?: number;
  angle?: number;
  imageW?: number;
  imageH?: number;
  halfLength?: number;
  outlinePoints?: { x: number; y: number }[];
  tattooHighlightBase64?: string;
  curveHighlightBase64?: string;
  curvaturePercent?: number;
}

/** The final stencil output returned by the API. */
export interface StencilResult {
  pngBase64: string;
  svgData?: string;
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
    /** Info about the ink/skin separation approach used. */
    separationMethod?: 'supervised' | 'unsupervised';
  };
}

/** Granular processing steps visible to the user. */
export type ProcessingStep =
  | 'idle'
  | 'uploading'
  | 'detecting-pose'
  | 'isolating-limb'
  | 'awaiting-regions'
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
  curvatureStrength: number;
}

/**
 * @deprecated Use LimbOutline (polygon) instead.
 */
export interface WrapBoundary {
  axisStart: { x: number; y: number };
  axisEnd: { x: number; y: number };
  leftEdge: { x: number; y: number };
  rightEdge: { x: number; y: number };
}

/** Payload sent to POST /api/tattoo-stencil */
export interface StencilApiPayload {
  imageBase64: string;
  limbRegion?: LimbRegion;
  limbOutline?: LimbOutline;
  tattooHighlight?: TattooHighlight;
  curveHighlight?: CurveHighlight;
  options: StencilOptions;
}

/** Response from POST /api/tattoo-stencil */
export interface StencilApiResponse {
  success: boolean;
  data?: StencilResult;
  error?: string;
}

/**
 * Combined output from the RegionEditor component.
 * Holds the limb outline polygon, the tattoo highlight mask,
 * and an optional curve highlight mask with curvature %.
 */
export interface RegionEditorResult {
  limbOutline: LimbOutline | null;
  tattooHighlight: TattooHighlight | null;
  curveHighlight: CurveHighlight | null;
}

/** Sensible defaults. */
export const DEFAULT_STENCIL_OPTIONS: StencilOptions = {
  generateSvg: true,
  contrastLevel: 'medium',
  edgeThickness: 'medium',
  noiseReduction: 'medium',
  curvatureStrength: 1.0,
};

/** Payload for POST /api/tattoo-stencil-repair */
export interface StencilRepairPayload {
  mode: 'analyze' | 'repair';
  stencilBase64: string;
  /** Required for 'repair' mode — green = reference (good) area. */
  referenceMaskBase64?: string;
}

/** Response from POST /api/tattoo-stencil-repair */
export interface StencilRepairResponse {
  success: boolean;
  /** Returned for 'analyze' mode — AI-detected good side. */
  analysis?: {
    goodSide: 'left' | 'right' | 'top' | 'bottom';
    confidence: number;
  };
  /** Returned for 'repair' mode — the fixed stencil PNG. */
  repairedBase64?: string;
  error?: string;
}
