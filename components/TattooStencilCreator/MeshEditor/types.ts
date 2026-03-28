/* ─────────────────────────────────────────────────────────────
   MeshEditor – shared type definitions
   ───────────────────────────────────────────────────────────── */
import type * as THREE from "three";

// ── Mesh primitive shapes ────────────────────────────────────

export type MeshShape =
  | "cylinder" | "plane" | "sphere" | "half-cylinder" | "custom"
  // body-part presets
  | "forearm" | "upper-arm" | "calf" | "thigh"
  | "shoulder" | "chest" | "back";

/** Subdivision level – controls polygon density. */
export type SubdivisionLevel = 1 | 2 | 3 | 4;

// ── Texture placement (UV transform) ────────────────────────

export interface TextureTransform {
  offsetX: number;  // -1..1
  offsetY: number;  // -1..1
  scale: number;    // 0.1..5
  rotation: number; // radians
}

// ── Mesh shape parameters (adjustable per-shape) ─────────────

export interface MeshShapeParams {
  /** Horizontal radius / width scale. */
  radiusX: number;
  /** Vertical radius / depth scale (makes oval cross-sections). */
  radiusY: number;
  /** Overall height / length. */
  height: number;
  /** Taper: 0 = no taper, 1 = full taper (top smaller). */
  taper: number;
  /** Palm-side flatness: 0 = round, 1 = flat on one side (forearm). */
  flatness: number;
}

// ── Sculpt / brush tools ─────────────────────────────────────

export type SculptTool =
  | "grab"       // direct vertex dragging
  | "push"       // inflate / push outward
  | "pull"       // dent / pull inward
  | "smooth"     // relax vertices
  | "flatten"    // flatten to local plane
  | "pin"        // lock vertices
  | "warp"       // directional stretch
  | "edge"       // edge constraint (locks boundary)
  | "unpin"      // unlock pinned vertices
  | "bend"       // bend / unbend along arc axis
  | "twist"      // twist vertices around a local axis
  | "region";    // paint region IDs for multi-region deform

// ── Overlay visualisations ───────────────────────────────────

export type OverlayMode =
  | "none"
  | "distortion"  // heatmap of area distortion
  | "stretch"     // stretch direction arrows
  | "depth"       // depth visualisation
  | "curvature"   // curvature map
  | "pins";       // shows pinned vertices

// ── Vertex data ──────────────────────────────────────────────

export interface VertexState {
  /** Original (undeformed) positions – Float32Array of xyz triples. */
  original: Float32Array;
  /** Current (deformed) positions – same layout. */
  current: Float32Array;
  /** Per-vertex pin mask – true = locked. */
  pinned: boolean[];
  /** Per-vertex edge constraint – true = on a locked boundary. */
  edgeLocked: boolean[];
  /** Per-vertex region ID for multi-region support (-1 = unassigned). */
  regionId: Int8Array;
  /** Symmetry axis: null = off, otherwise mirror plane normal. */
  symmetryAxis: "x" | "y" | "z" | null;
}

// ── Brush settings ───────────────────────────────────────────

export interface BrushSettings {
  /** Radius in world units (0.01 – 2.0). */
  radius: number;
  /** Strength / intensity (0.01 – 1.0). */
  strength: number;
  /** Soft-selection falloff exponent (1 = linear, 2 = smooth). */
  falloff: number;
}

// ── Undo entry ───────────────────────────────────────────────

export interface UndoEntry {
  positions: Float32Array;
  pinned: boolean[];
  edgeLocked: boolean[];
  label: string;
}

// ── UV-unwrap result ─────────────────────────────────────────

export interface UnwrapResult {
  /** Flattened 2D texture as base-64 PNG (the stencil). */
  stencilBase64: string;
  width: number;
  height: number;
  /** ARAP distortion stats. */
  avgDistortion?: number;
  maxDistortion?: number;
}

// ── Stencil post-processing settings ─────────────────────────

