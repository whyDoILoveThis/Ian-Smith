// ─── Expression display component ────────────────────────────────
// Shows the dominant expression with a large emoji and label,
// plus a confidence bar. Uses CSS transitions for smooth updates
// instead of per-frame animation libraries.

"use client";

import React, { useState, useEffect, useRef } from "react";
import { DetectionResult } from "../types";
import {
  EXPRESSION_MAP,
  EYES_CLOSED_DISPLAY,
  EYEBROWS_RAISED_DISPLAY,
  MOUTH_OPEN_DISPLAY,
} from "../lib/expressionMap";

interface ExpressionDisplayProps {
  result: DetectionResult | null;
}

export default function ExpressionDisplay({ result }: ExpressionDisplayProps) {
  // Blink flash: increment a key each time a blink is detected
  // to re-mount the pill element, restarting its CSS animation.
  const [blinkKey, setBlinkKey] = useState(0);
  const [showBlink, setShowBlink] = useState(false);
  const blinkTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (result?.blinkDetected) {
      setBlinkKey((k) => k + 1);
      setShowBlink(true);
      // Auto-hide after the animation completes (800ms)
      clearTimeout(blinkTimer.current);
      blinkTimer.current = setTimeout(() => setShowBlink(false), 800);
    }
  }, [result?.blinkDetected, result?.timestamp]);

  if (!result || !result.faceDetected) {
    return (
      <div className="lt-expression-card lt-glass">
        <div className="lt-expression-hero">
          <span className="lt-expression-emoji">🔍</span>
          <span className="lt-expression-label">
            {result === null ? "Initializing..." : "No face detected"}
          </span>
        </div>
        <p className="lt-expression-hint">
          Position your face in the camera view
        </p>
      </div>
    );
  }

  const display = EXPRESSION_MAP[result.dominant.name];
  const confidence = Math.round(result.dominant.confidence * 100);

  return (
    <div className="lt-expression-card lt-glass">
      {/* ── Hero: dominant expression ─────────────────────────── */}
      <div className="lt-expression-hero">
        <span className="lt-expression-emoji" key={result.dominant.name}>
          {display.emoji}
        </span>
        <span className="lt-expression-label">{display.label}</span>
      </div>

      {/* ── Confidence bar ────────────────────────────────────── */}
      <div className="lt-confidence-wrap">
        <div className="lt-confidence-header">
          <span>Confidence</span>
          <span className="lt-confidence-value">{confidence}%</span>
        </div>
        <div className="lt-confidence-track">
          <div
            className="lt-confidence-fill"
            style={{
              width: `${confidence}%`,
              backgroundColor: display.color,
            }}
          />
        </div>
      </div>

      {/* ── Blink flash pill ──────────────────────────────────── */}
      {showBlink && (
        <div className="lt-blink-pill" key={blinkKey}>
          <span>👁️</span>
          <span>BLINK</span>
        </div>
      )}

      {/* ── Secondary indicators ──────────────────────────────── */}
      <div className="lt-indicators">
        <div
          className={`lt-indicator ${result.eyesClosed ? "lt-indicator-active" : ""}`}
        >
          <span>{EYES_CLOSED_DISPLAY.emoji}</span>
          <span>Eyes Closed</span>
        </div>
        <div
          className={`lt-indicator ${result.eyebrowsRaised ? "lt-indicator-active" : ""}`}
        >
          <span>{EYEBROWS_RAISED_DISPLAY.emoji}</span>
          <span>Brows Raised</span>
        </div>
        <div
          className={`lt-indicator ${result.mouthOpen ? "lt-indicator-active" : ""}`}
        >
          <span>{MOUTH_OPEN_DISPLAY.emoji}</span>
          <span>Mouth Open</span>
        </div>
      </div>
    </div>
  );
}
