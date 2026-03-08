"use client";

import React, { useCallback, useRef, useState } from "react";
import { usePaintState } from "../hooks/usePaintState";
import { ZOOM_STEP } from "../lib/constants";
import {
  clearCanvas,
  cloneCanvas,
  createCanvas,
  cropCanvas,
  fillCanvas,
  flipCanvas,
  getImageData,
  rotateCanvas,
} from "../utils/canvasUtils";
import {
  createFullMask,
  deleteSelection,
  getMaskBounds,
  invertMask,
} from "../utils/selectionUtils";
import {
  downloadCanvas,
  loadImageFromFile,
  ExportFormat,
} from "../utils/imageUtils";

export default function MenuBar() {
  const {
    state,
    dispatch,
    getLayerCanvas,
    createLayerCanvas,
    layerCanvasMap,
    pushHistory,
    performUndo,
    performRedo,
    requestRender,
  } = usePaintState();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [newWidth, setNewWidth] = useState(state.width);
  const [newHeight, setNewHeight] = useState(state.height);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [textValue, setTextValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeMenu = () => setOpenMenu(null);

  const toggleMenu = (name: string) => {
    setOpenMenu((prev) => (prev === name ? null : name));
  };

  // ─── File Operations ─────────────────────────────────────────────────
  const handleNew = useCallback(() => {
    setNewWidth(800);
    setNewHeight(600);
    setShowNewDialog(true);
    closeMenu();
  }, []);

  const createNew = useCallback(
    (w: number, h: number) => {
      // Reset all layers
      layerCanvasMap.current.clear();
      const id = "layer-1";
      const canvas = createCanvas(w, h);
      fillCanvas(canvas, "#ffffff");
      layerCanvasMap.current.set(id, canvas);

      dispatch({
        type: "RESET_STATE",
        state: {
          ...state,
          width: w,
          height: h,
          fileName: "Untitled",
          layers: [
            {
              id,
              name: "Background",
              visible: true,
              opacity: 1,
              blendMode: "normal",
              locked: false,
            },
          ],
          activeLayerId: id,
          selection: null,
          history: [],
          historyIndex: -1,
          zoom: 1,
          panX: 0,
          panY: 0,
          isDirty: false,
        },
      });
      setShowNewDialog(false);
      requestRender();
    },
    [state, dispatch, layerCanvasMap, requestRender],
  );

  const handleOpen = useCallback(() => {
    fileInputRef.current?.click();
    closeMenu();
  }, []);

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const img = await loadImageFromFile(file);
      const w = img.width;
      const h = img.height;

      layerCanvasMap.current.clear();
      const id = "layer-1";
      const canvas = createCanvas(w, h);
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      layerCanvasMap.current.set(id, canvas);

      dispatch({
        type: "RESET_STATE",
        state: {
          ...state,
          width: w,
          height: h,
          fileName: file.name.replace(/\.[^.]+$/, ""),
          layers: [
            {
              id,
              name: "Background",
              visible: true,
              opacity: 1,
              blendMode: "normal",
              locked: false,
            },
          ],
          activeLayerId: id,
          selection: null,
          history: [],
          historyIndex: -1,
          zoom: 1,
          panX: 0,
          panY: 0,
          isDirty: false,
        },
      });
      requestRender();
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [state, dispatch, layerCanvasMap, requestRender],
  );

  const handleSave = useCallback(
    async (format: ExportFormat = "png") => {
      // Flatten all layers
      const flat = createCanvas(state.width, state.height);
      const ctx = flat.getContext("2d")!;
      // Opaque formats need a white background
      if (format === "jpeg" || format === "bmp") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, state.width, state.height);
      }
      for (const layer of state.layers) {
        if (!layer.visible) continue;
        const lc = getLayerCanvas(layer.id);
        if (!lc) continue;
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation =
          layer.blendMode as GlobalCompositeOperation;
        ctx.drawImage(lc, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      await downloadCanvas(flat, state.fileName, format);
      dispatch({ type: "SET_DIRTY", dirty: false });
      closeMenu();
    },
    [state, getLayerCanvas, dispatch],
  );

  // ─── Edit Operations ─────────────────────────────────────────────────
  const handleSelectAll = useCallback(() => {
    dispatch({
      type: "SET_SELECTION",
      selection: {
        mask: createFullMask(state.width, state.height),
        bounds: { x: 0, y: 0, width: state.width, height: state.height },
      },
    });
    requestRender();
    closeMenu();
  }, [state.width, state.height, dispatch, requestRender]);

  const handleDeselect = useCallback(() => {
    dispatch({ type: "SET_SELECTION", selection: null });
    requestRender();
    closeMenu();
  }, [dispatch, requestRender]);

  const handleInvertSelection = useCallback(() => {
    if (!state.selection) return;
    const inverted = invertMask(state.selection.mask);
    dispatch({
      type: "SET_SELECTION",
      selection: {
        mask: inverted,
        bounds: getMaskBounds(inverted, state.width, state.height),
      },
    });
    requestRender();
    closeMenu();
  }, [state, dispatch, requestRender]);

  const handleDeleteSelection = useCallback(() => {
    if (!state.selection) return;
    const canvas = getLayerCanvas(state.activeLayerId);
    if (!canvas) return;
    pushHistory("Delete Selection");
    deleteSelection(canvas, state.selection.mask);
    requestRender();
    closeMenu();
  }, [state, getLayerCanvas, pushHistory, requestRender]);

  // ─── Image Operations ────────────────────────────────────────────────
  const applyToAllLayers = useCallback(
    (fn: (canvas: HTMLCanvasElement) => HTMLCanvasElement) => {
      pushHistory("Image Transform");
      for (const layer of state.layers) {
        const canvas = getLayerCanvas(layer.id);
        if (!canvas) continue;
        const result = fn(canvas);
        layerCanvasMap.current.set(layer.id, result);
      }
    },
    [state.layers, getLayerCanvas, layerCanvasMap, pushHistory],
  );

  const handleRotate = useCallback(
    (degrees: 90 | 180 | 270) => {
      applyToAllLayers((c) => rotateCanvas(c, degrees));
      if (degrees === 90 || degrees === 270) {
        dispatch({
          type: "SET_CANVAS_SIZE",
          width: state.height,
          height: state.width,
        });
      }
      dispatch({ type: "SET_SELECTION", selection: null });
      requestRender();
      closeMenu();
    },
    [state, dispatch, applyToAllLayers, requestRender],
  );

  const handleFlip = useCallback(
    (direction: "horizontal" | "vertical") => {
      applyToAllLayers((c) => flipCanvas(c, direction));
      requestRender();
      closeMenu();
    },
    [applyToAllLayers, requestRender],
  );

  const handleCropToSelection = useCallback(() => {
    if (!state.selection) return;
    const bounds = state.selection.bounds;
    if (bounds.width <= 0 || bounds.height <= 0) return;

    pushHistory("Crop");
    for (const layer of state.layers) {
      const canvas = getLayerCanvas(layer.id);
      if (!canvas) continue;
      const cropped = cropCanvas(
        canvas,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
      );
      layerCanvasMap.current.set(layer.id, cropped);
    }
    dispatch({
      type: "SET_CANVAS_SIZE",
      width: bounds.width,
      height: bounds.height,
    });
    dispatch({ type: "SET_SELECTION", selection: null });
    requestRender();
    closeMenu();
  }, [
    state,
    dispatch,
    getLayerCanvas,
    layerCanvasMap,
    pushHistory,
    requestRender,
  ]);

  const handleResize = useCallback(() => {
    setNewWidth(state.width);
    setNewHeight(state.height);
    setShowResizeDialog(true);
    closeMenu();
  }, [state.width, state.height]);

  const applyResize = useCallback(
    (w: number, h: number) => {
      pushHistory("Resize");
      for (const layer of state.layers) {
        const canvas = getLayerCanvas(layer.id);
        if (!canvas) continue;
        const resized = createCanvas(w, h);
        resized.getContext("2d")!.drawImage(canvas, 0, 0, w, h);
        layerCanvasMap.current.set(layer.id, resized);
      }
      dispatch({ type: "SET_CANVAS_SIZE", width: w, height: h });
      dispatch({ type: "SET_SELECTION", selection: null });
      setShowResizeDialog(false);
      requestRender();
    },
    [
      state.layers,
      dispatch,
      getLayerCanvas,
      layerCanvasMap,
      pushHistory,
      requestRender,
    ],
  );

  const handleFlattenImage = useCallback(() => {
    pushHistory("Flatten");
    const flat = createCanvas(state.width, state.height);
    const ctx = flat.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, state.width, state.height);
    for (const layer of state.layers) {
      if (!layer.visible) continue;
      const lc = getLayerCanvas(layer.id);
      if (!lc) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation =
        layer.blendMode as GlobalCompositeOperation;
      ctx.drawImage(lc, 0, 0);
    }
    // Clear all layers, replace with one
    layerCanvasMap.current.clear();
    const id = "layer-flat";
    layerCanvasMap.current.set(id, flat);
    dispatch({
      type: "RESET_STATE",
      state: {
        ...state,
        layers: [
          {
            id,
            name: "Background",
            visible: true,
            opacity: 1,
            blendMode: "normal",
            locked: false,
          },
        ],
        activeLayerId: id,
      },
    });
    requestRender();
    closeMenu();
  }, [
    state,
    dispatch,
    getLayerCanvas,
    layerCanvasMap,
    pushHistory,
    requestRender,
  ]);

  // ─── Text tool dialog trigger ────────────────────────────────────────
  const handleAddText = useCallback(() => {
    setShowTextDialog(true);
    closeMenu();
  }, []);

  const applyText = useCallback(() => {
    if (!textValue.trim()) {
      setShowTextDialog(false);
      return;
    }
    const canvas = getLayerCanvas(state.activeLayerId);
    if (!canvas) return;
    pushHistory("Add Text");
    const ctx = canvas.getContext("2d")!;
    ctx.font = `${state.toolOptions.fontSize}px ${state.toolOptions.fontFamily}`;
    ctx.fillStyle = `rgba(${state.primaryColor.r},${state.primaryColor.g},${state.primaryColor.b},${state.primaryColor.a})`;
    ctx.textBaseline = "top";
    // Place text at center if no cursor pos, or at cursor
    const x = state.cursorPos?.x ?? state.width / 4;
    const y = state.cursorPos?.y ?? state.height / 4;
    ctx.fillText(textValue, x, y);
    setShowTextDialog(false);
    setTextValue("");
    requestRender();
  }, [textValue, state, getLayerCanvas, pushHistory, requestRender]);

  // ─── Menu Definitions ────────────────────────────────────────────────
  const menus: Record<
    string,
    Array<{
      label: string;
      action: () => void;
      shortcut?: string;
      disabled?: boolean;
    }>
  > = {
    File: [
      { label: "New", action: handleNew, shortcut: "" },
      { label: "Open...", action: handleOpen, shortcut: "" },
      { label: "Save as PNG", action: () => handleSave("png") },
      { label: "Save as JPEG", action: () => handleSave("jpeg") },
      { label: "Save as WebP", action: () => handleSave("webp") },
      { label: "Save as ICO", action: () => handleSave("ico") },
      { label: "Save as BMP", action: () => handleSave("bmp") },
    ],
    Edit: [
      {
        label: "Undo",
        action: () => {
          performUndo();
          closeMenu();
        },
        shortcut: "Ctrl+Z",
      },
      {
        label: "Redo",
        action: () => {
          performRedo();
          closeMenu();
        },
        shortcut: "Ctrl+Y",
      },
      { label: "─", action: () => {}, disabled: true },
      { label: "Select All", action: handleSelectAll, shortcut: "Ctrl+A" },
      { label: "Deselect", action: handleDeselect, shortcut: "Ctrl+D" },
      {
        label: "Invert Selection",
        action: handleInvertSelection,
        shortcut: "Ctrl+Shift+I",
      },
      { label: "─", action: () => {}, disabled: true },
      {
        label: "Delete Selection",
        action: handleDeleteSelection,
        shortcut: "Delete",
      },
    ],
    Image: [
      { label: "Rotate 90° CW", action: () => handleRotate(90) },
      { label: "Rotate 90° CCW", action: () => handleRotate(270) },
      { label: "Rotate 180°", action: () => handleRotate(180) },
      { label: "─", action: () => {}, disabled: true },
      { label: "Flip Horizontal", action: () => handleFlip("horizontal") },
      { label: "Flip Vertical", action: () => handleFlip("vertical") },
      { label: "─", action: () => {}, disabled: true },
      {
        label: "Crop to Selection",
        action: handleCropToSelection,
        disabled: !state.selection,
      },
      { label: "Resize...", action: handleResize },
      { label: "Flatten Image", action: handleFlattenImage },
    ],
    View: [
      {
        label: "Zoom In",
        action: () => {
          dispatch({ type: "SET_ZOOM", zoom: state.zoom * ZOOM_STEP });
          closeMenu();
        },
        shortcut: "Ctrl+=",
      },
      {
        label: "Zoom Out",
        action: () => {
          dispatch({ type: "SET_ZOOM", zoom: state.zoom / ZOOM_STEP });
          closeMenu();
        },
        shortcut: "Ctrl+-",
      },
      {
        label: "Fit to Window",
        action: () => {
          dispatch({ type: "SET_ZOOM", zoom: 1 });
          dispatch({ type: "SET_PAN", x: 0, y: 0 });
          closeMenu();
        },
        shortcut: "Ctrl+0",
      },
      { label: "─", action: () => {}, disabled: true },
      {
        label: `${state.showGrid ? "✓ " : ""}Pixel Grid`,
        action: () => {
          dispatch({ type: "TOGGLE_GRID" });
          closeMenu();
        },
      },
    ],
    Text: [{ label: "Add Text...", action: handleAddText }],
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="h-9 bg-[#0e0e1a]/95 border-b border-white/[0.06] flex items-center select-none relative z-50 px-1">
        {/* App branding pill */}
        <span className="text-[11px] font-extrabold tracking-[0.15em] bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent px-3">
          ItsPaint
        </span>
        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Desktop menus */}
        <div className="hidden md:flex items-center">
          {Object.entries(menus).map(([name, items]) => (
            <div key={name} className="relative">
              <button
                className={`px-3 py-1.5 text-[11px] text-white/60 hover:text-white/90 rounded-lg transition-all
                  ${openMenu === name ? "bg-white/[0.08] text-white/90" : "hover:bg-white/[0.05]"}`}
                onClick={() => toggleMenu(name)}
                onMouseEnter={() => openMenu && setOpenMenu(name)}
              >
                {name}
              </button>

              {openMenu === name && (
                <div className="absolute top-full left-0 mt-1 backdrop-blur-md bg-slate-700/[0.06]  border border-white/[0.1] rounded-xl shadow-2xl shadow-black/50 min-w-[220px] py-1.5 z-50">
                  {items.map((item, i) =>
                    item.label === "─" ? (
                      <div
                        key={i}
                        className="border-t border-white/[0.06] my-1 mx-3"
                      />
                    ) : (
                      <button
                        key={i}
                        className={`w-full text-left px-3.5 py-1.5 text-[11px] flex justify-between items-center rounded-lg mx-auto transition-all
                          ${
                            item.disabled
                              ? "text-white/20 cursor-default"
                              : "text-white/70 hover:text-white hover:bg-white/[0.08]"
                          }`}
                        style={{
                          WebkitTextStroke: "0.4px black",
                          paintOrder: "stroke fill",
                        }}
                        onClick={() => !item.disabled && item.action()}
                        disabled={item.disabled}
                      >
                        <span>{item.label}</span>
                        {item.shortcut && (
                          <span className="text-white/25 ml-4 text-[10px] font-mono">
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden px-2 py-1 text-white/60 hover:text-white/90 text-lg"
          onClick={() => toggleMenu("_mobile")}
        >
          ☰
        </button>

        {/* Mobile full-width menu */}
        {openMenu === "_mobile" && (
          <div className="md:hidden absolute top-full left-0 right-0 mt-0 backdrop-blur-2xl bg-[#0e0e1a]/95 border-b border-white/[0.1] shadow-2xl shadow-black/50 max-h-[70vh] overflow-y-auto z-50">
            {Object.entries(menus).map(([name, items]) => (
              <div key={name}>
                <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent border-b border-white/[0.04]">
                  {name}
                </div>
                {items.map((item, i) =>
                  item.label === "─" ? (
                    <div
                      key={i}
                      className="border-t border-white/[0.06] my-0.5 mx-4"
                    />
                  ) : (
                    <button
                      key={i}
                      className={`w-full text-left px-4 py-2.5 text-[12px] flex justify-between items-center transition-all
                        ${item.disabled ? "text-white/20 cursor-default" : "text-white/70 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12]"}`}
                      onClick={() => {
                        if (!item.disabled) {
                          item.action();
                          closeMenu();
                        }
                      }}
                      disabled={item.disabled}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="text-white/25 ml-4 text-[10px] font-mono">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  ),
                )}
              </div>
            ))}
          </div>
        )}

        {openMenu && <div className="fixed inset-0 z-40" onClick={closeMenu} />}
      </div>

      {/* ─── Glass Dialog: New Image ─── */}
      {showNewDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="backdrop-blur-2xl bg-white/[0.06] border border-white/[0.1] rounded-2xl p-6 shadow-2xl w-[90vw] max-w-[320px]">
            <h3 className="text-sm font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-4">
              New Image
            </h3>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-[11px] text-white/60">
                Width
                <input
                  type="number"
                  min={1}
                  max={4096}
                  value={newWidth}
                  onChange={(e) => setNewWidth(+e.target.value)}
                  className="flex-1 bg-white/[0.06] text-white/80 rounded-full px-3 py-1.5 border border-white/[0.08] outline-none focus:border-violet-400/40"
                />
                <span className="text-white/30">px</span>
              </label>
              <label className="flex items-center gap-2 text-[11px] text-white/60">
                Height
                <input
                  type="number"
                  min={1}
                  max={4096}
                  value={newHeight}
                  onChange={(e) => setNewHeight(+e.target.value)}
                  className="flex-1 bg-white/[0.06] text-white/80 rounded-full px-3 py-1.5 border border-white/[0.08] outline-none focus:border-violet-400/40"
                />
                <span className="text-white/30">px</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowNewDialog(false)}
                className="px-4 py-1.5 text-[11px] text-white/50 hover:text-white/80 bg-white/[0.06] hover:bg-white/[0.1] rounded-full border border-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => createNew(newWidth, newHeight)}
                className="px-4 py-1.5 text-[11px] text-white font-medium bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 rounded-full shadow-[0_0_16px_rgba(139,92,246,0.3)] transition-all active:scale-95"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Glass Dialog: Resize ─── */}
      {showResizeDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="backdrop-blur-2xl bg-white/[0.06] border border-white/[0.1] rounded-2xl p-6 shadow-2xl w-[90vw] max-w-[320px]">
            <h3 className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
              Resize Image
            </h3>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-[11px] text-white/60">
                Width
                <input
                  type="number"
                  min={1}
                  max={4096}
                  value={newWidth}
                  onChange={(e) => setNewWidth(+e.target.value)}
                  className="flex-1 bg-white/[0.06] text-white/80 rounded-full px-3 py-1.5 border border-white/[0.08] outline-none focus:border-cyan-400/40"
                />
                <span className="text-white/30">px</span>
              </label>
              <label className="flex items-center gap-2 text-[11px] text-white/60">
                Height
                <input
                  type="number"
                  min={1}
                  max={4096}
                  value={newHeight}
                  onChange={(e) => setNewHeight(+e.target.value)}
                  className="flex-1 bg-white/[0.06] text-white/80 rounded-full px-3 py-1.5 border border-white/[0.08] outline-none focus:border-cyan-400/40"
                />
                <span className="text-white/30">px</span>
              </label>
              <span className="text-[10px] text-white/25">
                Current: {state.width} × {state.height}
              </span>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowResizeDialog(false)}
                className="px-4 py-1.5 text-[11px] text-white/50 hover:text-white/80 bg-white/[0.06] hover:bg-white/[0.1] rounded-full border border-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => applyResize(newWidth, newHeight)}
                className="px-4 py-1.5 text-[11px] text-white font-medium bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-full shadow-[0_0_16px_rgba(34,211,238,0.3)] transition-all active:scale-95"
              >
                Resize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Glass Dialog: Text ─── */}
      {showTextDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="backdrop-blur-2xl bg-white/[0.06] border border-white/[0.1] rounded-2xl p-6 shadow-2xl w-[90vw] max-w-[380px]">
            <h3 className="text-sm font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent mb-4">
              Add Text
            </h3>
            <textarea
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              className="w-full h-24 bg-white/[0.06] text-white/80 text-sm rounded-xl px-3 py-2 resize-none outline-none border border-white/[0.08] focus:border-pink-400/40 placeholder:text-white/20"
              placeholder="Type your text here..."
              autoFocus
            />
            <p className="text-[10px] text-white/25 mt-1.5">
              Text will be placed at cursor position or center of canvas.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowTextDialog(false);
                  setTextValue("");
                }}
                className="px-4 py-1.5 text-[11px] text-white/50 hover:text-white/80 bg-white/[0.06] hover:bg-white/[0.1] rounded-full border border-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={applyText}
                className="px-4 py-1.5 text-[11px] text-white font-medium bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 rounded-full shadow-[0_0_16px_rgba(244,63,94,0.3)] transition-all active:scale-95"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
