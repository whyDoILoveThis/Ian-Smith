// ─── Camera viewport component ───────────────────────────────────
// Renders the mirrored video feed. Uses a ref to avoid re-renders.
// The video element is never controlled by React state — it streams
// directly from the MediaStream API.

"use client";

import React, { forwardRef } from "react";

interface CameraViewProps {
  isStreaming: boolean;
}

const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(
  ({ isStreaming }, ref) => {
    return (
      <div className="lt-camera-container">
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          // CSS handles mirroring via scaleX(-1) — far cheaper than
          // canvas pixel manipulation per frame.
          className="lt-camera-video"
          style={{ display: isStreaming ? "block" : "none" }}
        />
        {!isStreaming && (
          <div className="lt-camera-placeholder">
            <div className="lt-camera-placeholder-icon">📷</div>
            <p>Camera feed will appear here</p>
          </div>
        )}
      </div>
    );
  },
);

CameraView.displayName = "CameraView";
export default CameraView;
