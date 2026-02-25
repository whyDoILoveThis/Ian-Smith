// ─── Expression bars component ───────────────────────────────────
// Shows all detected expressions as horizontal bars in a fixed
// canonical order. Pure CSS transitions handle the animation — no
// JS animation loop or library needed.

"use client";

import React from "react";
import { DetectionResult } from "../types";
import { EXPRESSION_MAP, EXPRESSION_ORDER } from "../lib/expressionMap";

interface ExpressionBarsProps {
  result: DetectionResult | null;
}

export default function ExpressionBars({ result }: ExpressionBarsProps) {
  if (!result || !result.faceDetected || result.all.length === 0) {
    return (
      <div className="lt-bars-card lt-glass">
        <h3 className="lt-bars-title">All Expressions</h3>
        <p className="lt-bars-empty">Waiting for detection...</p>
      </div>
    );
  }

  return (
    <div className="lt-bars-card lt-glass">
      <h3 className="lt-bars-title">All Expressions</h3>
      <div className="lt-bars-list">
        {EXPRESSION_ORDER.map((name) => {
          const expr = result.all.find((e) => e.name === name);
          const display = EXPRESSION_MAP[name];
          const pct = Math.round((expr?.confidence ?? 0) * 100);
          return (
            <div key={name} className="lt-bar-row">
              <span className="lt-bar-emoji">{display.emoji}</span>
              <span className="lt-bar-label">{display.label}</span>
              <div className="lt-bar-track">
                <div
                  className="lt-bar-fill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: display.color,
                  }}
                />
              </div>
              <span className="lt-bar-pct">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
