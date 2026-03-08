// ─── Color Types ───────────────────────────────────────────────────────────
export interface RGBAColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

// ─── Tool Types ────────────────────────────────────────────────────────────
export type ToolType =
  | 'move'
  | 'rectSelect'
  | 'ellipseSelect'
  | 'lassoSelect'
  | 'magicWand'
  | 'paintBucket'
  | 'colorPicker'
  | 'pencil'
  | 'brush'
  | 'eraser'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'crop'
  | 'zoom'
  | 'gradient';

export interface ToolOptions {
  brushSize: number;
  brushHardness: number;
  opacity: number;
  tolerance: number; // magic wand & paint bucket
  antiAlias: boolean;
  contiguous: boolean; // magic wand flood fill
  fillStyle: 'solid' | 'none';
  strokeStyle: 'solid' | 'none';
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  gradientType: 'linear' | 'radial';
}

// ─── Selection ─────────────────────────────────────────────────────────────
export interface SelectionData {
  mask: Uint8Array; // 0 or 255 per pixel
  bounds: SelectionBounds;
}

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Layer Types ───────────────────────────────────────────────────────────
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

export interface LayerMeta {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  locked: boolean;
}

// ─── History ───────────────────────────────────────────────────────────────
export interface HistoryEntry {
  description: string;
  layerSnapshots: Map<string, ImageData>;
  selectionSnapshot: SelectionData | null;
}

// ─── Canvas Event ──────────────────────────────────────────────────────────
export interface CanvasPointerEvent {
  canvasX: number;
  canvasY: number;
  pressure: number;
  button: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

// ─── Tool Context (passed to tool handlers) ────────────────────────────────
export interface ToolContext {
  activeLayer: LayerMeta;
  getLayerCanvas: (id: string) => HTMLCanvasElement | null;
  width: number;
  height: number;
  primaryColor: RGBAColor;
  secondaryColor: RGBAColor;
  toolOptions: ToolOptions;
  selection: SelectionData | null;
  previewCanvas: HTMLCanvasElement | null;
  zoom: number;
  setSelection: (sel: SelectionData | null) => void;
  setPrimaryColor: (c: RGBAColor) => void;
  commitPreview: () => void;
  requestRender: () => void;
}

// ─── Main Paint State ──────────────────────────────────────────────────────
export interface PaintState {
  // Document
  width: number;
  height: number;
  fileName: string;

  // Layers (metadata only — actual canvases stored in ref map)
  layers: LayerMeta[];
  activeLayerId: string;

  // Tool
  activeTool: ToolType;
  toolOptions: ToolOptions;

  // Colors
  primaryColor: RGBAColor;
  secondaryColor: RGBAColor;
  savedPalette: RGBAColor[];

  // Selection
  selection: SelectionData | null;

  // View
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;

  // History
  history: HistoryEntry[];
  historyIndex: number;

  // UI state
  cursorPos: { x: number; y: number } | null;
  isDrawing: boolean;
  isDirty: boolean;
}

// ─── Action Types ──────────────────────────────────────────────────────────
export type PaintAction =
  | { type: 'SET_CANVAS_SIZE'; width: number; height: number }
  | { type: 'SET_FILE_NAME'; name: string }
  | { type: 'SET_ACTIVE_TOOL'; tool: ToolType }
  | { type: 'SET_TOOL_OPTIONS'; options: Partial<ToolOptions> }
  | { type: 'SET_PRIMARY_COLOR'; color: RGBAColor }
  | { type: 'SET_SECONDARY_COLOR'; color: RGBAColor }
  | { type: 'SWAP_COLORS' }
  | { type: 'ADD_PALETTE_COLOR'; color: RGBAColor }
  | { type: 'REMOVE_PALETTE_COLOR'; index: number }
  | { type: 'ADD_LAYER'; layer: LayerMeta }
  | { type: 'REMOVE_LAYER'; id: string }
  | { type: 'SET_ACTIVE_LAYER'; id: string }
  | { type: 'UPDATE_LAYER'; id: string; updates: Partial<LayerMeta> }
  | { type: 'REORDER_LAYERS'; layers: LayerMeta[] }
  | { type: 'DUPLICATE_LAYER'; id: string; newLayer: LayerMeta }
  | { type: 'MERGE_LAYER_DOWN'; id: string }
  | { type: 'SET_SELECTION'; selection: SelectionData | null }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; x: number; y: number }
  | { type: 'TOGGLE_GRID' }
  | { type: 'SET_CURSOR_POS'; pos: { x: number; y: number } | null }
  | { type: 'SET_IS_DRAWING'; drawing: boolean }
  | { type: 'SET_DIRTY'; dirty: boolean }
  | { type: 'PUSH_HISTORY'; entry: HistoryEntry }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET_STATE'; state: PaintState };

// ─── Dialog Types ──────────────────────────────────────────────────────────
export type DialogType = 'new' | 'resize' | 'canvasSize' | 'text' | null;

export interface DialogProps {
  open: boolean;
  onClose: () => void;
}
