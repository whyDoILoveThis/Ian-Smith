/* ─────────────────────────────────────────────────────────────
   MeshEditorToolbar – tool palette, brush, overlays,
   subdivision, symmetry, snapshots, compare, AI assist
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback } from "react";
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
} from "lucide-react";
import { useMeshEditorStore } from "../store";
import type { SculptTool, MeshShape, OverlayMode, SubdivisionLevel, ExportMode } from "../types";

const BODY_SHAPES = new Set<MeshShape>([
  "forearm", "upper-arm", "calf", "thigh", "shoulder", "chest", "back",
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

  const setActiveTool = useMeshEditorStore((s) => s.setActiveTool);
  const setMeshShape = useMeshEditorStore((s) => s.setMeshShape);
  const setBrush = useMeshEditorStore((s) => s.setBrush);
  const setOverlay = useMeshEditorStore((s) => s.setOverlay);
  const toggleSmooth = useMeshEditorStore((s) => s.toggleLiveSmoothing);
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
  const exportMode = useMeshEditorStore((s) => s.exportMode);
  const setExportMode = useMeshEditorStore((s) => s.setExportMode);
  const textureTransform = useMeshEditorStore((s) => s.textureTransform);
  const setTextureTransform = useMeshEditorStore((s) => s.setTextureTransform);
  const meshShapeParams = useMeshEditorStore((s) => s.meshShapeParams);
  const setMeshShapeParams = useMeshEditorStore((s) => s.setMeshShapeParams);

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

  return (
    <div className="flex flex-col gap-3 overflow-y-auto rounded-xl border border-zinc-700/50 bg-zinc-900/80 p-3 backdrop-blur-sm text-zinc-200 w-56 select-none">
      {/* ── Mesh Shape ────────────────────────────────────── */}
      <Section label="Mesh Shape">
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
        <Section label="Shape Adjust">
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

      {/* ── Photo Placement ───────────────────────────────── */}
      <Section label="Photo Placement">
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
          value={+(textureTransform.rotation * 180 / Math.PI).toFixed(1)}
          min={0}
          max={360}
          step={1}
          onChange={(v) => setTextureTransform({ rotation: v * Math.PI / 180 })}
        />
      </Section>

      {/* ── Subdivision Level ─────────────────────────────── */}
      <Section label="Subdivision">
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
          {vertexState ? `${(vertexState.current.length / 3).toLocaleString()} verts` : "—"}
        </span>
      </Section>

      {/* ── Symmetry ──────────────────────────────────────── */}
      <Section label="Symmetry">
        <div className="flex gap-1.5 items-center">
          <FlipHorizontal size={14} className="text-zinc-500" />
          {SYMMETRY_OPTIONS.map((o) => (
            <button
              key={o.label}
              onClick={() => setSymmetryAxis(o.id)}
              className={toolBtnCls(o.label, symmetryAxis ? symmetryAxis.toUpperCase() : "Off")}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Sculpt Tools ──────────────────────────────────── */}
      <Section label="Sculpt Tools">
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
      </Section>

      {/* ── Brush Settings ────────────────────────────────── */}
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

      {/* ── Overlays ──────────────────────────────────────── */}
      <Section label="Overlays">
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

      {/* ── Options ───────────────────────────────────────── */}
      <Section label="Options">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={liveSmoothing}
            onChange={toggleSmooth}
            className="accent-indigo-500"
          />
          Live smoothing
        </label>
      </Section>

      {/* ── Snapshots & Compare ───────────────────────────── */}
      <Section label="Snapshots">
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
            <SplitSquareHorizontal size={14} /> {showCompare ? "Hide" : "Compare"}
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

      {/* ── Actions ───────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
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

      {/* ── Region painting (when region tool active) ────── */}
      {activeTool === "region" && (
        <Section label="Region Painting">
          <div className="flex gap-1.5 flex-wrap">
            {[0, 1, 2, 3, 4, 5].map((id) => (
              <button
                key={id}
                onClick={() => setActiveRegionId(id)}
                className={toolBtnCls(String(id), String(activeRegionId))}
              >
                R{id}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── Stencil Settings ──────────────────────────────── */}
      <Section label="Stencil Output">
        <div className="flex gap-1.5 flex-wrap">
          {[1024, 2048, 3072, 4096].map((sz) => (
            <button
              key={sz}
              onClick={() => setStencilSettings({ outputSize: sz })}
              className={toolBtnCls(String(sz), String(stencilSettings.outputSize))}
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
            onChange={() => setStencilSettings({ invert: !stencilSettings.invert })}
            className="accent-indigo-500"
          />
          Invert
        </label>
      </Section>

      {/* ── Export Mode ──────────────────────────────────────── */}
      <Section label="Export Mode">
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
            Select the tattoo area on the 3D canvas, then export. Produces a crisp black/white stencil.
          </p>
        )}
      </Section>

      {/* ── Export ─────────────────────────────────────────── */}
      <button
        onClick={onExport}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-500 transition-colors"
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
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
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
