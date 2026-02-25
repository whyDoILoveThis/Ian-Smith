// ─── Detection loop hook ──────────────────────────────────────────
// Runs face detection on each animation frame, but throttles
// the actual detection to ~15 FPS to avoid overloading the GPU.
//
// CRITICAL PERFORMANCE DECISION:
// We do NOT trigger React re-renders per frame. Instead, we write
// detection results to a ref and notify the UI via a callback.
// The callback itself is throttled so the UI updates at ~10 FPS
// (smooth enough for humans, cheap enough for mobile).

"use client";

import { useRef, useCallback, useEffect } from "react";
import { detect, loadModels } from "../lib/detectionEngine";
import { DetectionResult } from "../types";

interface UseDetectionOptions {
  /** Called when a new detection result is available (throttled) */
  onResult: (result: DetectionResult) => void;
  /** Whether detection is active */
  active: boolean;
}

export function useDetection(
  videoRef: React.RefObject<HTMLVideoElement>,
  options: UseDetectionOptions
) {
  const { onResult, active } = options;
  const rafRef = useRef<number>(0);
  const lastDetectionTime = useRef<number>(0);
  const lastUIUpdateTime = useRef<number>(0);
  const latestResult = useRef<DetectionResult | null>(null);
  const modelsReady = useRef(false);
  const onResultRef = useRef(onResult);

  // Keep callback ref fresh without re-triggering effect
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const startLoop = useCallback(async () => {
    if (!modelsReady.current) {
      await loadModels();
      modelsReady.current = true;
    }

    const loop = async (now: number) => {
      if (!videoRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── Throttle detection to ~30 FPS (33ms) ─────────────────
      // Needs to be fast enough to catch blinks (150–400ms).
      // At 33ms we get 4–12 samples during a blink — reliable.
      const DETECTION_INTERVAL = 33;
      if (now - lastDetectionTime.current >= DETECTION_INTERVAL) {
        lastDetectionTime.current = now;

        try {
          const result = await detect(videoRef.current);
          if (result) {
            // Sticky blink: if any detection caught a blink, preserve it
            // until the UI has consumed it. This prevents fast blinks
            // from being overwritten before the UI callback fires.
            if (
              latestResult.current?.blinkDetected &&
              !result.blinkDetected
            ) {
              result.blinkDetected = true;
            }
            latestResult.current = result;
          }
        } catch {
          // Silently skip failed frames — camera might be transitioning
        }
      }

      // ── Throttle UI updates to ~12 FPS (80ms) ───────────────
      // Fast enough to not miss blink events, still cheap for React.
      const UI_INTERVAL = 80;
      if (
        latestResult.current &&
        now - lastUIUpdateTime.current >= UI_INTERVAL
      ) {
        lastUIUpdateTime.current = now;
        onResultRef.current(latestResult.current);
        // Clear the sticky blink flag after the UI has consumed it
        if (latestResult.current.blinkDetected) {
          latestResult.current = { ...latestResult.current, blinkDetected: false };
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [videoRef]);

  useEffect(() => {
    if (active) {
      startLoop();
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [active, startLoop]);
}
