'use client';

import React, { createContext, useCallback, useContext, useReducer, useRef } from 'react';
import { createInitialState, MAX_HISTORY } from '../lib/constants';
import {
  HistoryEntry,
  LayerMeta,
  PaintAction,
  PaintState,
  RGBAColor,
  SelectionData,
  ToolOptions,
  ToolType,
} from '../types/types';
import { cloneCanvas, createCanvas, getImageData } from '../utils/canvasUtils';

// ─── Reducer ───────────────────────────────────────────────────────────────
function paintReducer(state: PaintState, action: PaintAction): PaintState {
  switch (action.type) {
    case 'SET_CANVAS_SIZE':
      return { ...state, width: action.width, height: action.height, isDirty: true };

    case 'SET_FILE_NAME':
      return { ...state, fileName: action.name };

    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.tool };

    case 'SET_TOOL_OPTIONS':
      return { ...state, toolOptions: { ...state.toolOptions, ...action.options } };

    case 'SET_PRIMARY_COLOR':
      return { ...state, primaryColor: action.color };

    case 'SET_SECONDARY_COLOR':
      return { ...state, secondaryColor: action.color };

    case 'SWAP_COLORS':
      return { ...state, primaryColor: state.secondaryColor, secondaryColor: state.primaryColor };

    case 'ADD_PALETTE_COLOR':
      return { ...state, savedPalette: [...state.savedPalette, action.color] };

    case 'REMOVE_PALETTE_COLOR': {
      const p = [...state.savedPalette];
      p.splice(action.index, 1);
      return { ...state, savedPalette: p };
    }

    case 'ADD_LAYER':
      return {
        ...state,
        layers: [...state.layers, action.layer],
        activeLayerId: action.layer.id,
        isDirty: true,
      };

    case 'REMOVE_LAYER': {
      if (state.layers.length <= 1) return state;
      const filtered = state.layers.filter((l) => l.id !== action.id);
      const newActive =
        state.activeLayerId === action.id ? filtered[filtered.length - 1].id : state.activeLayerId;
      return { ...state, layers: filtered, activeLayerId: newActive, isDirty: true };
    }

    case 'SET_ACTIVE_LAYER':
      return { ...state, activeLayerId: action.id };

    case 'UPDATE_LAYER':
      return {
        ...state,
        layers: state.layers.map((l) => (l.id === action.id ? { ...l, ...action.updates } : l)),
        isDirty: true,
      };

    case 'REORDER_LAYERS':
      return { ...state, layers: action.layers, isDirty: true };

    case 'DUPLICATE_LAYER': {
      const idx = state.layers.findIndex((l) => l.id === action.id);
      if (idx === -1) return state;
      const newLayers = [...state.layers];
      newLayers.splice(idx + 1, 0, action.newLayer);
      return { ...state, layers: newLayers, activeLayerId: action.newLayer.id, isDirty: true };
    }

    case 'MERGE_LAYER_DOWN': {
      const idx = state.layers.findIndex((l) => l.id === action.id);
      if (idx <= 0) return state;
      const merged = state.layers.filter((_, i) => i !== idx);
      return { ...state, layers: merged, activeLayerId: merged[idx - 1].id, isDirty: true };
    }

    case 'SET_SELECTION':
      return { ...state, selection: action.selection };

    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.1, Math.min(32, action.zoom)) };

    case 'SET_PAN':
      return { ...state, panX: action.x, panY: action.y };

    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };

    case 'SET_CURSOR_POS':
      return { ...state, cursorPos: action.pos };

    case 'SET_IS_DRAWING':
      return { ...state, isDrawing: action.drawing };

    case 'SET_DIRTY':
      return { ...state, isDirty: action.dirty };

    case 'PUSH_HISTORY': {
      // Truncate any redo states
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(action.entry);
      // Limit history size
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return { ...state, history: newHistory, historyIndex: newHistory.length - 1 };
    }

    case 'UNDO':
      if (state.historyIndex < 0) return state;
      return { ...state, historyIndex: state.historyIndex - 1 };

    case 'REDO':
      if (state.historyIndex >= state.history.length - 1) return state;
      return { ...state, historyIndex: state.historyIndex + 1 };

    case 'RESET_STATE':
      return action.state;

    default:
      return state;
  }
}

