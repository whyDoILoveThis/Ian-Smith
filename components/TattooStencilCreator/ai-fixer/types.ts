/* ─────────────────────────────────────────────────────────────
   AI Tattoo Unwrap – Type Definitions
   Self-contained types for the 7-step unwrap pipeline.
   ───────────────────────────────────────────────────────────── */

/** Individual pipeline step identifiers (ordered). */
export type UnwrapStepId =
  | "idle"
  | "segmentation"
  | "depth-mapping"
  | "mesh-projection"
  | "mesh-flattening"
  | "inpainting"
  | "style-restore"
  | "stencil-finalize"
  | "complete"
  | "error";

/** Human-readable metadata for each pipeline step. */
export interface UnwrapStepMeta {
  id: UnwrapStepId;
  label: string;
  description: string;
  icon: string; // emoji shorthand for the UI
}

/** Ordered step definitions. */
export const UNWRAP_STEPS: UnwrapStepMeta[] = [
  {
    id: "depth-mapping",
    label: "Map Skin Depth",
    description: "Estimate a depth/normal map of the full skin surface from the original photo.",
    icon: "🗺️",
  },
  {
    id: "mesh-projection",
    label: "Project to 3D",
    description: "Map the full photo onto a 3D mesh that follows the skin curvature.",
    icon: "🧊",
  },
  {
    id: "mesh-flattening",
    label: "Flatten Surface",
    description: "Unwrap the curved 3D surface back to a flat plane — tattoo and all.",
    icon: "📐",
  },
  {
    id: "inpainting",
    label: "Fill Gaps",
    description: "Fill holes and stretched regions left behind by the flattening process.",
    icon: "🪄",
  },
  {
    id: "style-restore",
    label: "Restore & Clean",
    description: "Normalise lighting, remove skin colour, and clean up artifacts.",
    icon: "🎨",
  },
  {
    id: "segmentation",
    label: "Extract Ink",
    description: "AI isolates just the tattoo ink from the clean, flat image — ready for stencil.",
    icon: "👁️",
  },
  {
    id: "stencil-finalize",
    label: "Stencil Output",
    description: "Convert extracted ink to clean black-and-white line art ready for tracing.",
    icon: "🖨️",
  },
];

/** Processing status for a single step. */
export type StepStatus = "pending" | "running" | "complete" | "error" | "skipped";

export interface StepState {
  status: StepStatus;
  progress: number; // 0-100
  message: string;
  error?: string;
}

/** The uploaded source image. */
export interface UnwrapSourceImage {
  file: File;
  preview: string; // object URL
  width: number;
  height: number;
}

/** Output of Step 1: Segmentation. */
export interface SegmentationResult {
  /** Tattoo-only mask (base64 PNG, white = tattoo). */
  maskBase64: string;
  /** Tattoo pixels extracted on transparent background (base64 PNG). */
  extractedBase64: string;
  /** Detected tattoo style hint for downstream steps. */
  styleHint: TattooStyleHint;
  /** Confidence score 0-1. */
  confidence: number;
}

export type TattooStyleHint =
  | "blackwork"
  | "traditional"
  | "realism"
  | "watercolor"
  | "geometric"
  | "tribal"
  | "japanese"
  | "unknown";

/** Output of Step 2: Depth mapping. */
export interface DepthMapResult {
  /** Grayscale depth map (base64 PNG, brighter = closer). */
  depthBase64: string;
  /** Surface normal map (base64 PNG, RGB encoded). */
  normalBase64: string;
  /** Estimation source method. */
  method: "midas" | "monodepth" | "gradient" | "combined";
}

/** Output of Step 3: Mesh projection. */
export interface MeshProjectionResult {
  /** Triangulated 3D mesh vertex data (serialised). */
  meshData: string; // JSON-encoded vertex/face arrays
  /** UV-mapped tattoo texture on the mesh (base64 PNG). */
  texturedMeshPreview: string;
  /** Vertex count for UI display. */
  vertexCount: number;
  /** Face count for UI display. */
  faceCount: number;
}

/** Output of Step 4: Mesh flattening. */
export interface FlattenResult {
  /** Flattened tattoo image (base64 PNG). */
  flattenedBase64: string;
  /** Distortion heatmap (base64 PNG, cool→warm = low→high distortion). */
  distortionMapBase64: string;
  /** Flatten method used. */
  method: "conformal" | "arap" | "hybrid";
  /** Max stretch ratio (1.0 = no distortion). */
  maxStretch: number;
}

/** Output of Step 5: Inpainting. */
export interface InpaintResult {
  /** Tattoo with gaps filled (base64 PNG). */
  inpaintedBase64: string;
  /** Mask of inpainted regions (base64 PNG, white = AI-generated). */
  inpaintMaskBase64: string;
  /** Percentage of total area that was inpainted. */
  fillPercent: number;
}

/** Output of Step 6: Style restore. */
export interface StyleRestoreResult {
  /** Style-refined tattoo (base64 PNG). */
  refinedBase64: string;
  /** Whether skin colour was removed. */
  skinRemoved: boolean;
  /** Whether lighting artifacts were corrected. */
  lightingCorrected: boolean;
}

/** Output of Step 7: Stencil finalization. */
export interface StencilFinalResult {
  /** Final B&W stencil (base64 PNG). */
  stencilBase64: string;
  /** Optional SVG version. */
  svgData?: string;
  /** Stencil dimensions. */
  width: number;
  height: number;
}

/** User-configurable unwrap options. */
export interface UnwrapOptions {
  /** Auto-run full pipeline or pause between steps. */
  autoRun: boolean;
  /** Target stencil style. */
  outputStyle: "line-art" | "shaded" | "dotwork";
  /** Inpainting aggressiveness 0-1. */
  inpaintStrength: number;
  /** Edge smoothing level. */
  smoothing: "none" | "light" | "medium" | "heavy";
  /** Generate SVG output. */
  generateSvg: boolean;
  /** Flatten method preference. */
  flattenMethod: "conformal" | "arap" | "auto";
}

export const DEFAULT_UNWRAP_OPTIONS: UnwrapOptions = {
  autoRun: true,
  outputStyle: "line-art",
  inpaintStrength: 0.7,
  smoothing: "medium",
  generateSvg: true,
  flattenMethod: "auto",
};

/** Complete pipeline state. */
export interface UnwrapPipelineState {
  /** Current active step. */
  currentStep: UnwrapStepId;
  /** Per-step status tracking. */
  steps: Record<UnwrapStepId, StepState>;
  /** Source image. */
  sourceImage: UnwrapSourceImage | null;
  /** Pipeline options. */
  options: UnwrapOptions;

  // Intermediate results (populated as pipeline progresses)
  segmentation: SegmentationResult | null;
  depthMap: DepthMapResult | null;
  meshProjection: MeshProjectionResult | null;
  flatten: FlattenResult | null;
  inpaint: InpaintResult | null;
  styleRestore: StyleRestoreResult | null;
  stencilFinal: StencilFinalResult | null;
}
