/* ─────────────────────────────────────────────────────────────
   MeshEditorToolbar – tool palette, brush, overlays,
   subdivision, symmetry, snapshots, compare, AI assist
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback, useState } from "react";
import {
  Hand,
  ArrowUpFromLine,
  ArrowDownToLine,
  Eraser,
  Minus,
  Pin,
  PinOff,
  MoveHorizontal,
  Undo2,
  Redo2,
  RotateCcw,
  Eye,
  Download,
  Camera,
  SplitSquareHorizontal,
  Sparkles,
  Lock,
  FlipHorizontal,
  CornerDownRight,
  RefreshCw,
  PaintBucket,
  Scissors,
  Spline,
  Image,
  Plus,
  Trash2,
  Zap,
  Anchor,
  EyeOff,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useMeshEditorStore } from "../store";
import type {
  SculptTool,
  MeshShape,
  OverlayMode,
  SubdivisionLevel,
  ExportMode,
  CurveDirection,
} from "../types";

const BODY_SHAPES = new Set<MeshShape>([
  "forearm",
  "upper-arm",
  "calf",
  "thigh",
  "shoulder",
  "chest",
  "back",
]);

const TOOLS: { id: SculptTool; icon: React.ReactNode; label: string }[] = [
  { id: "grab", icon: <Hand size={16} />, label: "Grab" },
  { id: "push", icon: <ArrowUpFromLine size={16} />, label: "Push" },
  { id: "pull", icon: <ArrowDownToLine size={16} />, label: "Pull" },
  { id: "smooth", icon: <Eraser size={16} />, label: "Smooth" },
  { id: "flatten", icon: <Minus size={16} />, label: "Flatten" },
  { id: "pin", icon: <Pin size={16} />, label: "Pin" },
  { id: "unpin", icon: <PinOff size={16} />, label: "Unpin" },
  { id: "edge", icon: <Lock size={16} />, label: "Edge Lock" },
  { id: "warp", icon: <MoveHorizontal size={16} />, label: "Warp" },
  { id: "bend", icon: <CornerDownRight size={16} />, label: "Bend" },
  { id: "twist", icon: <RefreshCw size={16} />, label: "Twist" },
  { id: "region", icon: <PaintBucket size={16} />, label: "Region" },
  { id: "seam", icon: <Scissors size={16} />, label: "Seam" },
  { id: "curve", icon: <Spline size={16} />, label: "Curve" },
  { id: "hook", icon: <Anchor size={16} />, label: "Hook" },
];

const SHAPES: { id: MeshShape; label: string }[] = [
  { id: "cylinder", label: "Cylinder" },
  { id: "half-cylinder", label: "Half Cyl" },
  { id: "plane", label: "Plane" },
  { id: "sphere", label: "Sphere" },
  { id: "forearm", label: "Forearm" },
  { id: "upper-arm", label: "Upper Arm" },
  { id: "calf", label: "Calf" },
  { id: "thigh", label: "Thigh" },
  { id: "shoulder", label: "Shoulder" },
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
];

const OVERLAYS: { id: OverlayMode; label: string }[] = [
  { id: "none", label: "None" },
  { id: "distortion", label: "Distortion" },
  { id: "stretch", label: "Stretch" },
  { id: "depth", label: "Depth" },
  { id: "curvature", label: "Curvature" },
  { id: "pins", label: "Pins" },
];

const SUBDIV_LEVELS: SubdivisionLevel[] = [1, 2, 3, 4];

const SYMMETRY_OPTIONS: { id: "x" | "y" | "z" | null; label: string }[] = [
  { id: null, label: "Off" },
  { id: "x", label: "X" },
  { id: "y", label: "Y" },
  { id: "z", label: "Z" },
];

const REGION_IDS = [0, 1, 2, 3, 4, 5] as const;
const REGION_DOT_COLORS: Record<number, string> = {
  0: "#e54040",
  1: "#40cc59",
  2: "#4d80f2",
  3: "#f2d933",
  4: "#26d9d9",
  5: "#d959e6",
};
const REGION_BTN_ACTIVE: Record<number, string> = {
  0: "bg-red-600 text-white",
  1: "bg-green-600 text-white",
  2: "bg-blue-600 text-white",
  3: "bg-yellow-500 text-black",
  4: "bg-cyan-600 text-white",
  5: "bg-fuchsia-600 text-white",
};

export default function MeshEditorToolbar({
  onExport,
  onAiAssist,
}: {
  onExport: () => void;
  onAiAssist?: () => void;
}) {
  const activeTool = useMeshEditorStore((s) => s.activeTool);
  const meshShape = useMeshEditorStore((s) => s.meshShape);
  const brush = useMeshEditorStore((s) => s.brush);
  const overlay = useMeshEditorStore((s) => s.overlay);
  const liveSmoothing = useMeshEditorStore((s) => s.liveSmoothing);
  const undoStack = useMeshEditorStore((s) => s.undoStack);
  const redoStack = useMeshEditorStore((s) => s.redoStack);
  const subdivisionLevel = useMeshEditorStore((s) => s.subdivisionLevel);
  const vertexState = useMeshEditorStore((s) => s.vertexState);
  const showCompare = useMeshEditorStore((s) => s.showCompare);
  const compareSnapshot = useMeshEditorStore((s) => s.compareSnapshot);
  const snapshots = useMeshEditorStore((s) => s.snapshots);
  const aiAssisting = useMeshEditorStore((s) => s.aiAssisting);
  const stencilSettings = useMeshEditorStore((s) => s.stencilSettings);
  const activeRegionId = useMeshEditorStore((s) => s.activeRegionId);
  const regionFilterEnabled = useMeshEditorStore((s) => s.regionFilterEnabled);
  const workingRegionId = useMeshEditorStore((s) => s.workingRegionId);

  const setActiveTool = useMeshEditorStore((s) => s.setActiveTool);
  const setMeshShape = useMeshEditorStore((s) => s.setMeshShape);
  const setBrush = useMeshEditorStore((s) => s.setBrush);
  const setOverlay = useMeshEditorStore((s) => s.setOverlay);
  const toggleSmooth = useMeshEditorStore((s) => s.toggleLiveSmoothing);
  const showGrid = useMeshEditorStore((s) => s.showGrid);
  const setShowGrid = useMeshEditorStore((s) => s.setShowGrid);
  const lightIntensity = useMeshEditorStore((s) => s.lightIntensity);
  const setLightIntensity = useMeshEditorStore((s) => s.setLightIntensity);
  const undo = useMeshEditorStore((s) => s.undo);
  const redo = useMeshEditorStore((s) => s.redo);
  const resetMesh = useMeshEditorStore((s) => s.resetMesh);
  const setSubdivisionLevel = useMeshEditorStore((s) => s.setSubdivisionLevel);
  const setSymmetryAxis = useMeshEditorStore((s) => s.setSymmetryAxis);
  const takeSnapshot = useMeshEditorStore((s) => s.takeSnapshot);
  const setCompareSnapshot = useMeshEditorStore((s) => s.setCompareSnapshot);
  const toggleCompare = useMeshEditorStore((s) => s.toggleCompare);
  const setStencilSettings = useMeshEditorStore((s) => s.setStencilSettings);
  const setActiveRegionId = useMeshEditorStore((s) => s.setActiveRegionId);
  const setRegionFilterEnabled = useMeshEditorStore(
    (s) => s.setRegionFilterEnabled,
  );
  const setWorkingRegionId = useMeshEditorStore((s) => s.setWorkingRegionId);
  const showRegionOverlay = useMeshEditorStore((s) => s.showRegionOverlay);
  const setShowRegionOverlay = useMeshEditorStore(
    (s) => s.setShowRegionOverlay,
  );
  const regionEraseMode = useMeshEditorStore((s) => s.regionEraseMode);
  const setRegionEraseMode = useMeshEditorStore((s) => s.setRegionEraseMode);
  const clearRegion = useMeshEditorStore((s) => s.clearRegion);
  const clearAllRegions = useMeshEditorStore((s) => s.clearAllRegions);
  const exportMode = useMeshEditorStore((s) => s.exportMode);
  const setExportMode = useMeshEditorStore((s) => s.setExportMode);
  const textureTransform = useMeshEditorStore((s) => s.textureTransform);
  const setTextureTransform = useMeshEditorStore((s) => s.setTextureTransform);
  const meshShapeParams = useMeshEditorStore((s) => s.meshShapeParams);
  const setMeshShapeParams = useMeshEditorStore((s) => s.setMeshShapeParams);
  const curvePoints = useMeshEditorStore((s) => s.curvePoints);
  const curveInfluenceRadius = useMeshEditorStore(
    (s) => s.curveInfluenceRadius,
  );
  const addCurvePoint = useMeshEditorStore((s) => s.addCurvePoint);
  const clearCurvePoints = useMeshEditorStore((s) => s.clearCurvePoints);
  const applyCurveDeform = useMeshEditorStore((s) => s.applyCurveDeform);
  const setCurveInfluenceRadius = useMeshEditorStore(
    (s) => s.setCurveInfluenceRadius,
  );
  const curveDirection = useMeshEditorStore((s) => s.curveDirection);
  const setCurveDirection = useMeshEditorStore((s) => s.setCurveDirection);
  const hookPoints = useMeshEditorStore((s) => s.hookPoints);
  const hookSettings = useMeshEditorStore((s) => s.hookSettings);
  const clearHookPoints = useMeshEditorStore((s) => s.clearHookPoints);
  const toggleFlap = useMeshEditorStore((s) => s.toggleFlap);
  const flapActive = useMeshEditorStore((s) => s.flapActive);
  const setHookSettings = useMeshEditorStore((s) => s.setHookSettings);
  const silhouette = useMeshEditorStore((s) => s.silhouette);
  const setSilhouette = useMeshEditorStore((s) => s.setSilhouette);
  const autoSplitRegions = useMeshEditorStore((s) => s.autoSplitRegions);

  const toolBtnCls = useCallback(
    (id: string, current: string) =>
      `flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
        id === current
          ? "bg-indigo-600 text-white shadow-sm"
          : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/80"
      }`,
    [],
  );

  const symmetryAxis = vertexState?.symmetryAxis ?? null;

  /** Tools that use the standard brush settings */
  const BRUSH_TOOLS = new Set<SculptTool>([
    "grab",
    "push",
    "pull",
    "smooth",
    "flatten",
    "pin",
    "unpin",
    "edge",
    "warp",
    "bend",
    "twist",
  ]);

  return (
    <div className="flex flex-col h-full max-h-screen overflow-y-auto overflow-x-hidden rounded-xl border border-zinc-700/50 bg-zinc-900/80 p-3 backdrop-blur-sm text-zinc-200 w-56 select-none scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
      {/* ── Sculpt Tools (always visible, not collapsible) ── */}
      <div className="flex flex-col gap-1.5 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Sculpt Tools
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={toolBtnCls(t.id, activeTool)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Actions (always visible, not collapsible) ──── */}
      <div className="flex flex-wrap gap-1.5 py-2 border-t border-zinc-700/40">
        <button
          onClick={undo}
          disabled={!undoStack.length}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/80 disabled:opacity-30"
        >
          <Undo2 size={14} /> Undo
        </button>
        <button
          onClick={redo}
          disabled={!redoStack.length}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/80 disabled:opacity-30"
        >
          <Redo2 size={14} /> Redo
        </button>
        <button
          onClick={resetMesh}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/80"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {/* ── Brush (only for sculpt-type tools) ───────────── */}
      {BRUSH_TOOLS.has(activeTool) && (
        <Section label="Brush">
          <RangeRow
            label="Radius"
            value={brush.radius}
            min={0.05}
            max={2}
            step={0.05}
            onChange={(v) => setBrush({ radius: v })}
          />
          <RangeRow
            label="Strength"
            value={brush.strength}
            min={0.01}
            max={1}
            step={0.01}
            onChange={(v) => setBrush({ strength: v })}
          />
          <RangeRow
            label="Falloff"
            value={brush.falloff}
            min={0.5}
            max={4}
            step={0.1}
            onChange={(v) => setBrush({ falloff: v })}
          />
        </Section>
      )}

      {/* ── Curve Deformer (only when curve tool active) ─── */}
      {activeTool === "curve" && (
        <Section label="Curve Deformer">
          <p className="text-[10px] text-emerald-400/80 leading-tight">
            Click on the mesh to place points. Drag orange spheres to shape the
            curve.
          </p>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={applyCurveDeform}
              disabled={curvePoints.length < 2}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs bg-orange-600/80 text-white hover:bg-orange-500 disabled:opacity-30"
            >
              <Zap size={12} /> Apply
            </button>
            <button
              onClick={clearCurvePoints}
              disabled={curvePoints.length === 0}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/80 disabled:opacity-30"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>
          <RangeRow
            label="Radius"
            value={curveInfluenceRadius}
            min={0.5}
            max={5}
            step={0.1}
            onChange={(v) => setCurveInfluenceRadius(v)}
          />
          <div className="flex items-center gap-2">
            <span className="w-14 text-[11px] text-zinc-400">Direction</span>
            <select
              value={curveDirection}
              onChange={(e) =>
                setCurveDirection(e.target.value as CurveDirection)
              }
              className="flex-1 rounded bg-zinc-800 text-xs text-zinc-300 px-1.5 py-1 border border-zinc-700"
            >
              <option value="auto">Auto</option>
              <option value="+x">+X</option>
              <option value="-x">−X</option>
              <option value="+y">+Y</option>
              <option value="-y">−Y</option>
              <option value="+z">+Z</option>
              <option value="-z">−Z</option>
            </select>
          </div>
          {curvePoints.length > 0 && (
            <span className="text-[10px] text-zinc-500">
              {curvePoints.length} control point
              {curvePoints.length !== 1 ? "s" : ""}
            </span>
          )}
        </Section>
      )}

      {/* ── Hook / Flap (only when hook tool active) ──── */}
      {activeTool === "hook" && (
        <Section label="Flap / Uncurve">
          <p className="text-[10px] text-emerald-400/80 leading-tight">
            Click to define hinge, paint a region, then toggle to peel the flap
            open.
          </p>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={toggleFlap}
              disabled={hookPoints.length < 2}
              className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-white disabled:opacity-30 ${
                flapActive
                  ? "bg-amber-600 hover:bg-amber-500"
                  : "bg-teal-600/80 hover:bg-teal-500"
              }`}
            >
              <Zap size={12} /> {flapActive ? "Deactivate" : "Activate"}
            </button>
            <button
              onClick={clearHookPoints}
              disabled={hookPoints.length === 0}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/80 disabled:opacity-30"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>
          <RangeRow
            label="Angle"
            value={hookSettings.angle}
            min={0}
            max={360}
            step={5}
            onChange={(v) => setHookSettings({ angle: v })}
          />
          <div className="flex items-center gap-2">
            <span className="w-14 text-[11px] text-zinc-400">Direction</span>
            <select
              value={hookSettings.direction}
              onChange={(e) =>
                setHookSettings({ direction: e.target.value as CurveDirection })
              }
              className="flex-1 rounded bg-zinc-800 text-xs text-zinc-300 px-1.5 py-1 border border-zinc-700"
            >
              <option value="auto">Auto</option>
              <option value="+x">+X</option>
              <option value="-x">−X</option>
              <option value="+y">+Y</option>
              <option value="-y">−Y</option>
              <option value="+z">+Z</option>
              <option value="-z">−Z</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={hookSettings.flatten}
              onChange={() =>
                setHookSettings({ flatten: !hookSettings.flatten })
              }
              className="accent-indigo-500"
            />
            Flatten flap
          </label>
          {hookPoints.length > 0 && (
            <span className="text-[10px] text-zinc-500">
              {hookPoints.length} point{hookPoints.length !== 1 ? "s" : ""}
            </span>
          )}
        </Section>
      )}

      {/* ── Seam / Region Split (only when seam tool) ──── */}
      {activeTool === "seam" && (
        <Section label="Seam / Region Split">
          <p className="text-[10px] text-zinc-500 leading-tight">
            Paint seam lines on the mesh. Then auto-split into regions for
            independent UV solving.
          </p>
          <button
            onClick={autoSplitRegions}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs bg-indigo-600/80 text-white hover:bg-indigo-500"
          >
            <Scissors size={12} /> Auto-Split Regions
          </button>
        </Section>
      )}

      {/* ── Regions (only when region tool active) ──────── */}
      {activeTool === "region" && (
        <Section label="Regions">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showRegionOverlay}
              onChange={() => setShowRegionOverlay(!showRegionOverlay)}
              className="accent-indigo-500"
            />
            Show region colours
          </label>

          <span className="text-[10px] text-zinc-500 mt-1">Paint Region</span>
          <RangeRow
            label="Brush"
            value={brush.radius}
            min={0.05}
            max={2}
            step={0.05}
            onChange={(v) => setBrush({ radius: v })}
          />
          <div className="flex gap-1 flex-wrap">
            {REGION_IDS.map((id) => (
              <button
                key={id}
                onClick={() => {
                  setActiveRegionId(id);
                  setRegionEraseMode(false);
                }}
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                  !regionEraseMode && activeRegionId === id
                    ? REGION_BTN_ACTIVE[id]
                    : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/80"
                }`}
                style={{ borderLeft: `3px solid ${REGION_DOT_COLORS[id]}` }}
              >
                R{id}
              </button>
            ))}
            <button
              onClick={() => setRegionEraseMode(!regionEraseMode)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                regionEraseMode
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/80"
              }`}
            >
              <Eraser size={10} className="inline -mt-0.5 mr-0.5" />
              Erase
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={regionFilterEnabled}
              onChange={() => setRegionFilterEnabled(!regionFilterEnabled)}
              className="accent-indigo-500"
            />
            Restrict sculpt to region
          </label>
          {regionFilterEnabled && (
            <div className="flex gap-1 flex-wrap">
              {REGION_IDS.map((id) => (
                <button
                  key={id}
                  onClick={() => setWorkingRegionId(id)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                    workingRegionId === id
                      ? REGION_BTN_ACTIVE[id]
                      : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/80"
                  }`}
                  style={{ borderLeft: `3px solid ${REGION_DOT_COLORS[id]}` }}
                >
                  R{id}
                </button>
              ))}
            </div>
          )}

          <span className="text-[10px] text-zinc-500 mt-1">Clear Regions</span>
          <div className="flex gap-1 flex-wrap">
            {REGION_IDS.map((id) => (
              <button
                key={id}
                onClick={() => clearRegion(id)}
                className="rounded px-1.5 py-0.5 text-[10px] bg-zinc-800/60 text-zinc-400 hover:bg-red-700/60 hover:text-white transition-colors"
                style={{ borderLeft: `3px solid ${REGION_DOT_COLORS[id]}` }}
                title={`Clear region R${id}`}
              >
                <X size={8} className="inline -mt-0.5" /> R{id}
              </button>
            ))}
            <button
              onClick={clearAllRegions}
              className="rounded px-1.5 py-0.5 text-[10px] bg-zinc-800/60 text-zinc-400 hover:bg-red-700/60 hover:text-white transition-colors"
              title="Clear all regions"
            >
              <Trash2 size={10} className="inline -mt-0.5 mr-0.5" />
              All
            </button>
          </div>
        </Section>
      )}

      {/* ── Mesh Shape (collapsible) ──────────────────────── */}
      <Section label="Mesh Shape" collapsible defaultOpen={false}>
        <div className="flex gap-1.5 flex-wrap">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              onClick={() => setMeshShape(s.id)}
              className={toolBtnCls(s.id, meshShape)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Mesh Shape Sliders (body parts only) ──────────── */}
      {BODY_SHAPES.has(meshShape) && (
        <Section label="Shape Adjust" collapsible defaultOpen>
          <RangeRow
            label="Width"
            value={meshShapeParams.radiusX}
            min={0.3}
            max={2}
            step={0.05}
            onChange={(v) => setMeshShapeParams({ radiusX: v })}
          />
          <RangeRow
            label="Depth"
            value={meshShapeParams.radiusY}
            min={0.3}
            max={2}
            step={0.05}
            onChange={(v) => setMeshShapeParams({ radiusY: v })}
          />
          <RangeRow
            label="Height"
            value={meshShapeParams.height}
            min={0.5}
            max={2}
            step={0.05}
            onChange={(v) => setMeshShapeParams({ height: v })}
          />
          <RangeRow
            label="Taper"
            value={meshShapeParams.taper}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setMeshShapeParams({ taper: v })}
          />
          <RangeRow
            label="Flatness"
            value={meshShapeParams.flatness}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setMeshShapeParams({ flatness: v })}
          />
        </Section>
      )}

      {/* ── Photo Placement (collapsible) ─────────────────── */}
      <Section label="Photo Placement" collapsible defaultOpen={false}>
        <RangeRow
          label="Offset X"
          value={textureTransform.offsetX}
          min={-1}
          max={1}
          step={0.01}
          onChange={(v) => setTextureTransform({ offsetX: v })}
        />
        <RangeRow
          label="Offset Y"
          value={textureTransform.offsetY}
          min={-1}
          max={1}
          step={0.01}
          onChange={(v) => setTextureTransform({ offsetY: v })}
        />
        <RangeRow
          label="Scale"
          value={textureTransform.scale}
          min={0.1}
          max={5}
          step={0.05}
          onChange={(v) => setTextureTransform({ scale: v })}
        />
        <RangeRow
          label="Rotate"
          value={+((textureTransform.rotation * 180) / Math.PI).toFixed(1)}
          min={0}
          max={360}
          step={1}
          onChange={(v) =>
            setTextureTransform({ rotation: (v * Math.PI) / 180 })
          }
        />
      </Section>

      {/* ── Subdivision (collapsible) ─────────────────────── */}
      <Section label="Subdivision" collapsible defaultOpen={false}>
        <div className="flex gap-1.5">
          {SUBDIV_LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setSubdivisionLevel(l)}
              className={toolBtnCls(String(l), String(subdivisionLevel))}
            >
              {l}x
            </button>
          ))}
        </div>
        <span className="text-[10px] text-zinc-500">
          {vertexState
            ? `${(vertexState.current.length / 3).toLocaleString()} verts`
            : "—"}
        </span>
      </Section>

      {/* ── Symmetry (collapsible) ────────────────────────── */}
      <Section label="Symmetry" collapsible defaultOpen={false}>
        <div className="flex gap-1.5 items-center">
          <FlipHorizontal size={14} className="text-zinc-500" />
          {SYMMETRY_OPTIONS.map((o) => (
            <button
              key={o.label}
              onClick={() => setSymmetryAxis(o.id)}
              className={toolBtnCls(
                o.label,
                symmetryAxis ? symmetryAxis.toUpperCase() : "Off",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Overlays (collapsible) ────────────────────────── */}
      <Section label="Overlays" collapsible defaultOpen={false}>
        <div className="flex gap-1 flex-wrap">
          {OVERLAYS.map((o) => (
            <button
              key={o.id}
              onClick={() => setOverlay(o.id)}
              className={toolBtnCls(o.id, overlay)}
            >
              <Eye size={12} />
              {o.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Options (collapsible) ─────────────────────────── */}
      <Section label="Options" collapsible defaultOpen={false}>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={liveSmoothing}
            onChange={toggleSmooth}
            className="accent-indigo-500"
          />
          Live smoothing
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={() => setShowGrid(!showGrid)}
            className="accent-indigo-500"
          />
          Show grid
        </label>
        <RangeRow
          label="Light"
          value={lightIntensity}
          min={0.2}
          max={3}
          step={0.1}
          onChange={(v) => setLightIntensity(v)}
        />
      </Section>

      {/* ── Silhouette Overlay (collapsible) ──────────────── */}
      <Section label="Silhouette Overlay" collapsible defaultOpen={false}>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={silhouette.enabled}
            onChange={() => setSilhouette({ enabled: !silhouette.enabled })}
            className="accent-indigo-500"
          />
          Show reference image
        </label>
        {silhouette.enabled && (
          <>
            <RangeRow
              label="Opacity"
              value={silhouette.opacity}
              min={0.05}
              max={1}
              step={0.05}
              onChange={(v) => setSilhouette({ opacity: v })}
            />
            <RangeRow
              label="Offset X"
              value={silhouette.offsetX}
              min={-3}
              max={3}
              step={0.05}
              onChange={(v) => setSilhouette({ offsetX: v })}
            />
            <RangeRow
              label="Offset Y"
              value={silhouette.offsetY}
              min={-3}
              max={3}
              step={0.05}
              onChange={(v) => setSilhouette({ offsetY: v })}
            />
            <RangeRow
              label="Scale"
              value={silhouette.scale}
              min={0.2}
              max={4}
              step={0.05}
              onChange={(v) => setSilhouette({ scale: v })}
            />
          </>
        )}
      </Section>

      {/* ── Snapshots & Compare (collapsible) ─────────────── */}
      <Section label="Snapshots" collapsible defaultOpen={false}>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => takeSnapshot(`Snapshot ${snapshots.length + 1}`)}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/80"
          >
            <Camera size={14} /> Save
          </button>
          <button
            onClick={toggleCompare}
            disabled={!compareSnapshot}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/80 disabled:opacity-30"
          >
            <SplitSquareHorizontal size={14} />{" "}
            {showCompare ? "Hide" : "Compare"}
          </button>
        </div>
        {snapshots.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1">
            {snapshots.map((snap, idx) => (
              <button
                key={snap.id}
                onClick={() => setCompareSnapshot(snap)}
                className={`rounded px-1.5 py-0.5 text-[10px] ${
                  compareSnapshot?.id === snap.id
                    ? "bg-amber-600/80 text-white"
                    : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/80"
                }`}
              >
                #{idx + 1}
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* ── AI Assist ─────────────────────────────────────── */}
      {onAiAssist && (
        <button
          onClick={onAiAssist}
          disabled={aiAssisting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600/80 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-purple-500 transition-colors disabled:opacity-50"
        >
          <Sparkles size={14} /> {aiAssisting ? "Analysing…" : "AI Auto-Fix"}
        </button>
      )}

      {/* ── Stencil Settings (collapsible) ────────────────── */}
      <Section label="Stencil Output" collapsible defaultOpen={false}>
        <div className="flex gap-1.5 flex-wrap">
          {[1024, 2048, 3072, 4096].map((sz) => (
            <button
              key={sz}
              onClick={() => setStencilSettings({ outputSize: sz })}
              className={toolBtnCls(
                String(sz),
                String(stencilSettings.outputSize),
              )}
            >
              {sz}
            </button>
          ))}
        </div>
        <RangeRow
          label="Contrast"
          value={stencilSettings.contrast}
          min={0}
          max={2}
          step={0.05}
          onChange={(v) => setStencilSettings({ contrast: v })}
        />
        <RangeRow
          label="Line Thick"
          value={stencilSettings.lineThickness}
          min={0.5}
          max={3}
          step={0.1}
          onChange={(v) => setStencilSettings({ lineThickness: v })}
        />
        <RangeRow
          label="Threshold"
          value={stencilSettings.threshold}
          min={0}
          max={255}
          step={1}
          onChange={(v) => setStencilSettings({ threshold: v })}
        />
        <RangeRow
          label="Denoise"
          value={stencilSettings.denoiseIterations}
          min={0}
          max={5}
          step={1}
          onChange={(v) => setStencilSettings({ denoiseIterations: v })}
        />
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={stencilSettings.invert}
            onChange={() =>
              setStencilSettings({ invert: !stencilSettings.invert })
            }
            className="accent-indigo-500"
          />
          Invert
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={stencilSettings.edgeDetect}
            onChange={() =>
              setStencilSettings({ edgeDetect: !stencilSettings.edgeDetect })
            }
            className="accent-indigo-500"
          />
          Edge detect (outlines)
        </label>
        <RangeRow
          label="Smoothing"
          value={stencilSettings.smoothing}
          min={0}
          max={10}
          step={0.5}
          onChange={(v) => setStencilSettings({ smoothing: v })}
        />
      </Section>

      {/* ── Export Mode (collapsible) ─────────────────────── */}
      <Section label="Export Mode" collapsible defaultOpen={false}>
        <div className="flex gap-1.5">
          <button
            onClick={() => setExportMode("screenshot")}
            className={toolBtnCls("screenshot", exportMode)}
          >
            Screenshot
          </button>
          <button
            onClick={() => setExportMode("unwrap")}
            className={toolBtnCls("unwrap", exportMode)}
          >
            UV Unwrap
          </button>
        </div>
        {exportMode === "screenshot" && (
          <p className="text-[10px] text-zinc-500 leading-tight">
            Select the tattoo area on the 3D canvas, then export. Produces a
            crisp black/white stencil.
          </p>
        )}
      </Section>

      {/* ── Export ─────────────────────────────────────────── */}
      <button
        onClick={onExport}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-500 transition-colors shrink-0"
      >
        <Download size={16} /> Export Stencil
      </button>
    </div>
  );
}

// ── tiny sub-components ──────────────────────────────────────

function Section({
  label,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-1.5 border-t border-zinc-700/40 pt-2 mt-1">
      {collapsible ? (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors w-full text-left"
        >
          {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          {label}
        </button>
      ) : (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          {label}
        </span>
      )}
      {(!collapsible || open) && children}
    </div>
  );
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-[11px] text-zinc-400">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-indigo-500 h-1"
      />
      <span className="w-8 text-right text-[10px] text-zinc-500 tabular-nums">
        {value.toFixed(2)}
      </span>
    </div>
  );
}
