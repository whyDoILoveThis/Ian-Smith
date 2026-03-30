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
  CurveControlPoint,
  CurveDirection,
  HookSettings,
  SilhouetteSettings,
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
  denoiseIterations: 0,
  threshold: 128,
  invert: false,
  edgeDetect: true,
  smoothing: 1,
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

const DEFAULT_SILHOUETTE: SilhouetteSettings = {
  enabled: false,
  opacity: 0.4,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
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
  liveSmoothing: false,

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
  regionFilterEnabled: false,
  workingRegionId: 0,
  showRegionOverlay: false,
  regionEraseMode: false,

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

  // ─ sync trigger
  syncTrigger: 0,

  // ─ curve deformer
  curvePoints: [] as CurveControlPoint[],
  curveInfluenceRadius: 2.0,
  curveDirection: "auto" as CurveDirection,

  // ─ hook deformer
  hookPoints: [] as CurveControlPoint[],
  hookSettings: { angle: 180, direction: "auto" as CurveDirection, influenceRadius: 2.0, flatten: false } as HookSettings,
  flapActive: false,
  flapSnapshot: null as Float32Array | null,

  // ─ silhouette overlay
  silhouette: { ...DEFAULT_SILHOUETTE },

  // ─ scene settings
  showGrid: true,
  lightIntensity: 1.0,

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
    const seams = new Set<string>();
    set({
      vertexState: {
        original, current: arr, pinned, edgeLocked, regionId, symmetryAxis: null, seams,
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
  setRegionFilterEnabled: (v) => set({ regionFilterEnabled: v }),
  setWorkingRegionId: (id) => set({ workingRegionId: id }),
  setShowRegionOverlay: (v) => set({ showRegionOverlay: v }),
  setRegionEraseMode: (v) => set({ regionEraseMode: v }),
  clearRegion: (regionId) => {
    const vs = get().vertexState;
    if (!vs) return;
    const count = vs.current.length / 3;
    for (let i = 0; i < count; i++) {
      if (vs.regionId[i] === regionId) vs.regionId[i] = -1;
    }
    set((st) => ({ syncTrigger: st.syncTrigger + 1 }));
  },
  clearAllRegions: () => {
    const vs = get().vertexState;
    if (!vs) return;
    vs.regionId.fill(-1);
    set((st) => ({ syncTrigger: st.syncTrigger + 1 }));
  },

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
  // ── curve deformer ────────────────────────────────────────────
  setCurvePoints: (pts) => set({ curvePoints: pts }),
  addCurvePoint: (pt) => set((st) => ({ curvePoints: [...st.curvePoints, pt] })),
  removeCurvePoint: (id) => set((st) => ({ curvePoints: st.curvePoints.filter((p) => p.id !== id) })),
  updateCurvePoint: (id, position) => set((st) => ({
    curvePoints: st.curvePoints.map((p) => p.id === id ? { ...p, position } : p),
  })),
  setCurveInfluenceRadius: (r) => set({ curveInfluenceRadius: r }),
  setCurveDirection: (d) => set({ curveDirection: d }),
  applyCurveDeform: () => {
    const { vertexState: vs, curvePoints, curveInfluenceRadius, curveDirection } = get();
    if (!vs || curvePoints.length < 2) return;
    // push undo before applying
    const snap = new Float32Array(vs.current.length);
    snap.set(vs.current);
    set((st) => ({
      undoStack: [...st.undoStack.slice(-49), {
        positions: snap,
        pinned: [...vs.pinned],
        edgeLocked: [...vs.edgeLocked],
        label: "curve-deform",
      }],
      redoStack: [],
    }));
    // lazy import to avoid circular
    import("./curveDeformer").then(({ applyCurveDeformation }) => {
      applyCurveDeformation(vs, curvePoints, curveInfluenceRadius, curveDirection);
      // Increment syncTrigger so DeformableMesh syncs the buffer (without rebuilding geometry)
      set((st) => ({ syncTrigger: st.syncTrigger + 1 }));
    });
  },
  clearCurvePoints: () => set({ curvePoints: [] }),
  // ── hook deformer ───────────────────────────────────────────
  setHookPoints: (pts) => set({ hookPoints: pts }),
  addHookPoint: (pt) => set((st) => ({ hookPoints: [...st.hookPoints, pt] })),
  clearHookPoints: () => set({ hookPoints: [], flapActive: false, flapSnapshot: null }),
  setHookSettings: (s) => {
    set((st) => ({ hookSettings: { ...st.hookSettings, ...s } }));
    // Live-update when flap is active
    const { flapActive, flapSnapshot, vertexState: vs, hookPoints, regionFilterEnabled, workingRegionId } = get();
    if (flapActive && flapSnapshot && vs && hookPoints.length >= 2) {
      vs.current.set(flapSnapshot);
      const regionFilter = regionFilterEnabled ? workingRegionId : undefined;
      const { hookSettings: latest } = get();
      import("./curveDeformer").then(({ applyHookDeformation }) => {
        applyHookDeformation(vs, hookPoints, latest, regionFilter);
        set((st) => ({ syncTrigger: st.syncTrigger + 1 }));
      });
    }
  },
  toggleFlap: () => {
    const { flapActive, flapSnapshot, vertexState: vs, hookPoints, hookSettings, regionFilterEnabled, workingRegionId } = get();
    if (!vs) return;
    if (!flapActive) {
      // Turning ON: save snapshot then apply
      if (hookPoints.length < 2) return;
      const snap = new Float32Array(vs.current.length);
      snap.set(vs.current);
      set((st) => ({
        flapActive: true,
        flapSnapshot: snap,
        undoStack: [...st.undoStack.slice(-49), {
          positions: snap,
          pinned: [...vs.pinned],
          edgeLocked: [...vs.edgeLocked],
          label: "flap",
        }],
        redoStack: [],
      }));
      const regionFilter = regionFilterEnabled ? workingRegionId : undefined;
      import("./curveDeformer").then(({ applyHookDeformation }) => {
        applyHookDeformation(vs, hookPoints, hookSettings, regionFilter);
        set((st) => ({ syncTrigger: st.syncTrigger + 1 }));
      });
    } else {
      // Turning OFF: restore snapshot
      if (flapSnapshot) {
        vs.current.set(flapSnapshot);
      }
      set((st) => ({ flapActive: false, flapSnapshot: null, syncTrigger: st.syncTrigger + 1 }));
    }
  },
  // ── scene settings ────────────────────────────────────────
  setShowGrid: (v) => set({ showGrid: v }),
  setLightIntensity: (v) => set({ lightIntensity: v }),
  // ── silhouette overlay ─────────────────────────────────────
  setSilhouette: (s) => set((st) => ({ silhouette: { ...st.silhouette, ...s } })),
  // ── seam / region auto-split ───────────────────────────────
  autoSplitRegions: () => {
    // Implemented via DeformableMesh geometry access (see CurveDeformerOverlay)
    set({}); // placeholder trigger
  },
}));
