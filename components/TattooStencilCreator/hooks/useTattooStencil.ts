/* ─────────────────────────────────────────────────────────────
   useTattooStencil – orchestration hook
   Manages the full upload → detect → process → result flow.
   ───────────────────────────────────────────────────────────── */
'use client';

import { useCallback, useRef, useState } from 'react';

import type {
  DepthMapData,
  LimbRegion,
  ProcessingState,
  ProcessingStep,
  RegionEditorResult,
  StencilApiResponse,
  StencilOptions,
  StencilResult,
  UploadedImage,
} from '../types';
import { DEFAULT_STENCIL_OPTIONS } from '../types';

import {
  compressImageForUpload,
  createImageElement,
  loadImageDimensions,
  validateImageDimensions,
  validateImageFile,
} from '../utils/imageProcessing';
import { detectPose, disposePoseDetection } from '../utils/poseDetection';
import { extractLimbRegions, selectBestLimb } from '../utils/limbExtraction';
import { estimateDepthMap } from '../utils/depthEstimation';
import { STEP_DESCRIPTIONS } from '../lib/constants';

// ── State factory ────────────────────────────────────────────

const idle: ProcessingState = {
  step: 'idle',
  progress: 0,
  message: STEP_DESCRIPTIONS.idle,
};

// ── Hook ─────────────────────────────────────────────────────

export function useTattooStencil() {
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>(idle);
  const [result, setResult] = useState<StencilResult | null>(null);
  const [options, setOptions] = useState<StencilOptions>(DEFAULT_STENCIL_OPTIONS);
  const [regionResult, setRegionResult] = useState<RegionEditorResult | null>(null);
  const [depthMap, setDepthMap] = useState<DepthMapData | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Derived: are we waiting for the user to draw regions?
  const awaitingRegions = processing.step === 'awaiting-regions';

  // ── Internal helpers ─────────────────────────────────────

  const step = useCallback(
    (s: ProcessingStep, progress: number, extra?: Partial<ProcessingState>) =>
      setProcessing({
        step: s,
        progress,
        message: STEP_DESCRIPTIONS[s] ?? '',
        ...extra,
      }),
    [],
  );

  const fail = useCallback(
    (msg: string) =>
      setProcessing({ step: 'error', progress: 0, message: msg, error: msg }),
    [],
  );

  // ── Upload handler (called from TattooUploader) ──────────

  const handleUpload = useCallback(
    async (file: File) => {
      // validate
      const fileErr = validateImageFile(file);
      if (fileErr) { fail(fileErr); return; }

      const dims = await loadImageDimensions(file);
      const dimErr = validateImageDimensions(dims.width, dims.height);
      if (dimErr) { fail(dimErr); return; }

      const preview = URL.createObjectURL(file);
      setImage({ file, preview, ...dims });
      setResult(null);
      setProcessing(idle);
    },
    [fail],
  );

  // ── Process pipeline ─────────────────────────────────────
  //
  // Phase 1: pose detect → pause at 'awaiting-regions' so the
  //          user can draw regions on the image.
  // Phase 2: after region confirm → compress → API call.

  /** Phase 1 — called when user clicks "Generate Stencil".
   *  Runs pose detection, then pauses for boundary input. */
  const processImage = useCallback(async () => {
    if (!image) { fail('No image selected.'); return; }

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    // Clear previous result but keep regionResult for persistence
    setResult(null);

    try {
      // 1. Pose detection (client-side, AI-assisted) ──────────
      step('detecting-pose', 10);

      let landmarks: import('../types').PoseLandmark[] | null = null;
      try {
        const imgEl = await createImageElement(image.file);
        landmarks = await detectPose(imgEl);
        URL.revokeObjectURL(imgEl.src);

        if (landmarks) {
          step('isolating-limb', 20);
          const regions = extractLimbRegions(landmarks, image.width, image.height);
          const best = selectBestLimb(regions);
          if (best) limbRef.current = best;
        }
      } catch (poseErr) {
        console.warn('[TattooStencil] Pose detection unavailable:', poseErr);
      }

      if (abort.signal.aborted) return;

      // 2. Depth estimation (client-side) ─────────────────────
      if (options.useDepthFlattening) {
        step('estimating-depth', 22);
        try {
          const dm = await estimateDepthMap(
            image.file, image.width, image.height, landmarks,
          );
          setDepthMap(dm);
        } catch (depthErr) {
          console.warn('[TattooStencil] Depth estimation failed:', depthErr);
        }
      }

      if (abort.signal.aborted) return;

      // 2. Pause — ask user for region editor ─────────────────
      step('awaiting-regions', 25);
      // Execution pauses here. The user interacts with the
      // RegionEditor component. When they confirm, the
      // page calls `confirmRegionsAndProcess(result)`.
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      fail(err instanceof Error ? err.message : 'Unexpected error during processing.');
    }
  }, [image, options.useDepthFlattening, step, fail]);

  // Ref to hold auto-detected limbRegion between phases
  const limbRef = useRef<LimbRegion | undefined>(undefined);

  /** Phase 2 — called after user confirms (or skips) regions. */
  const confirmRegionsAndProcess = useCallback(
    async (regions: RegionEditorResult | null) => {
      if (!image) { fail('No image selected.'); return; }

      const abort = abortRef.current ?? new AbortController();
      abortRef.current = abort;

      setRegionResult(regions);

      try {
        // 3. Compress image for upload ─────────────────────────
        step('uploading', 40);
        const imageBase64 = await compressImageForUpload(image.file);

        if (abort.signal.aborted) return;

        // 4. Call the processing API ───────────────────────────
        step('processing', 55);
        const limbRegion = limbRef.current;
        const res = await fetch('/api/tattoo-stencil', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64,
            limbRegion,
            limbOutline: regions?.limbOutline ?? undefined,
            tattooHighlight: regions?.tattooHighlight ?? undefined,
            curveHighlight: regions?.curveHighlight ?? undefined,
            reliefHighlight: regions?.reliefHighlight ?? undefined,
            depthMap: depthMap ?? undefined,
            options,
          }),
          signal: abort.signal,
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.error ?? `Server error (${res.status})`);
        }

        step('generating-stencil', 80);
        const json: StencilApiResponse = await res.json();

        if (!json.success || !json.data) {
          throw new Error(json.error ?? 'Processing returned no result.');
        }

        step('complete', 100);
        setResult(json.data);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        fail(err instanceof Error ? err.message : 'Unexpected error during processing.');
      }
    },
    [image, options, depthMap, step, fail],
  );

  // ── Reset ────────────────────────────────────────────────

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (image?.preview) URL.revokeObjectURL(image.preview);
    setImage(null);
    setResult(null);
    setRegionResult(null);
    setDepthMap(null);
    limbRef.current = undefined;
    setProcessing(idle);
    disposePoseDetection();
  }, [image]);

  return {
    image,
    processing,
    result,
    options,
    setOptions,
    regionResult,
    awaitingRegions,
    handleUpload,
    processImage,
    confirmRegionsAndProcess,
    reset,
  } as const;
}
