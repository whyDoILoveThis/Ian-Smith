"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Paintbrush, Layers, Palette } from "lucide-react";
import { PaintProvider, usePaintState } from "../hooks/usePaintState";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import MenuBar from "./MenuBar";
import Toolbar from "./Toolbar";
import ToolOptions from "./ToolOptions";
import PaintCanvas from "./PaintCanvas";
import LayerPanel from "./LayerPanel";
import ColorPanel from "./ColorPanel";
import StatusBar from "./StatusBar";
import { createCanvas, fillCanvas } from "../utils/canvasUtils";
import { loadImageFromFile } from "../utils/imageUtils";

// ─── Types ─────────────────────────────────────────────────────────────────
interface ProjectTab {
  id: string;
  name: string;
  initialFile?: File;
}

interface TabState {
  projects: ProjectTab[];
  activeId: string;
}

// ─── Tab Bar ───────────────────────────────────────────────────────────────
function TabBar({
  projects,
  activeId,
  onSelect,
  onClose,
  onNew,
}: {
  projects: ProjectTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="h-8 backdrop-blur-xl bg-white/[0.02] border-b border-white/[0.06] flex items-center select-none gap-0.5 px-1 overflow-x-auto shrink-0">
      {projects.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`group flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] transition-all max-w-[160px] shrink-0
            ${
              p.id === activeId
                ? "bg-white/[0.08] text-white/90 shadow-[0_0_8px_rgba(139,92,246,0.12)]"
                : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
            }`}
        >
          <span className="truncate">{p.name}</span>
          {projects.length > 1 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onClose(p.id);
              }}
              className="w-4 h-4 flex items-center justify-center rounded-full text-[10px] opacity-0 group-hover:opacity-100 hover:bg-white/[0.12] transition-all"
            >
              ×
            </span>
          )}
        </button>
      ))}
      <button
        onClick={onNew}
        className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.05] rounded-lg transition-all shrink-0 text-sm"
        title="New Project"
      >
        +
      </button>
    </div>
  );
}

