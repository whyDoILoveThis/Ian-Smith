// ─── Status bar component ────────────────────────────────────────
// Shows loading state, model status, and FPS counter.
// FPS is computed from detection timestamps, not React renders.

"use client";

import React from "react";

interface StatusBarProps {
  modelsLoading: boolean;
  isStreaming: boolean;
  fps: number;
}

export default function StatusBar({
  modelsLoading,
  isStreaming,
  fps,
}: StatusBarProps) {
  return (
    <div className="lt-status-bar lt-glass">
      <div className="lt-status-item">
        <span
          className={`lt-status-dot ${
            modelsLoading ? "lt-status-loading" : "lt-status-ready"
          }`}
        />
        <span>{modelsLoading ? "Loading models..." : "Models ready"}</span>
      </div>

      <div className="lt-status-item">
        <span
          className={`lt-status-dot ${
            isStreaming ? "lt-status-ready" : "lt-status-off"
          }`}
        />
        <span>{isStreaming ? "Camera active" : "Camera off"}</span>
      </div>

      {isStreaming && !modelsLoading && (
        <div className="lt-status-item">
          <span className="lt-status-fps">{fps}</span>
          <span>FPS</span>
        </div>
      )}
    </div>
  );
}
