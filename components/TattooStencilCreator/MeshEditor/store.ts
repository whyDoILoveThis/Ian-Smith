/* ─────────────────────────────────────────────────────────────
   MeshEditor – zustand store
   ───────────────────────────────────────────────────────────── */
import { create } from "zustand";
import type * as THREE from "three";
import type {
  MeshEditorState,
  BrushSettings,
  MeshShape,
  SubdivisionLevel,
  SculptTool,
  OverlayMode,
  UndoEntry,
  UnwrapResult,
  VertexState,
  MeshSnapshot,
  DepthProjectionData,
  StencilSettings,
  ExportMode,
  CropRegion,
  TextureTransform,
  MeshShapeParams,
} from "./types";

const DEFAULT_BRUSH: BrushSettings = {
  radius: 0.3,
  strength: 0.4,
  falloff: 2,
};

const DEFAULT_STENCIL: StencilSettings = {
  outputSize: 2048,
  contrast: 1.0,
  lineThickness: 1.0,
  denoiseIterations: 1,
  threshold: 128,
  invert: false,
};

const DEFAULT_TEXTURE_TRANSFORM: TextureTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
};

const DEFAULT_SHAPE_PARAMS: MeshShapeParams = {
  radiusX: 1.0,
  radiusY: 1.0,
  height: 1.0,
  taper: 0,
  flatness: 0,
};