export interface StencilSettings {
  /** Output resolution in pixels (1024–4096). */
  outputSize: number;
  /** Contrast 0..2 (1 = neutral). */
  contrast: number;
  /** Line thickness multiplier 0.5–3.0 (1 = default). */
  lineThickness: number;
  /** Noise / artifact removal passes 0–5. */
  denoiseIterations: number;
  /** Black/white threshold 0–255 (128 = default). */
  threshold: number;
  /** Whether to invert (white lines on black). */
  invert: boolean;
}

// ── Export mode ──────────────────────────────────────────────

export type ExportMode = "screenshot" | "unwrap";

/** Normalised crop rectangle (0–1 relative to canvas size). */
export interface CropRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ── Snapshot for compare mode ────────────────────────────────

export interface MeshSnapshot {
  id: string;
  positions: Float32Array;
  label: string;
  timestamp: number;
}

// ── Depth-map data (reused from existing pipeline) ───────────

export interface DepthProjectionData {
  /** Raw RGBA pixel data from the depth map image. */
  depthData: Uint8ClampedArray;
  width: number;
  height: number;
  /** Displacement strength (0..1). */
  strength: number;
}

// ── Store state ──────────────────────────────────────────────

export interface MeshEditorState {
  // ─ image
  imageFile: File | null;
  imageUrl: string | null;

  // ─ mesh
  meshShape: MeshShape;
  subdivisionLevel: SubdivisionLevel;
  /** Key that forces remount when shape changes. */
  meshKey: number;

  // ─ tool
  activeTool: SculptTool;
  brush: BrushSettings;

  // ─ overlay
  overlay: OverlayMode;

  // ─ vertex state (managed outside React state for perf)
  vertexState: VertexState | null;

  // ─ undo / redo
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];

  // ─ result
  unwrapResult: UnwrapResult | null;

  // ─ Laplacian solver toggle
  liveSmoothing: boolean;

  // ─ compare mode
  snapshots: MeshSnapshot[];
  compareSnapshot: MeshSnapshot | null;
  showCompare: boolean;

  // ─ depth projection
  depthProjection: DepthProjectionData | null;
  autoFitApplied: boolean;

  // ─ AI assist
  aiAssisting: boolean;

  // ─ region painting
  activeRegionId: number;

  // ─ stencil post-processing
  stencilSettings: StencilSettings;

  // ─ export mode + crop
  exportMode: ExportMode;
  cropRegion: CropRegion | null;
  isCropping: boolean;

  // ─ texture placement
  textureTransform: TextureTransform;

  // ─ mesh shape params
  meshShapeParams: MeshShapeParams;

  // ─ actions
  setImage: (file: File) => void;
  clearImage: () => void;
  setMeshShape: (s: MeshShape) => void;
  setSubdivisionLevel: (l: SubdivisionLevel) => void;
  setActiveTool: (t: SculptTool) => void;
  setBrush: (b: Partial<BrushSettings>) => void;
  setOverlay: (o: OverlayMode) => void;
  initVertexState: (geo: THREE.BufferGeometry) => void;
  pushUndo: (label: string) => void;
  undo: () => void;
  redo: () => void;
  resetMesh: () => void;
  setUnwrapResult: (r: UnwrapResult | null) => void;
  toggleLiveSmoothing: () => void;
  // symmetry
  setSymmetryAxis: (axis: "x" | "y" | "z" | null) => void;
  // snapshots
  takeSnapshot: (label: string) => void;
  setCompareSnapshot: (s: MeshSnapshot | null) => void;
  toggleCompare: () => void;
  // depth
  setDepthProjection: (d: DepthProjectionData | null) => void;
  setAutoFitApplied: (v: boolean) => void;
  // ai
  setAiAssisting: (v: boolean) => void;
  // region
  setActiveRegionId: (id: number) => void;
  // stencil settings
  setStencilSettings: (s: Partial<StencilSettings>) => void;
  // export mode + crop
  setExportMode: (m: ExportMode) => void;
  setCropRegion: (r: CropRegion | null) => void;
  setIsCropping: (v: boolean) => void;
  // texture placement
  setTextureTransform: (t: Partial<TextureTransform>) => void;
  // mesh shape params
  setMeshShapeParams: (p: Partial<MeshShapeParams>) => void;
}
