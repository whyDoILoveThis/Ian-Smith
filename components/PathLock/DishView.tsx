// app/components/PathLock/DishView.tsx
"use client";

import React from "react";
import { MechanicalState } from "./rfEngine";

function normalizeAngle360(a: number) {
  let r = a % 360;
  if (r < 0) r += 360;
  return r;
}
function displayTiltFromMechanical(tilt: number) {
  let rel = tilt - 90;
  rel = Math.max(-80, Math.min(80, rel));
  return rel;
}

export default function DishView({
  title,
  dish,
}: {
  title: string;
  dish: MechanicalState;
}) {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = 52;
  const lineLen = r;
  const az = normalizeAngle360(dish.azimuth ?? 0);
  const displayTilt = displayTiltFromMechanical(dish.tilt ?? 90);
  const semiPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${
    cx + r
  } ${cy} L ${cx} ${cy} Z`;
  return (
    <div style={{ border: "1px solid #444", padding: 12, width: 240 }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <div style={{ marginTop: 8, fontSize: 13 }}>
        🧭 Azimuth: <b>{az.toFixed(2)}°</b> &nbsp; • &nbsp; 📐 Tilt:{" "}
        <b>{(dish.tilt ?? 90).toFixed(2)}°</b>
      </div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
        <div style={{ width: size, height: 80 }}>
          <svg width={size} height={80} viewBox={`0 0 ${size} 80`}>
            <path d={semiPath} fill="#111" stroke="#444" strokeWidth={1} />
            <g transform={`translate(${cx}, ${cy}) rotate(${az})`}>
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={-lineLen}
                stroke="#ff3333"
                strokeWidth={3}
                strokeLinecap="round"
              />
            </g>
            <circle cx={cx} cy={cy} r={3} fill="#fff" />
            <text x={8} y={15} fill="#aaa" fontSize={10}>
              Top (Azimuth)
            </text>
          </svg>
        </div>
      </div>

      <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
        <div style={{ width: size, height: 80 }}>
          <svg width={size} height={80} viewBox={`0 0 ${size} 80`}>
            <path
              d={semiPath}
              fill="#041821"
              stroke="#16424e"
              strokeWidth={1}
            />
            <g transform={`translate(${cx}, ${cy}) rotate(${displayTilt})`}>
              <line
                x1={0}
                y1={-lineLen / 2}
                x2={0}
                y2={lineLen / 2}
                stroke="#33ffff"
                strokeWidth={3}
                strokeLinecap="round"
              />
            </g>
            <circle cx={cx} cy={cy} r={3} fill="#fff" />
            <text x={8} y={15} fill="#9fb" fontSize={10}>
              Side (Tilt, 90° = plumb)
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
