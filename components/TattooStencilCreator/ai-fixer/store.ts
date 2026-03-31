/* ─────────────────────────────────────────────────────────────
   AI Tattoo Unwrap – Zustand Store
   Central state management for the 7-step unwrap pipeline.
   ───────────────────────────────────────────────────────────── */

import { create } from "zustand";
import type {
  UnwrapStepId,
  StepState,
  UnwrapSourceImage,
  UnwrapOptions,
  SegmentationResult,
  DepthMapResult,
  MeshProjectionResult,
  FlattenResult,
  InpaintResult,
  StyleRestoreResult,
  StencilFinalResult,
  UnwrapPipelineState,
} from "./types";
import { DEFAULT_UNWRAP_OPTIONS } from "./types";

/* ── Helper: default step state ─────────────────────────────── */
const defaultStep = (): StepState => ({
  status: "pending",
  progress: 0,
  message: "",
});

const initialSteps = (): Record<UnwrapStepId, StepState> => ({
  idle: defaultStep(),
  segmentation: defaultStep(),
  "depth-mapping": defaultStep(),
  "mesh-projection": defaultStep(),
  "mesh-flattening": defaultStep(),
  inpainting: defaultStep(),
  "style-restore": defaultStep(),
  "stencil-finalize": defaultStep(),
  complete: defaultStep(),
  error: defaultStep(),
});

/* ── Store interface ────────────────────────────────────────── */
interface UnwrapStore extends UnwrapPipelineState {
  // Actions
  setSourceImage: (img: UnwrapSourceImage | null) => void;
  setOptions: (opts: Partial<UnwrapOptions>) => void;
  setCurrentStep: (step: UnwrapStepId) => void;
  updateStep: (id: UnwrapStepId, patch: Partial<StepState>) => void;

  // Result setters
  setSegmentation: (r: SegmentationResult | null) => void;
  setDepthMap: (r: DepthMapResult | null) => void;
  setMeshProjection: (r: MeshProjectionResult | null) => void;
  setFlatten: (r: FlattenResult | null) => void;
  setInpaint: (r: InpaintResult | null) => void;
  setStyleRestore: (r: StyleRestoreResult | null) => void;
  setStencilFinal: (r: StencilFinalResult | null) => void;

  /** Full reset back to initial state. */
  reset: () => void;
}

const initialState: UnwrapPipelineState = {
  currentStep: "idle",
  steps: initialSteps(),
  sourceImage: null,
  options: { ...DEFAULT_UNWRAP_OPTIONS },
  segmentation: null,
  depthMap: null,
  meshProjection: null,
  flatten: null,
  inpaint: null,
  styleRestore: null,
  stencilFinal: null,
};

export const useUnwrapStore = create<UnwrapStore>((set) => ({
  ...initialState,

  setSourceImage: (img) => set({ sourceImage: img }),
  setOptions: (opts) =>
    set((s) => ({ options: { ...s.options, ...opts } })),
  setCurrentStep: (step) => set({ currentStep: step }),
  updateStep: (id, patch) =>
    set((s) => ({
      steps: { ...s.steps, [id]: { ...s.steps[id], ...patch } },
    })),

  setSegmentation: (r) => set({ segmentation: r }),
  setDepthMap: (r) => set({ depthMap: r }),
  setMeshProjection: (r) => set({ meshProjection: r }),
  setFlatten: (r) => set({ flatten: r }),
  setInpaint: (r) => set({ inpaint: r }),
  setStyleRestore: (r) => set({ styleRestore: r }),
  setStencilFinal: (r) => set({ stencilFinal: r }),

  reset: () => set({ ...initialState, steps: initialSteps() }),
}));
