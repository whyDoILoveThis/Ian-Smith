/* ─────────────────────────────────────────────────────────────
   SilhouetteOverlay – renders the reference image as a
   semi-transparent plane behind the mesh, so the user can
   visually match the mesh silhouette to the real photo.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { useMeshEditorStore } from "../store";

export default function SilhouetteOverlay({
  textureUrl,
}: {
  textureUrl: string | null;
}) {
  const silhouette = useMeshEditorStore((s) => s.silhouette);

  const texture = useMemo(() => {
    if (!textureUrl) return null;
    const tex = new THREE.TextureLoader().load(textureUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [textureUrl]);

  if (!silhouette.enabled || !texture) return null;

  return (
    <mesh
      position={[silhouette.offsetX, silhouette.offsetY, -3]}
      scale={[silhouette.scale * 4, silhouette.scale * 4, 1]}
      renderOrder={-1}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={silhouette.opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
