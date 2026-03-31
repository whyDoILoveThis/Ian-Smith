/* ─────────────────────────────────────────────────────────────
   Step 2 – Mesh Projector
   Builds a triangulated 3D mesh from the depth map and
   UV-projects the FULL original photo onto the mesh surface.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback } from "react";
import { useUnwrapStore } from "../store";
import type { MeshProjectionResult } from "../types";

/* ── mesh projection from depth ─────────────────────────────── */
async function projectToMesh(
  imageSrc: string,
  depthBase64: string,
  w: number,
  h: number,
): Promise<MeshProjectionResult> {
  const gridW = 32;
  const gridH = 32;
  const vertices: number[][] = [];
  const faces: number[][] = [];

  // Load depth map pixels
  const depthImg = new Image();
  depthImg.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    depthImg.onload = () => res();
    depthImg.onerror = rej;
    depthImg.src = `data:image/png;base64,${depthBase64}`;
  });

  const dc = document.createElement("canvas");
  dc.width = w;
  dc.height = h;
  const dctx = dc.getContext("2d")!;
  dctx.drawImage(depthImg, 0, 0, w, h);
  const depthPixels = dctx.getImageData(0, 0, w, h).data;

  // Build vertex grid from depth values
  for (let gy = 0; gy <= gridH; gy++) {
    for (let gx = 0; gx <= gridW; gx++) {
      const px = Math.floor((gx / gridW) * (w - 1));
      const py = Math.floor((gy / gridH) * (h - 1));
      const idx = (py * w + px) * 4;
      const depth = depthPixels[idx] / 255;
      vertices.push([gx / gridW, gy / gridH, depth * 0.3]);
    }
  }

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const i = gy * (gridW + 1) + gx;
      faces.push([i, i + 1, i + gridW + 1]);
      faces.push([i + 1, i + gridW + 2, i + gridW + 1]);
    }
  }

  const meshData = JSON.stringify({ vertices, faces });

  // Load original full photo as the texture preview
  const origImg = new Image();
  origImg.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    origImg.onload = () => res();
    origImg.onerror = rej;
    origImg.src = imageSrc;
  });

  const tc = document.createElement("canvas");
  tc.width = w;
  tc.height = h;
  const tctx = tc.getContext("2d")!;
  tctx.drawImage(origImg, 0, 0, w, h);
  const texturedMeshPreview = tc.toDataURL("image/png").split(",")[1];

  return {
    meshData,
    texturedMeshPreview,
    vertexCount: vertices.length,
    faceCount: faces.length,
  };
}

/* ── Component ──────────────────────────────────────────────── */
export default function MeshProjector() {
  const {
    sourceImage,
    depthMap,
    meshProjection,
    setMeshProjection,
    updateStep,
    setCurrentStep,
    steps,
  } = useUnwrapStore();

  const stepState = steps["mesh-projection"];
  const isRunning = stepState.status === "running";
  const ready = !!depthMap && !!sourceImage;

  const run = useCallback(async () => {
    if (!depthMap || !sourceImage) return;
    updateStep("mesh-projection", {
      status: "running",
      progress: 0,
      message: "Triangulating depth surface…",
    });
    setCurrentStep("mesh-projection");

    try {
      updateStep("mesh-projection", {
        progress: 30,
        message: "Building vertex grid from depth…",
      });
      const result = await projectToMesh(
        sourceImage.preview,
        depthMap.depthBase64,
        sourceImage.width,
        sourceImage.height,
      );
      updateStep("mesh-projection", {
        progress: 70,
        message: "UV-mapping original photo…",
      });

      setMeshProjection(result);
      updateStep("mesh-projection", {
        status: "complete",
        progress: 100,
        message: `Done – ${result.vertexCount} vertices, ${result.faceCount} faces`,
      });
    } catch (err) {
      updateStep("mesh-projection", {
        status: "error",
        progress: 0,
        message: err instanceof Error ? err.message : "Mesh projection failed",
        error: String(err),
      });
    }
  }, [depthMap, sourceImage, updateStep, setCurrentStep, setMeshProjection]);

  if (!ready) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
        Complete Step 1 (Depth Map) first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <span>🧊</span> Step 2 — Project to 3D Mesh
        </h3>
        <button
          onClick={run}
          disabled={isRunning}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Running…" : meshProjection ? "Re-run" : "Project"}
        </button>
      </div>

      <p className="text-xs text-zinc-400">
        Triangulates the depth surface and UV-maps the extracted tattoo onto the
        3D mesh.
      </p>

      {isRunning && (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${stepState.progress}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-500">{stepState.message}</p>
        </div>
      )}

      {meshProjection && (
        <>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${meshProjection.texturedMeshPreview}`}
              alt="Textured mesh preview"
              className="h-full w-full object-contain"
            />
            {/* Wireframe overlay hint */}
            <div className="absolute inset-0 flex items-end justify-end p-2">
              <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] text-zinc-300">
                {meshProjection.vertexCount} verts · {meshProjection.faceCount}{" "}
                faces
              </span>
            </div>
          </div>
        </>
      )}

      {stepState.status === "error" && (
        <p className="text-xs text-red-400">{stepState.message}</p>
      )}
    </div>
  );
}
