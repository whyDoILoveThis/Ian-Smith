/* ─────────────────────────────────────────────────────────────
   AI Tattoo Unwrap – Browser-side ML Model Loader
   
   Shared singleton loader for @huggingface/transformers models.
   Models download once and cache in browser IndexedDB/Cache API.
   
   Supported tasks:
     • depth-estimation  — Depth-Anything-V2-Small (pipeline API)
     • background-removal — RMBG-2.0 (AutoModel + AutoProcessor)
     
   All imports from @huggingface/transformers are dynamic so
   Next.js webpack doesn't try to resolve ONNX/WASM at build time.
   ───────────────────────────────────────────────────────────── */

/* ── Model registry ─────────────────────────────────────────── */

export const MODELS = {
  depth: {
    task: "depth-estimation",
    model: "onnx-community/depth-anything-v2-small",
    label: "Depth-Anything-V2-Small (~100 MB)",
  },
  segmentation: {
    task: "background-removal",
    model: "briaai/RMBG-1.4",
    label: "RMBG-1.4 (~170 MB)",
  },
} as const;

export type ModelKey = keyof typeof MODELS;

/* ── Lazy-loaded transformers module ────────────────────────── */

interface HFTransformers {
  env: { allowLocalModels: boolean; allowRemoteModels: boolean };
  pipeline: (task: string, model: string, opts?: Record<string, unknown>) => Promise<unknown>;
  AutoModel: { from_pretrained: (model: string, opts?: Record<string, unknown>) => Promise<unknown> };
  AutoProcessor: { from_pretrained: (model: string, opts?: Record<string, unknown>) => Promise<unknown> };
  RawImage: {
    fromURL: (url: string) => Promise<unknown>;
    fromTensor: (tensor: unknown) => unknown;
  };
}

let _transformers: HFTransformers | null = null;

async function getTransformers(): Promise<HFTransformers> {
  if (!_transformers) {
    _transformers = await import(
      "@huggingface/transformers"
    ) as unknown as HFTransformers;
    _transformers.env.allowLocalModels = false;
    _transformers.env.allowRemoteModels = true;
  }
  return _transformers;
}

/** Re-export RawImage lazily for components that need it. */
export async function getRawImage() {
  const t = await getTransformers();
  return t.RawImage;
}

/* ── Singleton cache ────────────────────────────────────────── */

const instances = new Map<ModelKey, unknown>();
const loading = new Map<ModelKey, Promise<unknown>>();

export type ProgressCallback = (info: {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}) => void;

/**
 * Get or create a pipeline instance for the given model key.
 * First call downloads the model; subsequent calls return the cached instance.
 */
export async function getModel(
  key: ModelKey,
  onProgress?: ProgressCallback,
) {
  // Return cached instance
  if (instances.has(key)) return instances.get(key)!;

  // Return in-flight promise if already loading
  if (loading.has(key)) return loading.get(key)!;

  const t = await getTransformers();
  const { task, model } = MODELS[key];

  const promise = t.pipeline(task, model, {
    progress_callback: onProgress,
    dtype: "fp32",
  }).then((pipe: unknown) => {
    instances.set(key, pipe);
    loading.delete(key);
    return pipe;
  });

  loading.set(key, promise);
  return promise;
}

/**
 * Check if a model is already loaded (cached in memory).
 */
export function isModelLoaded(key: ModelKey): boolean {
  return instances.has(key);
}

/**
 * Dispose a loaded model to free memory.
 */
export async function disposeModel(key: ModelKey) {
  const inst = instances.get(key) as { dispose?: () => Promise<void> } | undefined;
  if (inst?.dispose) await inst.dispose();
  instances.delete(key);
}

/* ── RMBG-2.0 segmentation (AutoModel + AutoProcessor) ─────── */

interface SegmentationPair {
  model: unknown;
  processor: unknown;
}

let _segPair: SegmentationPair | null = null;
let _segLoading: Promise<SegmentationPair> | null = null;

/**
 * Load RMBG-2.0 model + processor for background removal.
 * Uses AutoModel/AutoProcessor since RMBG-2.0 isn't supported
 * by the pipeline() API.
 */
export async function getSegmentationModel(
  onProgress?: ProgressCallback,
): Promise<SegmentationPair> {
  if (_segPair) return _segPair;
  if (_segLoading) return _segLoading;

  const t = await getTransformers();
  const modelId = MODELS.segmentation.model;

  _segLoading = Promise.all([
    t.AutoModel.from_pretrained(modelId, {
      dtype: "fp32",
      progress_callback: onProgress,
    }),
    t.AutoProcessor.from_pretrained(modelId, {
      progress_callback: onProgress,
    }),
  ]).then(([model, processor]) => {
    _segPair = { model, processor };
    _segLoading = null;
    return _segPair;
  });

  return _segLoading;
}
