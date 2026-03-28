/* ─────────────────────────────────────────────────────────────
   MeshOverlays – heatmap / stretch / depth / curvature / pins
   Renders per-vertex colour overlays on top of the mesh.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMeshEditorStore } from "../store";
import {
  buildAdjacency,
  computeDistortion,
  computeCurvature,
  type Adjacency,
} from "../sculptEngine";

function heatmapColour(t: number): [number, number, number] {
  // blue → green → yellow → red
  if (t < 0.25) return [0, t * 4, 1];
  if (t < 0.5) return [0, 1, 1 - (t - 0.25) * 4];
  if (t < 0.75) return [(t - 0.5) * 4, 1, 0];
  return [1, 1 - (t - 0.75) * 4, 0];
}

export default function MeshOverlays({
  parentMeshRef,
}: {
  parentMeshRef: React.RefObject<THREE.Group>;
}) {
  const overlay = useMeshEditorStore((s) => s.overlay);
  const vertexState = useMeshEditorStore((s) => s.vertexState);
  const meshShape = useMeshEditorStore((s) => s.meshShape);
  const meshKey = useMeshEditorStore((s) => s.meshKey);
  const overlayRef = useRef<THREE.Points>(null!);

  // build adjacency once per shape
  const adjRef = useRef<Adjacency | null>(null);
  useEffect(() => {
    if (!parentMeshRef.current) return;
    const child = parentMeshRef.current.children[0] as THREE.Mesh | undefined;
    if (child?.geometry) {
      adjRef.current = buildAdjacency(child.geometry);
    }
  }, [meshShape, meshKey, parentMeshRef]);

  // create points geometry (always called – no conditional hooks)
  const pointsGeo = useMemo(() => {
    if (!vertexState) return null;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(vertexState.current.length);
    pos.set(vertexState.current);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertexState, overlay]);

  // per-frame colour update
  useFrame(() => {
    if (overlay === "none" || !vertexState || !overlayRef.current) return;

    const geo = overlayRef.current.geometry;
    const count = vertexState.current.length / 3;

    // sync positions
    const pos = geo.attributes.position as THREE.BufferAttribute;
    (pos.array as Float32Array).set(vertexState.current);
    pos.needsUpdate = true;

    let colorAttr = geo.attributes.color as THREE.BufferAttribute | undefined;
    if (!colorAttr || colorAttr.count !== count) {
      colorAttr = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
      geo.setAttribute("color", colorAttr);
    }
    const cArr = colorAttr.array as Float32Array;

    if (overlay === "pins") {
      // Show pins overlay: pinned = red, edgeLocked = orange, free = transparent green
      for (let i = 0; i < count; i++) {
        if (vertexState.edgeLocked[i]) {
          cArr[i * 3] = 1;
          cArr[i * 3 + 1] = 0.5;
          cArr[i * 3 + 2] = 0;
        } else if (vertexState.pinned[i]) {
          cArr[i * 3] = 1;
          cArr[i * 3 + 1] = 0.1;
          cArr[i * 3 + 2] = 0.1;
        } else {
          cArr[i * 3] = 0.2;
          cArr[i * 3 + 1] = 0.8;
          cArr[i * 3 + 2] = 0.2;
        }
      }
    } else {
      // Heatmap modes
      let vals: Float32Array;
      if (
        overlay === "distortion" ||
        overlay === "stretch" ||
        overlay === "depth"
      ) {
        vals = computeDistortion(vertexState);
      } else {
        vals = computeCurvature(vertexState, adjRef.current!);
      }

      for (let i = 0; i < count; i++) {
        const [r, g, b] = heatmapColour(vals[i]);
        cArr[i * 3] = r;
        cArr[i * 3 + 1] = g;
        cArr[i * 3 + 2] = b;
      }
    }

    colorAttr.needsUpdate = true;
  });

  if (overlay === "none" || !vertexState || !pointsGeo) return null;

  return (
    <points ref={overlayRef} geometry={pointsGeo}>
      <pointsMaterial
        size={overlay === "pins" ? 0.05 : 0.03}
        vertexColors
        transparent
        opacity={0.8}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
