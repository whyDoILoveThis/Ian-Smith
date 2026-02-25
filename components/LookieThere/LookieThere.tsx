// ─── LookieThere — Main orchestrator ─────────────────────────────
// Composes all sub-components and manages the detection lifecycle.
//
// STATE STRATEGY:
// - Camera permission/streaming: React state (rare updates)
// - Detection results: React state (throttled to ~10 FPS by hook)
// - Video element: ref (never in React state)
// - FPS counter: computed from detection timestamps
//
// This component acts as the single source of truth for the
// detection pipeline: camera → detection engine → UI.

"use client";

import React, { useState, useCallback, useRef } from "react";
import { useCamera } from "./hooks/useCamera";
import { useDetection } from "./hooks/useDetection";
import { loadModels } from "./lib/detectionEngine";
import { DetectionResult } from "./types";
import CameraView from "./components/CameraView";
import ExpressionDisplay from "./components/ExpressionDisplay";
import ExpressionBars from "./components/ExpressionBars";
import StatusBar from "./components/StatusBar";
import PermissionPrompt from "./components/PermissionPrompt";
import "@/styles/LookieThere.css";

export default function LookieThere() {
  const { videoRef, permission, startCamera, isStreaming } = useCamera();
  const [modelsLoading, setModelsLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [started, setStarted] = useState(false);
  const [fps, setFps] = useState(0);

  // FPS computation: track timestamps of last N detection callbacks
  const fpsTimestamps = useRef<number[]>([]);

  const handleResult = useCallback((detection: DetectionResult) => {
    setResult(detection);

    // Compute FPS from the last second of detection callbacks
    const now = performance.now();
    fpsTimestamps.current.push(now);
    // Keep only timestamps from the last 1000ms
    fpsTimestamps.current = fpsTimestamps.current.filter((t) => now - t < 1000);
    setFps(fpsTimestamps.current.length);
  }, []);

  // Detection loop — only active when camera is streaming
  useDetection(videoRef, {
    onResult: handleResult,
    active: isStreaming && started,
  });

  const handleStart = useCallback(async () => {
    setModelsLoading(true);
    try {
      // Load models first (shows loading state), then start camera.
      // This order gives better UX: models load while user reads the
      // permission dialog the browser shows.
      await loadModels();
      await startCamera();
      setStarted(true);
    } catch (err) {
      console.error("[LookieThere] Failed to start:", err);
    } finally {
      setModelsLoading(false);
    }
  }, [startCamera]);

  const showPrompt =
    !started || permission === "denied" || permission === "error";

  return (
    <div className="lt-root">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="lt-header">
        <h1 className="lt-title">
          <span className="lt-title-emoji">🎭</span>
          LookieThere
        </h1>
        <p className="lt-subtitle">
          Real-time facial expression detection — powered by AI running entirely
          in your browser
        </p>
      </header>

      {/* Always render the video element so videoRef is valid when
          startCamera acquires the stream. Hidden via CSS when not active. */}
      <div style={{ display: showPrompt && !isStreaming ? "none" : undefined }}>
        {/* ── Info banner ─────────────────────────────────────── */}
        <div className="lt-info-banner lt-glass">
          <p>
            <strong>ℹ️ Note:</strong> The FPS shown reflects how often the AI
            model processes a frame — it is not a measure of your device&apos;s
            performance. Inconsistent or constantly changing lighting may
            produce inaccurate expression readings.
          </p>
        </div>

        {/* ── Status bar ──────────────────────────────────────── */}
        <StatusBar
          modelsLoading={modelsLoading}
          isStreaming={isStreaming}
          fps={fps}
        />

        {/* ── Main content grid ───────────────────────────────── */}
        <div className="lt-content">
          <div className="lt-content-camera">
            <CameraView ref={videoRef} isStreaming={isStreaming} />
          </div>
          <div className="lt-content-sidebar">
            <ExpressionDisplay result={result} />
            <ExpressionBars result={result} />
          </div>
        </div>

        {/* ── Privacy footer ──────────────────────────────────── */}
        <footer className="lt-footer lt-glass">
          <p>
            🔒 All processing happens locally in your browser. No video data is
            ever sent to a server.
          </p>
        </footer>
      </div>

      {showPrompt && !isStreaming && (
        <PermissionPrompt
          permission={permission}
          onStart={handleStart}
          loading={modelsLoading}
        />
      )}
    </div>
  );
}
