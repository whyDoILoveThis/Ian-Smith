'use client';

import { useCallback, useEffect } from 'react';
import { usePaintState } from './usePaintState';
import { TOOLS, ZOOM_STEP } from '../lib/constants';
import { ToolType } from '../types/types';
import { createFullMask, deleteSelection, invertMask, getMaskBounds } from '../utils/selectionUtils';
import { copyCanvasToClipboard, loadImageFromClipboard } from '../utils/imageUtils';

export function useKeyboardShortcuts(isActive = true) {
  const {
    state,
    dispatch,
    getLayerCanvas,
    pushHistory,
    performUndo,
    performRedo,
    requestRender,
  } = usePaintState();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive) return;

      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();

      // ─── Ctrl + shortcuts ────────────────────────────────────────
      if (ctrl) {
        switch (key) {
          case 'z':
            e.preventDefault();
            if (shift) performRedo();
            else performUndo();
            return;
          case 'y':
            e.preventDefault();
            performRedo();
            return;
          case 'a':
            e.preventDefault();
            // Select All
            dispatch({
              type: 'SET_SELECTION',
              selection: {
                mask: createFullMask(state.width, state.height),
                bounds: { x: 0, y: 0, width: state.width, height: state.height },
              },
            });
            requestRender();
            return;
          case 'd':
            e.preventDefault();
            // Deselect
            dispatch({ type: 'SET_SELECTION', selection: null });
            requestRender();
            return;
          case 'i':
            if (shift) {
              e.preventDefault();
              // Invert Selection
              if (state.selection) {
                const inverted = invertMask(state.selection.mask);
                dispatch({
                  type: 'SET_SELECTION',
                  selection: {
                    mask: inverted,
                    bounds: getMaskBounds(inverted, state.width, state.height),
                  },
                });
                requestRender();
              }
            }
            return;
          case 'c':
            e.preventDefault();
            // Copy — copy active layer (or selection) to clipboard
            {
              const canvas = getLayerCanvas(state.activeLayerId);
              if (canvas) copyCanvasToClipboard(canvas);
            }
            return;
          case 'v':
            e.preventDefault();
            // Paste from clipboard
            loadImageFromClipboard().then((img) => {
              if (!img) return;
              const canvas = getLayerCanvas(state.activeLayerId);
              if (!canvas) return;
              pushHistory('Paste');
              const ctx = canvas.getContext('2d')!;
              ctx.drawImage(img, 0, 0);
              requestRender();
            });
            return;
          case '+':
          case '=':
            e.preventDefault();
            dispatch({ type: 'SET_ZOOM', zoom: state.zoom * ZOOM_STEP });
            return;
          case '-':
            e.preventDefault();
            dispatch({ type: 'SET_ZOOM', zoom: state.zoom / ZOOM_STEP });
            return;
          case '0':
            e.preventDefault();
            dispatch({ type: 'SET_ZOOM', zoom: 1 });
            dispatch({ type: 'SET_PAN', x: 0, y: 0 });
            return;
        }
        return;
      }

      // ─── Single key shortcuts ────────────────────────────────────
      switch (key) {
        case 'delete':
        case 'backspace': {
          // Delete selected pixels
          if (state.selection) {
            const canvas = getLayerCanvas(state.activeLayerId);
            if (canvas) {
              pushHistory('Delete Selection');
              deleteSelection(canvas, state.selection.mask);
              requestRender();
            }
          }
          return;
        }
        case 'escape':
          dispatch({ type: 'SET_SELECTION', selection: null });
          requestRender();
          return;
        case 'x':
          dispatch({ type: 'SWAP_COLORS' });
          return;
        case '[':
          dispatch({
            type: 'SET_TOOL_OPTIONS',
            options: { brushSize: Math.max(1, state.toolOptions.brushSize - 1) },
          });
          return;
        case ']':
          dispatch({
            type: 'SET_TOOL_OPTIONS',
            options: { brushSize: Math.min(500, state.toolOptions.brushSize + 1) },
          });
          return;
      }

      // S cycles through all selection tools
      if (key === 's') {
        const selectTools = TOOLS.filter((t) => t.category === 'select');
        const currentIdx = selectTools.findIndex((t) => t.type === state.activeTool);
        const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % selectTools.length;
        dispatch({ type: 'SET_ACTIVE_TOOL', tool: selectTools[nextIdx].type });
        return;
      }

      // Other tool shortcuts (single key)
      const toolDef = TOOLS.find(
        (t) => t.shortcut.toLowerCase() === key && t.shortcut.toLowerCase() !== 's'
      );
      if (toolDef) {
        dispatch({ type: 'SET_ACTIVE_TOOL', tool: toolDef.type });
      }
    },
    [isActive, state, dispatch, getLayerCanvas, pushHistory, performUndo, performRedo, requestRender]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
