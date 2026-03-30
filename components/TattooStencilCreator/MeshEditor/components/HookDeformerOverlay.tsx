/* ─────────────────────────────────────────────────────────────
   HookDeformerOverlay – interactive 3D control points for
   the hook/loop deformer. Shows colored spheres and a line.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { useMeshEditorStore } from "../store";

export default function HookDeformerOverlay() {
  const hookPoints = useMeshEditorStore((s) => s.hookPoints);

  if (hookPoints.length === 0) return null;

  return (
    <group>
      {/* Line connecting hook points */}
      {hookPoints.length >= 2 && <HookLine points={hookPoints} />}

      {/* Control point spheres */}
      {hookPoints.map((pt, idx) => (
        <mesh key={pt.id} position={pt.position}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color={idx === 0 ? "#00ccaa" : "#00aaff"} />
        </mesh>
      ))}
    </group>
  );
}

function HookLine({
  points,
}: {
  points: { position: [number, number, number] }[];
}) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      positions.push(...points[i].position, ...points[i + 1].position);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    return geo;
  }, [points]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#00ccaa" linewidth={2} />
    </lineSegments>
  );
}
