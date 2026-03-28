/* ─────────────────────────────────────────────────────────────
   DeformableMesh – the interactive 3D mesh with sculpt tools
   Supports adaptive subdivision, depth auto-fit displacement,
   symmetry mirroring, edge constraints, and live smoothing.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useRef, useEffect, useMemo, useCallback } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useMeshEditorStore } from "../store";
import {
  buildAdjacency,
  applySculpt,
  laplacianSmooth,
  applyDepthDisplacement,
  type Adjacency,
  type SculptHit,
} from "../sculptEngine";
import { buildBodyMesh } from "../bodyMeshes";
import type { MeshShape, SubdivisionLevel, MeshShapeParams } from "../types";

// ── geometry builders (subdivision-aware) ────────────────────

function segCount(base: number, level: SubdivisionLevel): number {
  return base * level;
}

const BODY_SHAPES = new Set<MeshShape>([
  "forearm", "upper-arm", "calf", "thigh", "shoulder", "chest", "back",
]);

function buildGeometry(shape: string, level: SubdivisionLevel, shapeParams?: MeshShapeParams): THREE.BufferGeometry {
  if (BODY_SHAPES.has(shape as MeshShape)) {
    return buildBodyMesh(shape as MeshShape, level, shapeParams)!;
  }
  switch (shape) {
    case "cylinder":
      return new THREE.CylinderGeometry(
        1, 1, 3,
        segCount(48, level), segCount(32, level), true,
      );
    case "half-cylinder":
      return new THREE.CylinderGeometry(
        1, 1, 3,
        segCount(48, level), segCount(32, level), true,
        0, Math.PI,
      );
    case "sphere":
      return new THREE.SphereGeometry(
        1.5,
        segCount(48, level), segCount(32, level),
      );
    case "plane":
    default:
      return new THREE.PlaneGeometry(
        3, 3,
        segCount(48, level), segCount(48, level),
      );
  }
}

// ── region painting helper ───────────────────────────────────

function paintRegion(
  hit: SculptHit,
  vs: { current: Float32Array; regionId: Int8Array },
  radius: number,
  regionId: number,
): void {
  const count = vs.current.length / 3;
  for (let i = 0; i < count; i++) {
    const dx = vs.current[i * 3] - hit.point.x;
    const dy = vs.current[i * 3 + 1] - hit.point.y;
    const dz = vs.current[i * 3 + 2] - hit.point.z;
    if (dx * dx + dy * dy + dz * dz <= radius * radius) {
      vs.regionId[i] = regionId;
    }
  }
}

// ── component ────────────────────────────────────────────────

export default function DeformableMesh({
  textureUrl,
}: {
  textureUrl: string | null;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const adjRef = useRef<Adjacency | null>(null);
  const dragging = useRef(false);
  const lastHit = useRef<THREE.Vector3 | null>(null);
  const depthAppliedRef = useRef(false);

  const {
    meshShape,
    meshKey,
    activeTool,
    brush,
    vertexState,
    liveSmoothing,
    subdivisionLevel,
    depthProjection,
    autoFitApplied,
    activeRegionId,
    meshShapeParams,
    textureTransform,
    initVertexState,
    pushUndo,
    setAutoFitApplied,
  } = useMeshEditorStore();

  const { raycaster } = useThree();

  // ── Build geometry once when shape/key/subdivision changes ──
  const geometry = useMemo(() => {
    const geo = buildGeometry(meshShape, subdivisionLevel, meshShapeParams);
    geo.computeVertexNormals();
    depthAppliedRef.current = false;
    return geo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meshShape, subdivisionLevel, meshKey]);

  // ── Load texture ───────────────────────────────────────────
  const texture = useMemo(() => {
    if (!textureUrl) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(textureUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, [textureUrl]);

  // ── Apply texture transform reactively ─────────────────────
  useEffect(() => {
    if (!texture) return;
    const s = textureTransform.scale || 1;
    texture.repeat.set(1 / s, 1 / s);
    texture.offset.set(textureTransform.offsetX, textureTransform.offsetY);
    texture.rotation = textureTransform.rotation;
    texture.center.set(0.5, 0.5);
    texture.needsUpdate = true;
  }, [texture, textureTransform]);

  // ── Init vertex state + adjacency after geometry changes ───
  useEffect(() => {
    if (geometry) {
      initVertexState(geometry);
      adjRef.current = buildAdjacency(geometry);
    }
  }, [geometry, initVertexState]);

  // ── Auto depth displacement after geometry + depth ready ───
  useEffect(() => {
    if (
      !depthProjection ||
      !vertexState ||
      autoFitApplied ||
      depthAppliedRef.current
    ) return;

    const geo = geometry;
    const uvAttr = geo.attributes.uv as THREE.BufferAttribute | undefined;
    const normAttr = geo.attributes.normal as THREE.BufferAttribute | undefined;
    if (!uvAttr || !normAttr) return;

    const uvs = new Float32Array(uvAttr.count * 2);
    for (let i = 0; i < uvAttr.count; i++) {
      uvs[i * 2] = uvAttr.getX(i);
      uvs[i * 2 + 1] = uvAttr.getY(i);
    }

    const normals = new Float32Array(normAttr.count * 3);
    for (let i = 0; i < normAttr.count; i++) {
      normals[i * 3] = normAttr.getX(i);
      normals[i * 3 + 1] = normAttr.getY(i);
      normals[i * 3 + 2] = normAttr.getZ(i);
    }

    applyDepthDisplacement(
      vertexState,
      depthProjection.depthData,
      depthProjection.width,
      depthProjection.height,
      uvs,
      normals,
      depthProjection.strength,
    );

    // Copy to original so distortion is relative to displaced state
    vertexState.original.set(vertexState.current);

    depthAppliedRef.current = true;
    setAutoFitApplied(true);
    syncGeometry();
  }, [depthProjection, vertexState, autoFitApplied, geometry, setAutoFitApplied]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Raycast helper ─────────────────────────────────────────
  const getRayHit = useCallback(
    (e: ThreeEvent<PointerEvent>): SculptHit | null => {
      if (!meshRef.current) return null;
      const intersects = raycaster.intersectObject(meshRef.current, false);
      if (intersects.length === 0) return null;

      const hit = intersects[0];
      const face = hit.face;
      if (!face) return null;

      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      let closest = face.a;
      let closestDist = Infinity;
      for (const vi of [face.a, face.b, face.c]) {
        const vx = posAttr.getX(vi);
        const vy = posAttr.getY(vi);
        const vz = posAttr.getZ(vi);
        const d = hit.point.distanceTo(new THREE.Vector3(vx, vy, vz));
        if (d < closestDist) {
          closestDist = d;
          closest = vi;
        }
      }

      return {
        vertexIndex: closest,
        point: hit.point.clone(),
        normal: face.normal.clone(),
      };
    },
    [geometry, raycaster],
  );

  // ── Sync vertex state → geometry buffer ────────────────────
  const syncGeometry = useCallback(() => {
    if (!meshRef.current || !vertexState) return;
    const geo = meshRef.current.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    (pos.array as Float32Array).set(vertexState.current);
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }, [vertexState]);

  // ── Pointer events ─────────────────────────────────────────
  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!vertexState) return;
      e.stopPropagation();
      dragging.current = true;
      lastHit.current = null;

      pushUndo(activeTool);

      const hit = getRayHit(e);
      if (!hit) return;
      lastHit.current = hit.point.clone();

      if (activeTool === "region") {
        paintRegion(hit, vertexState, brush.radius, activeRegionId);
      } else if (activeTool === "smooth") {
        laplacianSmooth(vertexState, adjRef.current!, brush.strength, 2);
      } else if (activeTool !== "grab" && activeTool !== "warp" && activeTool !== "bend" && activeTool !== "twist") {
        applySculpt(vertexState, hit, activeTool, brush);
      }

      syncGeometry();
    },
    [vertexState, activeTool, brush, activeRegionId, pushUndo, getRayHit, syncGeometry],
  );

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!dragging.current || !vertexState) return;
      e.stopPropagation();

      const hit = getRayHit(e);
      if (!hit) return;

      if (activeTool === "region") {
        paintRegion(hit, vertexState, brush.radius, activeRegionId);
      } else if (activeTool === "grab" || activeTool === "warp" || activeTool === "bend" || activeTool === "twist") {
        if (lastHit.current) {
          const delta = hit.point.clone().sub(lastHit.current);
          applySculpt(vertexState, hit, activeTool, brush, delta);
        }
        lastHit.current = hit.point.clone();
      } else if (activeTool === "smooth") {
        const affected = new Set<number>();
        const count = vertexState.current.length / 3;
        for (let i = 0; i < count; i++) {
          const vx = vertexState.current[i * 3];
          const vy = vertexState.current[i * 3 + 1];
          const vz = vertexState.current[i * 3 + 2];
          const d = hit.point.distanceTo(new THREE.Vector3(vx, vy, vz));
          if (d <= brush.radius) affected.add(i);
        }
        laplacianSmooth(vertexState, adjRef.current!, brush.strength, 1, affected);
      } else {
        applySculpt(vertexState, hit, activeTool, brush);
      }

      syncGeometry();
    },
    [vertexState, activeTool, brush, activeRegionId, getRayHit, syncGeometry],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    lastHit.current = null;
  }, []);

  // ── Per-frame: live Laplacian smoothing on unpinned verts ──
  useFrame(() => {
    if (!liveSmoothing || !vertexState || !adjRef.current) return;
    if (dragging.current) return;
    laplacianSmooth(vertexState, adjRef.current, 0.02, 1);
    syncGeometry();
  });

  // ── Material ───────────────────────────────────────────────
  const material = useMemo(() => {
    if (texture) {
      return new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0.1,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: "#888",
      wireframe: false,
      side: THREE.DoubleSide,
      roughness: 0.7,
      metalness: 0.1,
    });
  }, [texture]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  );
}
