/**
 * IconCreator — useImageProcessor hook
 *
 * Orchestrates the entire image processing pipeline:
 *  1. File loading → 2. Background removal → 3. Preview →
 *  4. Confirmation → 5. ICO generation → 6. Downloads
 *
 * Uses a clear state machine with defined transitions.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { removeBackground } from '../lib/backgroundRemover';
import { generateIco } from '../lib/icoGenerator';
import { fileToDataUrl, loadImageElement, canvasToBlob } from '../lib/imageUtils';
import { DEFAULT_TOLERANCE } from '../lib/constants';
import type { ProcessingState } from '../types';

// ─── Initial State ───────────────────────────────────────────────────────────

const INITIAL_STATE: ProcessingState = {
  status: 'idle',
  originalDataUrl: null,
  processedDataUrl: null,
  processedBlob: null,
  icoBlob: null,
  fileName: '',
  error: null,
  tolerance: DEFAULT_TOLERANCE,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useImageProcessor() {
  const [state, setState] = useState<ProcessingState>(INITIAL_STATE);

  // Persist the processed canvas for ICO generation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Persist the loaded image element for re-processing with different tolerance
  const imageRef = useRef<HTMLImageElement | null>(null);

  // ── Load an image file ──
  const loadImage = useCallback(async (file: File) => {
    setState((prev) => ({
      ...prev,
      status: 'loading',
      fileName: file.name,
      error: null,
      processedDataUrl: null,
      processedBlob: null,
      icoBlob: null,
    }));

    try {
      const dataUrl = await fileToDataUrl(file);
      const img = await loadImageElement(dataUrl);
      imageRef.current = img;

      setState((prev) => ({
        ...prev,
        status: 'ready',
        originalDataUrl: dataUrl,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Failed to load image. Please try a different file.',
      }));
    }
  }, []);

  // ── Process: remove background ──
  const processImage = useCallback(async (toleranceOverride?: number) => {
    const img = imageRef.current;
    if (!img) return;

    const tolerance = toleranceOverride ?? state.tolerance;

    setState((prev) => ({ ...prev, status: 'processing', tolerance }));

    try {
      // Use requestAnimationFrame to let the UI update before heavy processing
      await new Promise((r) => requestAnimationFrame(r));

      // Draw original image onto a fresh canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Run flood-fill background removal
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      removeBackground(imageData, tolerance);
      ctx.putImageData(imageData, 0, 0);

      // Store canvas for later ICO generation
      canvasRef.current = canvas;

      // Generate preview data
      const processedDataUrl = canvas.toDataURL('image/png');
      const processedBlob = await canvasToBlob(canvas);

      setState((prev) => ({
        ...prev,
        status: 'preview',
        processedDataUrl,
        processedBlob,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Background removal failed. Please try again.',
      }));
    }
  }, [state.tolerance]);

  // ── Confirm result and generate ICO ──
  const confirmResult = useCallback(async () => {
    if (!canvasRef.current) return;

    setState((prev) => ({ ...prev, status: 'generating' }));

    try {
      const icoBlob = await generateIco(canvasRef.current);

      setState((prev) => ({
        ...prev,
        status: 'done',
        icoBlob,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'ICO generation failed. Please try again.',
      }));
    }
  }, []);

  // ── Cancel preview, go back to ready state ──
  const cancelPreview = useCallback(() => {
    canvasRef.current = null;
    setState((prev) => ({
      ...prev,
      status: 'ready',
      processedDataUrl: null,
      processedBlob: null,
      icoBlob: null,
    }));
  }, []);

  // ── Full reset ──
  const reset = useCallback(() => {
    canvasRef.current = null;
    imageRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  // ── Update tolerance ──
  const setTolerance = useCallback((val: number) => {
    setState((prev) => ({ ...prev, tolerance: val }));
  }, []);

  return {
    state,
    loadImage,
    processImage,
    confirmResult,
    cancelPreview,
    reset,
    setTolerance,
  } as const;
}
