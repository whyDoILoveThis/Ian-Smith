// app/components/PathLock/Controls.tsx
"use client";

import React, { useState, useEffect } from "react";

export default function Controls({
  az,
  tilt,
  setAz,
  setTilt,
}: {
  az: number;
  tilt: number;
  setAz: (v: number) => void;
  setTilt: (v: number) => void;
}) {
  const stepBig = 1;
  const stepSmall = 0.1;
  const [azVal, setAzVal] = useState(az);
  const [tiltVal, setTiltVal] = useState(tilt);

  useEffect(() => setAzVal(az), [az]);
  useEffect(() => setTiltVal(tilt), [tilt]);

  return (
    <div
      style={{
        padding: 8,
        borderRadius: 8,
        background: "#021219",
        border: "1px solid #073",
      }}
    >
      <div style={{ marginBottom: 8, color: "#9fd" }}>
        🎯 Alignment Controls
      </div>

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#9fd",
          }}
        >
          <div>🧭 Azimuth</div>
          <div>{azVal.toFixed(2)}°</div>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button onClick={() => setAz((az - stepBig + 360) % 360)}>◀◀</button>
          <button onClick={() => setAz((az - stepSmall + 360) % 360)}>◀</button>
          <button onClick={() => setAz((az + stepSmall) % 360)}>▶</button>
          <button onClick={() => setAz((az + stepBig) % 360)}>▶▶</button>
        </div>

        <input
          type="range"
          min={0}
          max={360}
          step={0.01}
          value={azVal}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setAzVal(v);
            setAz(v);
          }}
          style={{
            width: "100%",
            accentColor: "#00eaff",
            marginTop: 8,
            height: 6,
            borderRadius: 6,
          }}
        />
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#9fd",
          }}
        >
          <div>📐 Tilt</div>
          <div>{tiltVal.toFixed(2)}°</div>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button onClick={() => setTilt(Math.max(0, tilt - stepBig))}>
            ▲
          </button>
          <button onClick={() => setTilt(Math.max(0, tilt - stepSmall))}>
            △
          </button>
          <button onClick={() => setTilt(Math.min(180, tilt + stepSmall))}>
            ▽
          </button>
          <button onClick={() => setTilt(Math.min(180, tilt + stepBig))}>
            ▼
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={180}
          step={0.01}
          value={tiltVal}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setTiltVal(v);
            setTilt(v);
          }}
          style={{
            width: "100%",
            accentColor: "#00eaff",
            marginTop: 8,
            height: 6,
            borderRadius: 6,
          }}
        />
      </div>
    </div>
  );
}