// ─── Context Types ─────────────────────────────────────────────────────────
interface PaintContextType {
  state: PaintState;
  dispatch: React.Dispatch<PaintAction>;
  // Canvas refs
  layerCanvasMap: React.MutableRefObject<Map<string, HTMLCanvasElement>>;
  previewCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  compositeCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  // Convenience methods
  getLayerCanvas: (id: string) => HTMLCanvasElement | null;
  createLayerCanvas: (id: string, width?: number, height?: number) => HTMLCanvasElement;
  removeLayerCanvas: (id: string) => void;
  pushHistory: (description: string) => void;
  performUndo: () => void;
  performRedo: () => void;
  requestRender: () => void;
  renderCallbackRef: React.MutableRefObject<(() => void) | null>;
}

const PaintContext = createContext<PaintContextType | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────
export function PaintProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(paintReducer, undefined, () => createInitialState());

  const layerCanvasMap = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderCallbackRef = useRef<(() => void) | null>(null);

  const getLayerCanvas = useCallback((id: string) => {
    return layerCanvasMap.current.get(id) ?? null;
  }, []);

  const createLayerCanvas = useCallback(
    (id: string, width?: number, height?: number) => {
      const canvas = createCanvas(width ?? state.width, height ?? state.height);
      layerCanvasMap.current.set(id, canvas);
      return canvas;
    },
    [state.width, state.height]
  );

  const removeLayerCanvas = useCallback((id: string) => {
    layerCanvasMap.current.delete(id);
  }, []);

  const pushHistory = useCallback(
    (description: string) => {
      const snapshots = new Map<string, ImageData>();
      for (const layer of state.layers) {
        const canvas = layerCanvasMap.current.get(layer.id);
        if (canvas) {
          snapshots.set(layer.id, getImageData(canvas));
        }
      }
      const entry: HistoryEntry = {
        description,
        layerSnapshots: snapshots,
        selectionSnapshot: state.selection ? { ...state.selection, mask: new Uint8Array(state.selection.mask) } : null,
      };
      dispatch({ type: 'PUSH_HISTORY', entry });
    },
    [state.layers, state.selection]
  );

  const restoreHistory = useCallback(
    (entry: HistoryEntry) => {
      for (const [layerId, imageData] of entry.layerSnapshots) {
        const canvas = layerCanvasMap.current.get(layerId);
        if (canvas) {
          canvas.width = imageData.width;
          canvas.height = imageData.height;
          canvas.getContext('2d')!.putImageData(imageData, 0, 0);
        }
      }
      dispatch({ type: 'SET_SELECTION', selection: entry.selectionSnapshot });
      renderCallbackRef.current?.();
    },
    []
  );

  const performUndo = useCallback(() => {
    if (state.historyIndex < 0) return;
    // Save current state as a "redo" point if we're at the top
    if (state.historyIndex === state.history.length - 1) {
      // push current state so redo can restore it
      const snapshots = new Map<string, ImageData>();
      for (const layer of state.layers) {
        const c = layerCanvasMap.current.get(layer.id);
        if (c) snapshots.set(layer.id, getImageData(c));
      }
      const currentEntry: HistoryEntry = {
        description: 'current',
        layerSnapshots: snapshots,
        selectionSnapshot: state.selection,
      };
      // Store as "future" entry
      const newHistory = [...state.history];
      newHistory.push(currentEntry);
      dispatch({ type: 'RESET_STATE', state: { ...state, history: newHistory, historyIndex: state.historyIndex } });
    }
    const entry = state.history[state.historyIndex];
    if (entry) {
      restoreHistory(entry);
      dispatch({ type: 'UNDO' });
    }
  }, [state, restoreHistory]);

  const performRedo = useCallback(() => {
    const nextIndex = state.historyIndex + 1;
    if (nextIndex >= state.history.length) return;
    const entry = state.history[nextIndex];
    if (entry) {
      restoreHistory(entry);
      // If this was the "current" entry we pushed during undo, remove it and set index
      if (nextIndex === state.history.length - 1 && entry.description === 'current') {
        const newHistory = state.history.slice(0, -1);
        dispatch({ type: 'RESET_STATE', state: { ...state, history: newHistory, historyIndex: newHistory.length - 1 } });
      } else {
        dispatch({ type: 'REDO' });
      }
    }
  }, [state, restoreHistory]);

  const requestRender = useCallback(() => {
    renderCallbackRef.current?.();
  }, []);

  return (
    <PaintContext.Provider
      value={{
        state,
        dispatch,
        layerCanvasMap,
        previewCanvasRef,
        compositeCanvasRef,
        getLayerCanvas,
        createLayerCanvas,
        removeLayerCanvas,
        pushHistory,
        performUndo,
        performRedo,
        requestRender,
        renderCallbackRef,
      }}
    >
      {children}
    </PaintContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────
export function usePaintState() {
  const ctx = useContext(PaintContext);
  if (!ctx) throw new Error('usePaintState must be used within PaintProvider');
  return ctx;
}
