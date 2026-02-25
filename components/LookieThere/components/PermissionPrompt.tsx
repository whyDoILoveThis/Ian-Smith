// ─── Permission prompt component ─────────────────────────────────
// Shown when camera permission hasn't been granted yet.
// Clean, inviting UI that explains why the camera is needed.

"use client";

import React from "react";
import { CameraPermission } from "../types";

interface PermissionPromptProps {
  permission: CameraPermission;
  onStart: () => void;
  loading: boolean;
}

export default function PermissionPrompt({
  permission,
  onStart,
  loading,
}: PermissionPromptProps) {
  if (permission === "denied") {
    return (
      <div className="lt-permission lt-glass">
        <div className="lt-permission-icon">🚫</div>
        <h2>Camera Access Denied</h2>
        <p>
          LookieThere needs camera access to detect your facial expressions.
          Please enable camera permissions in your browser settings and refresh.
        </p>
      </div>
    );
  }

  if (permission === "error") {
    return (
      <div className="lt-permission lt-glass">
        <div className="lt-permission-icon">⚠️</div>
        <h2>Camera Unavailable</h2>
        <p>
          Could not access your camera. Make sure a camera is connected and no
          other app is using it.
        </p>
        <button className="lt-btn" onClick={onStart}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="lt-permission lt-glass">
      <div className="lt-permission-icon">🎭</div>
      <h2>Real-Time Expression Detection</h2>
      <p>
        See your facial expressions detected live using AI that runs{" "}
        <strong>entirely in your browser</strong>. No data leaves your device.
      </p>
      <div className="lt-privacy-badges">
        <span className="lt-badge">🔒 100% Private</span>
        <span className="lt-badge">⚡ Real-Time</span>
        <span className="lt-badge">📱 Works on Mobile</span>
      </div>
      <button className="lt-btn" onClick={onStart} disabled={loading}>
        {loading ? (
          <span className="lt-btn-loading">
            <span className="lt-spinner" />
            Loading AI Models...
          </span>
        ) : (
          "Start Camera"
        )}
      </button>
    </div>
  );
}
