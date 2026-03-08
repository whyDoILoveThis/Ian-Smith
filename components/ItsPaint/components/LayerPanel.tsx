"use client";

import React, { useCallback, useState } from "react";
import { usePaintState } from "../hooks/usePaintState";
import { BLEND_MODES } from "../lib/constants";
import { BlendMode, LayerMeta } from "../types/types";
import { cloneCanvas, createCanvas, clearCanvas } from "../utils/canvasUtils";

const rangeCls =
  "appearance-none h-1 rounded-full bg-white/10 accent-cyan-400 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(34,211,238,0.5)]";
const selCls =
  "bg-white/[0.06] text-white/70 text-[10px] rounded-full px-1.5 py-0.5 border border-white/[0.06] outline-none cursor-pointer";

function LayerItem({
  layer,
  active,
  onSelect,
  onToggleVisibility,
  onRename,
  onOpacityChange,
  onBlendModeChange,
  onLockToggle,
}: {
  layer: LayerMeta;
  active: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onRename: (name: string) => void;
  onOpacityChange: (opacity: number) => void;
  onBlendModeChange: (mode: BlendMode) => void;
  onLockToggle: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(layer.name);

  return (
    <div
      className={`flex flex-col gap-1 p-2 rounded-xl cursor-pointer transition-all duration-200
        ${
          active
            ? "bg-gradient-to-br from-cyan-500/15 to-violet-500/10 border border-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
            : "bg-white/[0.03] hover:bg-white/[0.06] border border-transparent"
        }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-1.5">
        {/* Visibility toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          className={`w-5 h-5 flex items-center justify-center text-xs rounded-full transition-all
            ${layer.visible ? "text-cyan-400 bg-cyan-400/10" : "text-white/20 bg-white/[0.03]"}`}
          title={layer.visible ? "Hide layer" : "Show layer"}
        >
          {layer.visible ? "👁" : "—"}
        </button>

        {/* Layer name */}
        {editing ? (
          <input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={() => {
              onRename(nameValue);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(nameValue);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-white/[0.08] text-white/90 text-[11px] px-2 py-0.5 rounded-full outline-none border border-cyan-400/30"
            autoFocus
          />
        ) : (
          <span
            className={`flex-1 text-[11px] truncate ${active ? "text-white/90" : "text-white/60"}`}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            {layer.name}
          </span>
        )}

        {/* Lock toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLockToggle();
          }}
          className={`w-5 h-5 flex items-center justify-center text-[10px] rounded-full transition-all
            ${layer.locked ? "text-amber-400 bg-amber-400/10" : "text-white/20 bg-white/[0.03]"}`}
          title={layer.locked ? "Unlock" : "Lock"}
        >
          {layer.locked ? "🔒" : "🔓"}
        </button>
      </div>

      {/* Opacity + blend mode (only for active layer) */}
      {active && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(layer.opacity * 100)}
            onChange={(e) => onOpacityChange(+e.target.value / 100)}
            onClick={(e) => e.stopPropagation()}
            className={`w-14 ${rangeCls}`}
            title="Opacity"
          />
          <span className="text-[10px] text-white/40 w-7 tabular-nums">
            {Math.round(layer.opacity * 100)}%
          </span>
          <select
            value={layer.blendMode}
            onChange={(e) => onBlendModeChange(e.target.value as BlendMode)}
            onClick={(e) => e.stopPropagation()}
            className={`${selCls} flex-1 min-w-0`}
          >
            {BLEND_MODES.map((bm) => (
              <option key={bm.value} value={bm.value}>
                {bm.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default function LayerPanel() {
  const {
    state,
    dispatch,
    getLayerCanvas,
    createLayerCanvas,
    removeLayerCanvas,
    pushHistory,
    requestRender,
  } = usePaintState();

  const addLayer = useCallback(() => {
    const id = `layer-${Date.now()}`;
    const layer: LayerMeta = {
      id,
      name: `Layer ${state.layers.length + 1}`,
      visible: true,
      opacity: 1,
      blendMode: "normal",
      locked: false,
    };
    createLayerCanvas(id);
    dispatch({ type: "ADD_LAYER", layer });
    requestRender();
  }, [state.layers.length, dispatch, createLayerCanvas, requestRender]);

  const removeLayer = useCallback(
    (id: string) => {
      if (state.layers.length <= 1) return;
      pushHistory("Delete Layer");
      dispatch({ type: "REMOVE_LAYER", id });
      removeLayerCanvas(id);
      requestRender();
    },
    [
      state.layers.length,
      dispatch,
      removeLayerCanvas,
      pushHistory,
      requestRender,
    ],
  );

  const duplicateLayer = useCallback(
    (id: string) => {
      const source = getLayerCanvas(id);
      const srcMeta = state.layers.find((l) => l.id === id);
      if (!source || !srcMeta) return;

      const newId = `layer-${Date.now()}`;
      const newCanvas = createLayerCanvas(newId);
      newCanvas.getContext("2d")!.drawImage(source, 0, 0);

      const newLayer: LayerMeta = {
        ...srcMeta,
        id: newId,
        name: `${srcMeta.name} Copy`,
      };
      dispatch({ type: "DUPLICATE_LAYER", id, newLayer });
      requestRender();
    },
    [state.layers, dispatch, getLayerCanvas, createLayerCanvas, requestRender],
  );

  const mergeDown = useCallback(
    (id: string) => {
      const idx = state.layers.findIndex((l) => l.id === id);
      if (idx <= 0) return;

      const topCanvas = getLayerCanvas(id);
      const bottomLayer = state.layers[idx - 1];
      const bottomCanvas = getLayerCanvas(bottomLayer.id);
      if (!topCanvas || !bottomCanvas) return;

      pushHistory("Merge Down");
      const ctx = bottomCanvas.getContext("2d")!;
      ctx.drawImage(topCanvas, 0, 0);
      dispatch({ type: "MERGE_LAYER_DOWN", id });
      removeLayerCanvas(id);
      requestRender();
    },
    [
      state.layers,
      dispatch,
      getLayerCanvas,
      removeLayerCanvas,
      pushHistory,
      requestRender,
    ],
  );

  const moveLayer = useCallback(
    (id: string, direction: -1 | 1) => {
      const idx = state.layers.findIndex((l) => l.id === id);
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= state.layers.length) return;
      const newLayers = [...state.layers];
      [newLayers[idx], newLayers[newIdx]] = [newLayers[newIdx], newLayers[idx]];
      dispatch({ type: "REORDER_LAYERS", layers: newLayers });
      requestRender();
    },
    [state.layers, dispatch, requestRender],
  );

  // Render layers in reverse order (top layer first)
  const reversedLayers = [...state.layers].reverse();

  const actionBtnCls =
    "flex-1 text-[10px] text-white/40 hover:text-white/80 rounded-lg px-1 py-1.5 transition-all hover:bg-white/[0.06] active:scale-95";

  return (
    <div className="w-full md:w-56 backdrop-blur-xl bg-white/[0.03] md:border-l border-white/[0.06] flex flex-col select-none">
      <div className="hidden md:flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Layers
        </span>
        <button
          onClick={addLayer}
          className="w-6 h-6 flex items-center justify-center text-sm text-cyan-400 hover:bg-cyan-400/10 rounded-full transition-all active:scale-90"
          title="Add Layer"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1">
        {reversedLayers.map((layer) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            active={state.activeLayerId === layer.id}
            onSelect={() =>
              dispatch({ type: "SET_ACTIVE_LAYER", id: layer.id })
            }
            onToggleVisibility={() =>
              dispatch({
                type: "UPDATE_LAYER",
                id: layer.id,
                updates: { visible: !layer.visible },
              })
            }
            onRename={(name) =>
              dispatch({
                type: "UPDATE_LAYER",
                id: layer.id,
                updates: { name },
              })
            }
            onOpacityChange={(opacity) => {
              dispatch({
                type: "UPDATE_LAYER",
                id: layer.id,
                updates: { opacity },
              });
              requestRender();
            }}
            onBlendModeChange={(blendMode) => {
              dispatch({
                type: "UPDATE_LAYER",
                id: layer.id,
                updates: { blendMode },
              });
              requestRender();
            }}
            onLockToggle={() =>
              dispatch({
                type: "UPDATE_LAYER",
                id: layer.id,
                updates: { locked: !layer.locked },
              })
            }
          />
        ))}
      </div>

      {/* Layer actions */}
      <div className="border-t border-white/[0.06] p-1.5 flex gap-0.5">
        <button
          onClick={() => duplicateLayer(state.activeLayerId)}
          className={actionBtnCls}
          title="Duplicate Layer"
        >
          Dup
        </button>
        <button
          onClick={() => mergeDown(state.activeLayerId)}
          className={actionBtnCls}
          title="Merge Down"
        >
          Merge↓
        </button>
        <button
          onClick={() => moveLayer(state.activeLayerId, 1)}
          className={actionBtnCls}
          title="Move Up"
        >
          ↑
        </button>
        <button
          onClick={() => moveLayer(state.activeLayerId, -1)}
          className={actionBtnCls}
          title="Move Down"
        >
          ↓
        </button>
        <button
          onClick={() => removeLayer(state.activeLayerId)}
          className="flex-1 text-[10px] text-rose-400/60 hover:text-rose-400 rounded-lg px-1 py-1.5 transition-all hover:bg-rose-400/10 active:scale-95"
          title="Delete Layer"
          disabled={state.layers.length <= 1}
        >
          Del
        </button>
      </div>
    </div>
  );
}