// ─── Inner paint app (per-tab) ─────────────────────────────────────────────
function PaintAppInner({
  isActive,
  initialFile,
  onNameChange,
}: {
  isActive: boolean;
  initialFile?: File;
  onNameChange: (name: string) => void;
}) {
  const {
    state,
    dispatch,
    createLayerCanvas,
    getLayerCanvas,
    layerCanvasMap,
    requestRender,
  } = usePaintState();
  useKeyboardShortcuts(isActive);

  // Sync tab name with file name (ref avoids loop from callback identity changes)
  const onNameChangeRef = useRef(onNameChange);
  onNameChangeRef.current = onNameChange;
  useEffect(() => {
    onNameChangeRef.current(state.fileName);
  }, [state.fileName]);

  // Initialize on mount
  useEffect(() => {
    const firstLayer = state.layers[0];
    if (!firstLayer) return;

    if (getLayerCanvas(firstLayer.id)) {
      // Already initialized (tab switch back) — just re-render
      requestRender();
      return;
    }

    if (initialFile) {
      loadImageFromFile(initialFile).then((img) => {
        const w = img.width;
        const h = img.height;
        layerCanvasMap.current.clear();
        const id = firstLayer.id;
        const canvas = createCanvas(w, h);
        canvas.getContext("2d")!.drawImage(img, 0, 0);
        layerCanvasMap.current.set(id, canvas);
        dispatch({
          type: "RESET_STATE",
          state: {
            ...state,
            width: w,
            height: h,
            fileName: initialFile.name.replace(/\.[^.]+$/, ""),
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
      });
    } else {
      const canvas = createLayerCanvas(
        firstLayer.id,
        state.width,
        state.height,
      );
      fillCanvas(canvas, "#ffffff");
      requestRender();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<
    "none" | "tools" | "layers" | "colors"
  >("none");

  const toggleMobilePanel = (panel: "tools" | "layers" | "colors") => {
    setMobilePanel((prev) => (prev === panel ? "none" : panel));
  };

  return (
    <>
      <MenuBar />
      {/* Desktop tool options */}
      <div className="hidden md:block">
        <ToolOptions />
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex flex-1 min-h-0">
        {/* Left panel */}
        <div
          className={`transition-all duration-200 ease-in-out overflow-hidden ${leftOpen ? "w-[84px]" : "w-0"}`}
        >
          <Toolbar />
        </div>
        {/* Left toggle */}
        <button
          onClick={() => setLeftOpen((v) => !v)}
          className="w-4 flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/[0.04] transition-all shrink-0 border-r border-white/[0.04]"
          title={leftOpen ? "Hide Tools" : "Show Tools"}
        >
          <span className="text-[10px]">{leftOpen ? "‹" : "›"}</span>
        </button>

        <PaintCanvas />

        {/* Right toggle */}
        <button
          onClick={() => setRightOpen((v) => !v)}
          className="w-4 flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/[0.04] transition-all shrink-0 border-l border-white/[0.04]"
          title={rightOpen ? "Hide Panels" : "Show Panels"}
        >
          <span className="text-[10px]">{rightOpen ? "›" : "‹"}</span>
        </button>
        {/* Right panel */}
        <div
          className={`transition-all duration-200 ease-in-out overflow-hidden flex flex-col ${rightOpen ? "w-56" : "w-0"}`}
        >
          <LayerPanel />
          <ColorPanel />
        </div>
      </div>
      <div className="hidden md:block">
        <StatusBar />
      </div>

      {/* ─── Mobile layout ─── */}
      <div className="flex md:hidden flex-col flex-1 min-h-0 relative">
        {/* Canvas fills the space */}
        <PaintCanvas />

        {/* Mobile overlay panels */}
        {mobilePanel !== "none" && (
          <div className="absolute inset-0 z-30 flex flex-col">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobilePanel("none")}
            />
            <div className="relative z-10 mt-auto max-h-[70vh] overflow-y-auto backdrop-blur-2xl bg-[#0e0e1a]/95 border-t border-white/[0.1] rounded-t-2xl">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {mobilePanel === "tools"
                    ? "Tools"
                    : mobilePanel === "layers"
                      ? "Layers"
                      : "Colors"}
                </span>
                <button
                  onClick={() => setMobilePanel("none")}
                  className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 text-lg"
                >
                  ×
                </button>
              </div>
              <div className="p-2">
                {mobilePanel === "tools" && (
                  <div className="flex flex-col gap-2">
                    <Toolbar />
                    <div className="border-t border-white/[0.06] pt-2">
                      <ToolOptions />
                    </div>
                  </div>
                )}
                {mobilePanel === "layers" && <LayerPanel />}
                {mobilePanel === "colors" && <ColorPanel />}
              </div>
            </div>
          </div>
        )}

        {/* Mobile status bar */}
        <StatusBar />

        {/* Mobile bottom bar */}
        <div className="h-12 backdrop-blur-xl bg-[#0e0e1a]/95 border-t border-white/[0.06] flex items-center justify-around select-none shrink-0 px-2 gap-1 z-20">
          <button
            onClick={() => toggleMobilePanel("tools")}
            className={`flex-1 h-10 flex flex-col items-center justify-center rounded-xl text-[10px] transition-all ${mobilePanel === "tools" ? "bg-violet-500/20 text-violet-400" : "text-white/40 hover:text-white/70"}`}
          >
            <Paintbrush size={18} />
            <span>Tools</span>
          </button>
          <button
            onClick={() => toggleMobilePanel("layers")}
            className={`flex-1 h-10 flex flex-col items-center justify-center rounded-xl text-[10px] transition-all ${mobilePanel === "layers" ? "bg-cyan-500/20 text-cyan-400" : "text-white/40 hover:text-white/70"}`}
          >
            <Layers size={18} />
            <span>Layers</span>
          </button>
          <button
            onClick={() => toggleMobilePanel("colors")}
            className={`flex-1 h-10 flex flex-col items-center justify-center rounded-xl text-[10px] transition-all ${mobilePanel === "colors" ? "bg-fuchsia-500/20 text-fuchsia-400" : "text-white/40 hover:text-white/70"}`}
          >
            <Palette size={18} />
            <span>Colors</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main exported component ───────────────────────────────────────────────
export default function ItsPaintApp() {
  const [tabState, setTabState] = useState<TabState>({
    projects: [{ id: "project-1", name: "Untitled" }],
    activeId: "project-1",
  });
  const [dragOver, setDragOver] = useState(false);
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const dragCounter = useRef(0);

  const addProject = useCallback((name: string, file?: File) => {
    const id = `project-${Date.now()}`;
    setTabState((prev) => ({
      projects: [...prev.projects, { id, name, initialFile: file }],
      activeId: id,
    }));
  }, []);

  const removeProject = useCallback((id: string) => {
    setTabState((prev) => {
      const idx = prev.projects.findIndex((p) => p.id === id);
      const filtered = prev.projects.filter((p) => p.id !== id);
      if (filtered.length === 0) {
        const newId = `project-${Date.now()}`;
        return { projects: [{ id: newId, name: "Untitled" }], activeId: newId };
      }
      if (prev.activeId !== id) return { ...prev, projects: filtered };
      const newIdx = Math.min(idx, filtered.length - 1);
      return { projects: filtered, activeId: filtered[newIdx].id };
    });
  }, []);

  const selectProject = useCallback((id: string) => {
    setTabState((prev) => ({ ...prev, activeId: id }));
  }, []);

  const updateProjectName = useCallback((id: string, name: string) => {
    setTabState((prev) => {
      const proj = prev.projects.find((p) => p.id === id);
      if (proj && proj.name === name) return prev;
      return {
        ...prev,
        projects: prev.projects.map((p) => (p.id === id ? { ...p, name } : p)),
      };
    });
  }, []);

  const requestClose = useCallback((id: string) => {
    setConfirmClose(id);
  }, []);

  // Drag-and-drop handlers
  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragOver(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      for (const file of files) {
        addProject(file.name.replace(/\.[^.]+$/, ""), file);
      }
    },
    [addProject],
  );

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden relative"
      style={{
        background:
          "linear-gradient(135deg, #0a0a14 0%, #0d0d1a 40%, #0f0a18 70%, #0a0a14 100%)",
        color: "rgba(255,255,255,0.85)",
      }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Subtle ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-600/[0.04] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-cyan-600/[0.03] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-500/[0.02] rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="flex flex-col h-full relative z-10">
        <TabBar
          projects={tabState.projects}
          activeId={tabState.activeId}
          onSelect={selectProject}
          onClose={requestClose}
          onNew={() => addProject("Untitled")}
        />

        {/* Project instances — PaintProvider stays mounted per tab, inner content only renders for active */}
        {tabState.projects.map((proj) => (
          <PaintProvider key={proj.id}>
            {proj.id === tabState.activeId && (
              <PaintAppInner
                isActive={true}
                initialFile={proj.initialFile}
                onNameChange={(name) => updateProjectName(proj.id, name)}
              />
            )}
          </PaintProvider>
        ))}
      </div>

      {/* Confirm close tab modal */}
      {confirmClose && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="backdrop-blur-2xl bg-white/[0.06] border border-white/[0.1] rounded-2xl p-6 shadow-2xl w-[90vw] max-w-[320px]">
            <h3 className="text-sm font-bold bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent mb-2">
              Close Project?
            </h3>
            <p className="text-[12px] text-white/50 mb-5">
              Are you sure you want to close{" "}
              <span className="text-white/80 font-medium">
                {tabState.projects.find((p) => p.id === confirmClose)?.name ??
                  "this project"}
              </span>
              ? Any unsaved changes will be lost.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmClose(null)}
                className="px-4 py-1.5 text-[11px] text-white/50 hover:text-white/80 bg-white/[0.06] hover:bg-white/[0.1] rounded-full border border-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeProject(confirmClose);
                  setConfirmClose(null);
                }}
                className="px-4 py-1.5 text-[11px] text-white font-medium bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 rounded-full shadow-[0_0_16px_rgba(244,63,94,0.3)] transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drag-and-drop overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-50 backdrop-blur-sm bg-violet-500/[0.08] flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 p-8 rounded-3xl border-2 border-dashed border-violet-400/40 bg-white/[0.04]">
            <span className="text-4xl">🖼</span>
            <span className="text-lg font-medium bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Drop images to open
            </span>
            <span className="text-[11px] text-white/30">
              Each file opens in a new tab
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