export const useMeshEditorStore = create<MeshEditorState>((set, get) => ({
  // ─ image
  imageFile: null,
  imageUrl: null,

  // ─ mesh
  meshShape: "cylinder" as MeshShape,
  subdivisionLevel: 2 as SubdivisionLevel,
  meshKey: 0,

  // ─ tool
  activeTool: "grab" as SculptTool,
  brush: { ...DEFAULT_BRUSH },

  // ─ overlay
  overlay: "none" as OverlayMode,

  // ─ vertex state
  vertexState: null,

  // ─ undo / redo
  undoStack: [] as UndoEntry[],
  redoStack: [] as UndoEntry[],

  // ─ result
  unwrapResult: null,

  // ─ solver
  liveSmoothing: true,

  // ─ compare mode
  snapshots: [],
  compareSnapshot: null,
  showCompare: false,

  // ─ depth projection
  depthProjection: null,
  autoFitApplied: false,

  // ─ AI assist
  aiAssisting: false,

  // ─ region painting
  activeRegionId: 0,

  // ─ stencil settings
  stencilSettings: { ...DEFAULT_STENCIL },

  // ─ export mode + crop
  exportMode: "screenshot" as ExportMode,
  cropRegion: null,
  isCropping: false,

  // ─ texture placement
  textureTransform: { ...DEFAULT_TEXTURE_TRANSFORM },

  // ─ mesh shape params
  meshShapeParams: { ...DEFAULT_SHAPE_PARAMS },

  /* ── actions ──────────────────────────────────────────────── */

  setImage: (file: File) => {
    const prev = get().imageUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({
      imageFile: file,
      imageUrl: URL.createObjectURL(file),
      unwrapResult: null,
      autoFitApplied: false,
    });
  },

  clearImage: () => {
    const prev = get().imageUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ imageFile: null, imageUrl: null, unwrapResult: null, autoFitApplied: false });
  },

  setMeshShape: (s: MeshShape) =>
    set((st) => ({
      meshShape: s,
      meshKey: st.meshKey + 1,
      vertexState: null,
      undoStack: [],
      redoStack: [],
      unwrapResult: null,
      autoFitApplied: false,
      snapshots: [],
      compareSnapshot: null,
    })),

  setSubdivisionLevel: (l: SubdivisionLevel) =>
    set((st) => ({
      subdivisionLevel: l,
      meshKey: st.meshKey + 1,
      vertexState: null,
      undoStack: [],
      redoStack: [],
      unwrapResult: null,
      autoFitApplied: false,
    })),

  setActiveTool: (t: SculptTool) => set({ activeTool: t }),

  setBrush: (b: Partial<BrushSettings>) =>
    set((st) => ({ brush: { ...st.brush, ...b } })),

  setOverlay: (o: OverlayMode) => set({ overlay: o }),

  initVertexState: (geo: THREE.BufferGeometry) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const count = pos.count;
    const arr = new Float32Array(pos.array.length);
    arr.set(pos.array as Float32Array);
    const original = new Float32Array(arr.length);
    original.set(arr);
    const pinned = new Array(count).fill(false) as boolean[];
    const edgeLocked = new Array(count).fill(false) as boolean[];
    const regionId = new Int8Array(count).fill(-1);
    set({
      vertexState: {
        original, current: arr, pinned, edgeLocked, regionId, symmetryAxis: null,
      } as VertexState,
      undoStack: [],
      redoStack: [],
    });
  },

  pushUndo: (label: string) => {
    const vs = get().vertexState;
    if (!vs) return;
    const snap = new Float32Array(vs.current.length);
    snap.set(vs.current);
    set((st) => ({
      undoStack: [...st.undoStack.slice(-49), {
        positions: snap,
        pinned: [...vs.pinned],
        edgeLocked: [...vs.edgeLocked],
        label,
      }],
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack, vertexState } = get();
    if (!undoStack.length || !vertexState) return;
    const entry = undoStack[undoStack.length - 1];
    const snap = new Float32Array(vertexState.current.length);
    snap.set(vertexState.current);
    const prevPinned = [...vertexState.pinned];
    const prevEdge = [...vertexState.edgeLocked];
    vertexState.current.set(entry.positions);
    vertexState.pinned = [...entry.pinned];
    vertexState.edgeLocked = [...entry.edgeLocked];
    set((st) => ({
      undoStack: st.undoStack.slice(0, -1),
      redoStack: [...st.redoStack, {
        positions: snap, pinned: prevPinned, edgeLocked: prevEdge, label: entry.label,
      }],
    }));
  },

  redo: () => {
    const { redoStack, vertexState } = get();
    if (!redoStack.length || !vertexState) return;
    const entry = redoStack[redoStack.length - 1];
    const snap = new Float32Array(vertexState.current.length);
    snap.set(vertexState.current);
    const prevPinned = [...vertexState.pinned];
    const prevEdge = [...vertexState.edgeLocked];
    vertexState.current.set(entry.positions);
    vertexState.pinned = [...entry.pinned];
    vertexState.edgeLocked = [...entry.edgeLocked];
    set((st) => ({
      redoStack: st.redoStack.slice(0, -1),
      undoStack: [...st.undoStack, {
        positions: snap, pinned: prevPinned, edgeLocked: prevEdge, label: entry.label,
      }],
    }));
  },

  resetMesh: () => {
    const vs = get().vertexState;
    if (!vs) return;
    const snap = new Float32Array(vs.current.length);
    snap.set(vs.current);
    const prevPinned = [...vs.pinned];
    const prevEdge = [...vs.edgeLocked];
    vs.current.set(vs.original);
    vs.pinned.fill(false);
    vs.edgeLocked.fill(false);
    set((st) => ({
      undoStack: [...st.undoStack, { positions: snap, pinned: prevPinned, edgeLocked: prevEdge, label: "reset" }],
      redoStack: [],
    }));
  },

  setUnwrapResult: (r: UnwrapResult | null) => set({ unwrapResult: r }),

  toggleLiveSmoothing: () => set((st) => ({ liveSmoothing: !st.liveSmoothing })),

  // ── symmetry ───────────────────────────────────────────────
  setSymmetryAxis: (axis) => {
    const vs = get().vertexState;
    if (vs) vs.symmetryAxis = axis;
    set({}); // trigger re-render
  },

  // ── snapshots ──────────────────────────────────────────────
  takeSnapshot: (label: string) => {
    const vs = get().vertexState;
    if (!vs) return;
    const positions = new Float32Array(vs.current.length);
    positions.set(vs.current);
    set((st) => ({
      snapshots: [...st.snapshots.slice(-9), {
        id: `snap-${Date.now()}`,
        positions,
        label,
        timestamp: Date.now(),
      }],
    }));
  },

  setCompareSnapshot: (s) => set({ compareSnapshot: s }),
  toggleCompare: () => set((st) => ({ showCompare: !st.showCompare })),

  // ── depth projection ───────────────────────────────────────
  setDepthProjection: (d) => set({ depthProjection: d }),
  setAutoFitApplied: (v) => set({ autoFitApplied: v }),

  // ── AI assist ──────────────────────────────────────────────
  setAiAssisting: (v) => set({ aiAssisting: v }),

  // ── region painting ────────────────────────────────────────
  setActiveRegionId: (id) => set({ activeRegionId: id }),

  // ── stencil settings ───────────────────────────────────────
  setStencilSettings: (s) => set((st) => ({ stencilSettings: { ...st.stencilSettings, ...s } })),
  // ── export mode + crop ──────────────────────────────────────
  setExportMode: (m) => set({ exportMode: m }),
  setCropRegion: (r) => set({ cropRegion: r }),
  setIsCropping: (v) => set({ isCropping: v }),
  // ── texture transform + mesh shape ──────────────────────────
  setTextureTransform: (t) => set((st) => ({ textureTransform: { ...st.textureTransform, ...t } })),
  setMeshShapeParams: (p) => set((st) => ({
    meshShapeParams: { ...st.meshShapeParams, ...p },
    meshKey: st.meshKey + 1,
  })),
}));
