/* ─────────────────────────────────────────────────────────────
   CurveDeformerOverlay – interactive 3D control points for
   the curve-bend deformer.  Shows draggable spheres for each
   control point and a spline tube connecting them.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useRef, useMemo, useCallback } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useMeshEditorStore } from "../store";

export default function CurveDeformerOverlay() {
  const curvePoints = useMeshEditorStore((s) => s.curvePoints);
  const updateCurvePoint = useMeshEditorStore((s) => s.updateCurvePoint);
  const activeTool = useMeshEditorStore((s) => s.activeTool);

  // Always render when there are control points
  if (curvePoints.length === 0) return null;

  return (
    <group>
      {/* Spline tube */}
      {curvePoints.length >= 2 && <SplineTube points={curvePoints} />}

      {/* Draggable control point spheres */}
      {curvePoints.map((pt) => (
        <DraggablePoint
          key={pt.id}
          id={pt.id}
          position={pt.position}
          onDrag={updateCurvePoint}
        />
      ))}
    </group>
  );
}

// ── Spline tube visualisation ────────────────────────────────

function SplineTube({
  points,
}: {
  points: { position: [number, number, number] }[];
}) {
  const geometry = useMemo(() => {
    const pts = points.map(
      (p) => new THREE.Vector3(p.position[0], p.position[1], p.position[2]),
    );
    const spline = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
    return new THREE.TubeGeometry(spline, 64, 0.02, 8, false);
  }, [points]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#ff6600" transparent opacity={0.7} />
    </mesh>
  );
}

// ── Draggable control point ──────────────────────────────────

function DraggablePoint({
  id,
  position,
  onDrag,
}: {
  id: string;
  position: [number, number, number];
  onDrag: (id: string, pos: [number, number, number]) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const dragging = useRef(false);
  const { camera, raycaster, gl } = useThree();
  const plane = useRef(new THREE.Plane());
  const intersection = useRef(new THREE.Vector3());

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      dragging.current = true;
      // Set up drag plane facing camera through the point
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      plane.current.setFromNormalAndCoplanarPoint(
        camDir,
        new THREE.Vector3(position[0], position[1], position[2]),
      );
      (e.target as HTMLElement | null)?.setPointerCapture?.(e.pointerId);
    },
    [camera, position],
  );

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!dragging.current) return;
      e.stopPropagation();
      // Get mouse NDC
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(mouse, camera);
      if (raycaster.ray.intersectPlane(plane.current, intersection.current)) {
        onDrag(id, [
          intersection.current.x,
          intersection.current.y,
          intersection.current.z,
        ]);
      }
    },
    [camera, gl.domElement, id, onDrag, raycaster],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshBasicMaterial color="#ff6600" />
    </mesh>
  );
}
