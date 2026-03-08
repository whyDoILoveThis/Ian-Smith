import { BlendMode, PaintState, RGBAColor, ToolOptions, ToolType } from '../types/types';

// ─── Default Colors ────────────────────────────────────────────────────────
export const DEFAULT_PRIMARY: RGBAColor = { r: 0, g: 0, b: 0, a: 1 };
export const DEFAULT_SECONDARY: RGBAColor = { r: 255, g: 255, b: 255, a: 1 };

// ─── Default Tool Options ──────────────────────────────────────────────────
export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  brushSize: 4,
  brushHardness: 100,
  opacity: 100,
  tolerance: 32,
  antiAlias: true,
  contiguous: true,
  fillStyle: 'solid',
  strokeStyle: 'solid',
  strokeWidth: 2,
  fontSize: 24,
  fontFamily: 'Arial',
  gradientType: 'linear',
};

// ─── Default Canvas ────────────────────────────────────────────────────────
export const DEFAULT_WIDTH = 800;
export const DEFAULT_HEIGHT = 600;

// ─── History ───────────────────────────────────────────────────────────────
export const MAX_HISTORY = 50;

// ─── Zoom ──────────────────────────────────────────────────────────────────
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 32;
export const ZOOM_STEP = 1.15;

// ─── Checkerboard size for transparency ────────────────────────────────────
export const CHECKER_SIZE = 8;

// ─── Tool Definitions ──────────────────────────────────────────────────────
export interface ToolDef {
  type: ToolType;
  label: string;
  icon: string; // We'll use simple text/emoji icons
  shortcut: string;
  category: 'select' | 'draw' | 'shape' | 'utility';
}

export const TOOLS: ToolDef[] = [
  { type: 'move', label: 'Move', icon: '✥', shortcut: 'V', category: 'utility' },
  { type: 'pan', label: 'Pan', icon: '🤚', shortcut: 'Q', category: 'utility' },
  { type: 'rectSelect', label: 'Rectangle Select', icon: '⬜', shortcut: 'S', category: 'select' },
  { type: 'ellipseSelect', label: 'Ellipse Select', icon: '⬭', shortcut: 'S', category: 'select' },
  { type: 'lassoSelect', label: 'Lasso Select', icon: '⛶', shortcut: 'L', category: 'select' },
  { type: 'magicWand', label: 'Magic Wand', icon: '✦', shortcut: 'W', category: 'select' },
  { type: 'paintBucket', label: 'Paint Bucket', icon: '⬛', shortcut: 'G', category: 'draw' },
  { type: 'colorPicker', label: 'Color Picker', icon: '💧', shortcut: 'I', category: 'utility' },
  { type: 'pencil', label: 'Pencil', icon: '✏', shortcut: 'P', category: 'draw' },
  { type: 'brush', label: 'Brush', icon: '🖌', shortcut: 'B', category: 'draw' },
  { type: 'eraser', label: 'Eraser', icon: '🧹', shortcut: 'E', category: 'draw' },
  { type: 'line', label: 'Line', icon: '╱', shortcut: 'N', category: 'shape' },
  { type: 'rectangle', label: 'Rectangle', icon: '▭', shortcut: 'R', category: 'shape' },
  { type: 'ellipse', label: 'Ellipse', icon: '◯', shortcut: 'O', category: 'shape' },
  { type: 'text', label: 'Text', icon: 'T', shortcut: 'T', category: 'shape' },
  { type: 'gradient', label: 'Gradient', icon: '▦', shortcut: 'H', category: 'draw' },
  { type: 'crop', label: 'Crop', icon: '⬒', shortcut: 'C', category: 'utility' },
  { type: 'zoom', label: 'Zoom', icon: '🔍', shortcut: 'Z', category: 'utility' },
];

// ─── Blend Modes ───────────────────────────────────────────────────────────
export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
];

// ─── Default Palette ───────────────────────────────────────────────────────
export const DEFAULT_PALETTE: RGBAColor[] = [
  { r: 0, g: 0, b: 0, a: 1 },
  { r: 127, g: 127, b: 127, a: 1 },
  { r: 136, g: 0, b: 21, a: 1 },
  { r: 237, g: 28, b: 36, a: 1 },
  { r: 255, g: 127, b: 39, a: 1 },
  { r: 255, g: 242, b: 0, a: 1 },
  { r: 34, g: 177, b: 76, a: 1 },
  { r: 0, g: 162, b: 232, a: 1 },
  { r: 63, g: 72, b: 204, a: 1 },
  { r: 163, g: 73, b: 164, a: 1 },
  { r: 255, g: 255, b: 255, a: 1 },
  { r: 195, g: 195, b: 195, a: 1 },
  { r: 185, g: 122, b: 87, a: 1 },
  { r: 255, g: 174, b: 201, a: 1 },
  { r: 255, g: 201, b: 14, a: 1 },
  { r: 239, g: 228, b: 176, a: 1 },
  { r: 181, g: 230, b: 29, a: 1 },
  { r: 153, g: 217, b: 234, a: 1 },
  { r: 112, g: 146, b: 190, a: 1 },
  { r: 200, g: 191, b: 231, a: 1 },
];

// ─── Initial State Factory ─────────────────────────────────────────────────
export function createInitialState(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT): PaintState {
  return {
    width,
    height,
    fileName: 'Untitled',
    layers: [
      {
        id: 'layer-1',
        name: 'Background',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        locked: false,
      },
    ],
    activeLayerId: 'layer-1',
    activeTool: 'brush',
    toolOptions: { ...DEFAULT_TOOL_OPTIONS },
    primaryColor: { ...DEFAULT_PRIMARY },
    secondaryColor: { ...DEFAULT_SECONDARY },
    savedPalette: [...DEFAULT_PALETTE],
    selection: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    showGrid: false,
    history: [],
    historyIndex: -1,
    cursorPos: null,
    isDrawing: false,
    isDirty: false,
  };
}

// ─── Storage Keys ──────────────────────────────────────────────────────────
export const STORAGE_PREFIX = 'itspaint_';
export const STORAGE_KEYS = {
  palette: `${STORAGE_PREFIX}palette`,
  recentFiles: `${STORAGE_PREFIX}recent_files`,
  preferences: `${STORAGE_PREFIX}preferences`,
  autosave: `${STORAGE_PREFIX}autosave`,
} as const;
