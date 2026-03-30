/* ─────────────────────────────────────────────────────────────
   MeshEditor – main wrapper
   Composes the R3F canvas, toolbar, overlays, compare mode,
   depth projection, AI assist, and export.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, {
  useRef,
  useCallback,
  Suspense,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import { useMeshEditorStore } from "./store";
import MeshEditorToolbar from "./components/MeshEditorToolbar";
import DeformableMesh from "./components/DeformableMesh";
import MeshOverlays from "./components/MeshOverlays";
import SilhouetteOverlay from "./components/SilhouetteOverlay";
import CurveDeformerOverlay from "./components/CurveDeformerOverlay";
import HookDeformerOverlay from "./components/HookDeformerOverlay";
import { unwrapMeshToStencil, applyStencilPostProcessing } from "./uvUnwrap";
import { buildAdjacency, aiAutoFix, computeDistortion } from "./sculptEngine";
import { Upload, Crop } from "lucide-react";
import type { CropRegion } from "./types";

// ── Screenshot capture helper (lives inside <Canvas>) ────────

export interface ScreenshotHandle {
  capture: (
    crop: CropRegion | null,
    outputSize: number,
  ) => HTMLCanvasElement | null;
}

const ScreenshotHelper = forwardRef<ScreenshotHandle>(
  function ScreenshotHelper(_, ref) {
    const { gl, scene, camera } = useThree();

    useImperativeHandle(
      ref,
      () => ({
        capture(_crop: CropRegion | null, outputSize: number) {
          const cam = camera as THREE.PerspectiveCamera;

          // ── Save current state ──────────────────────────
          const prevBg = scene.background;
          const prevClearColor = gl.getClearColor(new THREE.Color());
          const prevClearAlpha = gl.getClearAlpha();
          const prevCamPos = cam.position.clone();
          const prevCamRot = cam.quaternion.clone();
          const prevCamFov = cam.fov;
          const prevCamAspect = cam.aspect;
          const prevSize = gl.getSize(new THREE.Vector2());
          const prevPixelRatio = gl.getPixelRatio();

          // Hide helpers (grid, gizmo, overlays) during capture
          const hiddenObjects: THREE.Object3D[] = [];
          scene.traverse((obj) => {
            if (
              obj.visible &&
              (obj instanceof THREE.GridHelper ||
                obj.type === "GridHelper" ||
                (obj as unknown as { isGizmoHelper?: boolean }).isGizmoHelper ||
                obj.userData?.isGizmo)
            ) {
              obj.visible = false;
              hiddenObjects.push(obj);
            }
          });

          // ── Set white background ────────────────────────
          scene.background = new THREE.Color("#ffffff");
          gl.setClearColor("#ffffff", 1);

          // ── Resize renderer to square outputSize ────────
          gl.setPixelRatio(1);
          gl.setSize(outputSize, outputSize, false);

          // ── Set camera to square aspect ─────────────────
          cam.aspect = 1;
          cam.updateProjectionMatrix();

          // ── Auto-fit camera to mesh bounding box ────────
          let meshObj: THREE.Mesh | null = null;
          scene.traverse((obj) => {
            if (
              obj.visible &&
              obj instanceof THREE.Mesh &&
              obj.geometry &&
              obj.geometry.attributes.position &&
              obj.geometry.attributes.position.count > 10
            ) {
              meshObj = obj;
            }
          });

          if (meshObj) {
            const box = new THREE.Box3().setFromObject(meshObj);
            const center = box.getCenter(new THREE.Vector3());
            const bSize = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(bSize.x, bSize.y, bSize.z);

            // Camera is square now, so vertical FOV is the limiting angle
            const fovRad = THREE.MathUtils.degToRad(cam.fov) / 2;
            const dist = (maxDim / 2 / Math.tan(fovRad)) * 1.2; // 20% margin
            const direction = cam.position.clone().sub(center).normalize();
            if (direction.lengthSq() < 1e-6) direction.set(0, 0, 1);
            cam.position.copy(center).addScaledVector(direction, dist);
            cam.lookAt(center);
            cam.updateProjectionMatrix();
            cam.updateMatrixWorld(true);
          }

          // ── Render at full output resolution ────────────
          gl.render(scene, cam);

          // Copy from WebGL canvas (now outputSize × outputSize)
          const out = document.createElement("canvas");
          out.width = outputSize;
          out.height = outputSize;
          const outCtx = out.getContext("2d", { willReadFrequently: true })!;
          outCtx.fillStyle = "#fff";
          outCtx.fillRect(0, 0, outputSize, outputSize);
          outCtx.drawImage(gl.domElement, 0, 0, outputSize, outputSize);

          // ── Restore state ───────────────────────────────
          scene.background = prevBg;
          gl.setClearColor(prevClearColor, prevClearAlpha);
          cam.position.copy(prevCamPos);
          cam.quaternion.copy(prevCamRot);
          cam.fov = prevCamFov;
          cam.aspect = prevCamAspect;
          cam.updateProjectionMatrix();
          cam.updateMatrixWorld(true);
          gl.setPixelRatio(prevPixelRatio);
          gl.setSize(prevSize.x, prevSize.y, false);
          for (const obj of hiddenObjects) obj.visible = true;

          // Re-render so the user sees their normal view restored
          gl.render(scene, cam);

          return out;
        },
      }),
      [gl, scene, camera],
    );

    return null;
  },
);

// ── Main component ───────────────────────────────────────────

export default function MeshEditor() {
  const meshContainerRef = useRef<THREE.Group>(null!);
  const canvasWrapRef = useRef<HTMLDivElement>(null!);
  const screenshotRef = useRef<ScreenshotHandle>(null!);
  const imageUrl = useMeshEditorStore((s) => s.imageUrl);
  const setImage = useMeshEditorStore((s) => s.setImage);
  const clearImage = useMeshEditorStore((s) => s.clearImage);
  const unwrapResult = useMeshEditorStore((s) => s.unwrapResult);
  const setUnwrapResult = useMeshEditorStore((s) => s.setUnwrapResult);
  const showCompare = useMeshEditorStore((s) => s.showCompare);
  const compareSnapshot = useMeshEditorStore((s) => s.compareSnapshot);
  const vertexState = useMeshEditorStore((s) => s.vertexState);
  const setAiAssisting = useMeshEditorStore((s) => s.setAiAssisting);
  const setDepthProjection = useMeshEditorStore((s) => s.setDepthProjection);
  const stencilSettings = useMeshEditorStore((s) => s.stencilSettings);
  const exportMode = useMeshEditorStore((s) => s.exportMode);
  const cropRegion = useMeshEditorStore((s) => s.cropRegion);
  const isCropping = useMeshEditorStore((s) => s.isCropping);
  const setCropRegion = useMeshEditorStore((s) => s.setCropRegion);
  const setIsCropping = useMeshEditorStore((s) => s.setIsCropping);
  const pushUndo = useMeshEditorStore((s) => s.pushUndo);
  const showGrid = useMeshEditorStore((s) => s.showGrid);
  const lightIntensity = useMeshEditorStore((s) => s.lightIntensity);

  const [depthStrength, setDepthStrength] = useState(0.3);

  // ── Image upload ───────────────────────────────────────────
  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) setImage(f);
    },
    [setImage],
  );

  // ── Depth map upload + projection ──────────────────────────
  const handleDepthFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, img.width, img.height);
          setDepthProjection({
            depthData: data.data,
            width: img.width,
            height: img.height,
            strength: depthStrength,
          });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(f);
    },
    [depthStrength, setDepthProjection],
  );

  // ── AI Auto-Fix ────────────────────────────────────────────
  const handleAiAssist = useCallback(() => {
    if (!vertexState || !meshContainerRef.current) return;
    const child = meshContainerRef.current.children[0] as
      | THREE.Mesh
      | undefined;
    if (!child) return;

    setAiAssisting(true);
    pushUndo("smooth");

    const adj = buildAdjacency(child.geometry);
    const result = aiAutoFix(vertexState, adj, 5);

    // Force geometry sync
    const pos = child.geometry.attributes.position as THREE.BufferAttribute;
    (pos.array as Float32Array).set(vertexState.current);
    pos.needsUpdate = true;
    child.geometry.computeVertexNormals();

    setAiAssisting(false);
    console.log(`AI auto-fix: smoothed ${result.smoothedCount} vertices`);
  }, [vertexState, setAiAssisting, pushUndo]);

  // ── Export / unwrap ────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (exportMode === "screenshot") {
      // Render scene from inside R3F, crop, post-process
      if (!screenshotRef.current) return;
      try {
        const canvas = screenshotRef.current.capture(
          cropRegion,
          stencilSettings.outputSize,
        );
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        applyStencilPostProcessing(
          ctx,
          stencilSettings.outputSize,
          stencilSettings,
        );
        setUnwrapResult({
          stencilBase64: canvas.toDataURL("image/png").split(",")[1],
          width: stencilSettings.outputSize,
          height: stencilSettings.outputSize,
        });
      } catch (err) {
        console.error("Screenshot export failed:", err);
      }
    } else {
      // UV-unwrap based
      if (!meshContainerRef.current) return;
      const group = meshContainerRef.current;
      const child = group.children[0] as THREE.Mesh | undefined;
      if (!child) return;
      const geo = child.geometry;
      const mat = child.material as THREE.MeshStandardMaterial;
      if (!mat.map) {
        alert("Upload a tattoo image first.");
        return;
      }
      try {
        const result = unwrapMeshToStencil(geo, mat.map, stencilSettings);
        setUnwrapResult(result);
      } catch (err) {
        console.error("UV unwrap failed:", err);
      }
    }
  }, [setUnwrapResult, stencilSettings, exportMode, cropRegion]);

  // ── Download stencil ───────────────────────────────────────
  const downloadStencil = useCallback(() => {
    if (!unwrapResult) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${unwrapResult.stencilBase64}`;
    a.download = "tattoo-stencil-mesh.png";
    a.click();
  }, [unwrapResult]);

  // ── Compare heatmap helper ─────────────────────────────────
  const compareDistortion =
    showCompare && compareSnapshot && vertexState
      ? computeCompareDistortion(vertexState.current, compareSnapshot.positions)
      : null;

  // ── Crop rectangle drag state ──────────────────────────────
  const cropStart = useRef<{ x: number; y: number } | null>(null);

  const onCropDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isCropping) return;
      const rect = canvasWrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      e.preventDefault();
      e.stopPropagation();
      cropStart.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    },
    [isCropping],
  );

  const onCropMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isCropping || !cropStart.current) return;
      const rect = canvasWrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      e.preventDefault();
      const cx = (e.clientX - rect.left) / rect.width;
      const cy = (e.clientY - rect.top) / rect.height;
      const x = Math.max(0, Math.min(cropStart.current.x, cx));
      const y = Math.max(0, Math.min(cropStart.current.y, cy));
      const w = Math.min(1, Math.abs(cx - cropStart.current.x));
      const h = Math.min(1, Math.abs(cy - cropStart.current.y));
      setCropRegion({ x, y, w, h });
    },
    [isCropping, setCropRegion],
  );

  const onCropUp = useCallback(() => {
    cropStart.current = null;
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Image upload bar ────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition-colors">
          <Upload size={16} />
          {imageUrl ? "Change Image" : "Upload Tattoo Image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </label>
        {imageUrl && (
          <button
            onClick={clearImage}
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Clear
          </button>
        )}

        {/* Depth map upload */}
        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors">
          Depth Map
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleDepthFile}
          />
        </label>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-500">Str</span>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={depthStrength}
            onChange={(e) => setDepthStrength(parseFloat(e.target.value))}
            className="w-16 accent-indigo-500 h-1"
          />
          <span className="text-[10px] text-zinc-500 tabular-nums w-6">
            {depthStrength.toFixed(2)}
          </span>
        </div>

        <p className="text-xs text-zinc-500">
          Sculpt corrections then export a flat stencil.
        </p>
      </div>

      {/* ── Main editor area ────────────────────────────────── */}
      <div className="flex gap-3 min-h-[500px]">
        {/* Toolbar */}
        <MeshEditorToolbar
          onExport={handleExport}
          onAiAssist={handleAiAssist}
        />

        {/* 3D Canvas */}
        <div
          ref={canvasWrapRef}
          className="flex-1 rounded-xl border border-zinc-700/50 bg-zinc-950 overflow-hidden relative"
          onMouseDown={onCropDown}
          onMouseMove={onCropMove}
          onMouseUp={onCropUp}
          onMouseLeave={onCropUp}
          style={isCropping ? { cursor: "crosshair" } : undefined}
        >
          <Canvas
            camera={{ position: [0, 0, 4], fov: 50 }}
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            dpr={[1, 2]}
          >
            <ambientLight intensity={0.5 * lightIntensity} />
            <directionalLight
              position={[5, 5, 5]}
              intensity={1 * lightIntensity}
            />
            <directionalLight
              position={[-3, -2, -4]}
              intensity={0.3 * lightIntensity}
            />

            <Suspense fallback={null}>
              <ScreenshotHelper ref={screenshotRef} />
              <SilhouetteOverlay textureUrl={imageUrl} />
              <group ref={meshContainerRef}>
                <DeformableMesh textureUrl={imageUrl} />
              </group>
              <CurveDeformerOverlay />
              <HookDeformerOverlay />
              <MeshOverlays
                parentMeshRef={meshContainerRef as React.RefObject<THREE.Group>}
              />
            </Suspense>

            <OrbitControls
              makeDefault
              enablePan
              enableZoom
              enableRotate
              mouseButtons={{
                LEFT: undefined as unknown as THREE.MOUSE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.ROTATE,
              }}
            />

            <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
              <GizmoViewport />
            </GizmoHelper>

            {showGrid && <gridHelper args={[10, 20, "#333", "#222"]} />}
          </Canvas>

          {/* Compare overlay */}
          {showCompare && compareDistortion !== null && (
            <div className="absolute top-3 left-3 right-3 rounded-lg bg-black/70 px-3 py-2 text-xs text-zinc-300">
              <span className="font-semibold text-amber-400">Compare Mode</span>
              <span className="ml-3">
                Avg delta: {compareDistortion.avg.toFixed(4)} &bull; Max:{" "}
                {compareDistortion.max.toFixed(4)}
              </span>
            </div>
          )}

          {/* Crop region rectangle overlay */}
          {cropRegion && (
            <div
              className="absolute border-2 border-dashed border-amber-400 bg-amber-400/10 pointer-events-none rounded"
              style={{
                left: `${cropRegion.x * 100}%`,
                top: `${cropRegion.y * 100}%`,
                width: `${cropRegion.w * 100}%`,
                height: `${cropRegion.h * 100}%`,
              }}
            />
          )}

          {/* Crop / screenshot controls */}
          {exportMode === "screenshot" && (
            <div className="absolute top-3 right-3 flex gap-1.5">
              <button
                onClick={() => {
                  setIsCropping(!isCropping);
                }}
                className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  isCropping
                    ? "bg-amber-500 text-black"
                    : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80"
                }`}
              >
                <Crop size={14} /> {isCropping ? "Drawing…" : "Select Area"}
              </button>
              {cropRegion && (
                <button
                  onClick={() => setCropRegion(null)}
                  className="rounded-md px-2 py-1.5 text-xs bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Hint overlay */}
          <div className="absolute bottom-3 left-3 text-[10px] text-zinc-600 pointer-events-none">
            {isCropping
              ? "Draw a rectangle over the tattoo area to crop"
              : "Right-click drag = rotate \u2022 Scroll = zoom \u2022 Middle = pan"}
          </div>
        </div>
      </div>

      {/* ── Stencil result ──────────────────────────────────── */}
      {unwrapResult && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-4">
          <h3 className="text-sm font-semibold text-zinc-300">
            Exported Stencil
            {"avgDistortion" in unwrapResult && (
              <span className="ml-2 text-[10px] text-zinc-500 font-normal">
                ARAP distortion: avg{" "}
                {(
                  unwrapResult as { avgDistortion?: number }
                ).avgDistortion?.toFixed(4)}{" "}
                / max{" "}
                {(
                  unwrapResult as { maxDistortion?: number }
                ).maxDistortion?.toFixed(4)}
              </span>
            )}
          </h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${unwrapResult.stencilBase64}`}
            alt="Unwrapped stencil"
            className="max-w-md rounded-md border border-zinc-700 bg-white"
          />
          <button
            onClick={downloadStencil}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 transition-colors"
          >
            Download PNG
          </button>
        </div>
      )}
    </div>
  );
}

// ── helper: compare two vertex arrays ────────────────────────
function computeCompareDistortion(
  current: Float32Array,
  snapshot: Float32Array,
): { avg: number; max: number } {
  const count = Math.min(current.length, snapshot.length) / 3;
  let total = 0;
  let maxD = 0;
  for (let i = 0; i < count; i++) {
    const dx = current[i * 3] - snapshot[i * 3];
    const dy = current[i * 3 + 1] - snapshot[i * 3 + 1];
    const dz = current[i * 3 + 2] - snapshot[i * 3 + 2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    total += d;
    if (d > maxD) maxD = d;
  }
  return { avg: count > 0 ? total / count : 0, max: maxD };
}
