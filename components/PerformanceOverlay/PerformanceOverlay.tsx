"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { usePerformanceMetrics, shortenURL } from "./usePerformanceMetrics";
import type { PerformanceMetrics, PerformanceOverlayProps } from "./types";

const STORAGE_KEY = "__perf_overlay_state";
const INITIAL: PerformanceMetrics = {
  fps: 0,
  avgFps: 0,
  frameTime: 0,
  longTaskCount: 0,
  longTasks: [],
};

/* ── localStorage helpers ──────────────────────────────────────────── */

interface PersistedState {
  x: number;
  y: number;
  minimized: boolean;
}

function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode — ignore */
  }
}

/* ── Styles (inline to keep overlay fully self-contained) ──────────── */

const baseOverlay: CSSProperties = {
  position: "fixed",
  zIndex: 2147483647,
  borderRadius: 10,
  background: "rgba(15, 15, 20, 0.65)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.35)",
  fontFamily:
    "'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
  fontSize: 11,
  lineHeight: 1.7,
  color: "rgba(255, 255, 255, 0.78)",
  userSelect: "none" as const,
  WebkitUserSelect: "none" as const,
  touchAction: "none",
};

const dragHandle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 3,
  padding: "4px 0 2px",
  cursor: "grab",
  pointerEvents: "auto",
};

const dot: CSSProperties = {
  width: 4,
  height: 4,
  borderRadius: "50%",
  background: "rgba(255, 255, 255, 0.22)",
};

const headerRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 4,
};

const titleStyle: CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 1.6,
  textTransform: "uppercase",
  color: "rgba(255, 255, 255, 0.35)",
};

const headerBtns: CSSProperties = {
  display: "flex",
  gap: 4,
  alignItems: "center",
};

const smallBtn: CSSProperties = {
  background: "none",
  border: "none",
  color: "rgba(255, 255, 255, 0.4)",
  cursor: "pointer",
  padding: "0 2px",
  fontSize: 14,
  lineHeight: 1,
  pointerEvents: "auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const infoBtn: CSSProperties = {
  ...smallBtn,
  fontSize: 11,
  fontWeight: 700,
  width: 16,
  height: 16,
  borderRadius: "50%",
  border: "1px solid rgba(255, 255, 255, 0.15)",
};

const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  pointerEvents: "none",
};

const label: CSSProperties = {
  color: "rgba(255, 255, 255, 0.45)",
};

const accent: CSSProperties = {
  color: "#f59e0b",
  fontWeight: 600,
};

const dimAccent: CSSProperties = {
  color: "rgba(245, 158, 11, 0.7)",
};

const warn: CSSProperties = {
  color: "#ef4444",
  fontWeight: 600,
};

const minimizedBtn: CSSProperties = {
  position: "fixed",
  zIndex: 2147483647,
  width: 34,
  height: 34,
  borderRadius: 9,
  background: "rgba(15, 15, 20, 0.65)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  pointerEvents: "auto",
  touchAction: "none",
  padding: 0,
  color: "#f59e0b",
};

const detailPanel: CSSProperties = {
  marginTop: 6,
  padding: "6px 0 2px",
  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
  maxHeight: "60vh",
  overflowY: "auto",
  pointerEvents: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(255,255,255,0.12) transparent",
};

const detailTitle: CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  color: "rgba(255, 255, 255, 0.3)",
  marginBottom: 4,
};

const taskCard: CSSProperties = {
  padding: "4px 0",
  borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
};

const taskHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  fontSize: 10,
  lineHeight: 1.5,
};

const taskDuration: CSSProperties = {
  color: "#ef4444",
  fontWeight: 600,
  fontSize: 10,
  whiteSpace: "nowrap",
};

const taskTime: CSSProperties = {
  color: "rgba(255, 255, 255, 0.3)",
  fontSize: 9,
};

const scriptRow: CSSProperties = {
  fontSize: 9,
  lineHeight: 1.5,
  color: "rgba(255, 255, 255, 0.4)",
  paddingLeft: 6,
  borderLeft: "2px solid rgba(245, 158, 11, 0.2)",
  marginTop: 2,
  marginBottom: 2,
  wordBreak: "break-all" as const,
};

const scriptLabel: CSSProperties = {
  color: "rgba(255, 255, 255, 0.25)",
  fontSize: 8,
  textTransform: "uppercase" as const,
  letterSpacing: 0.5,
};

const scriptValue: CSSProperties = {
  color: "rgba(255, 255, 255, 0.6)",
  fontSize: 9,
};

const scriptFn: CSSProperties = {
  color: "#f59e0b",
  fontSize: 9,
  fontWeight: 600,
};

const emptyMsg: CSSProperties = {
  fontSize: 10,
  color: "rgba(255, 255, 255, 0.25)",
  fontStyle: "italic",
};

const noAttribution: CSSProperties = {
  fontSize: 9,
  color: "rgba(255, 255, 255, 0.2)",
  fontStyle: "italic",
  paddingLeft: 6,
  marginTop: 2,
};

/* ── SVG Icons ─────────────────────────────────────────────────────── */

function GaugeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Outer arc (speedometer face — 180° top half) */}
      <path d="M4.93 4.93A10 10 0 0 1 22 12" />
      <path d="M2 12a10 10 0 0 1 2.93-7.07" />
      <path d="M22 12a10 10 0 0 1-17.07 7.07" />
      {/* Tick marks */}
      <path d="M6.34 6.34l1.06 1.06" strokeWidth="1.4" />
      <path d="M12 4v1.5" strokeWidth="1.4" />
      <path d="M17.66 6.34l-1.06 1.06" strokeWidth="1.4" />
      <path d="M20 12h-1.5" strokeWidth="1.4" />
      {/* Needle pointing upper-right (~45°) */}
      <line
        x1="12"
        y1="12"
        x2="16.5"
        y2="7.5"
        stroke="#f59e0b"
        strokeWidth="2"
      />
      {/* Center dot */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function PerformanceOverlay({
  enabled,
}: PerformanceOverlayProps) {
  const isEnabled = enabled ?? process.env.NODE_ENV === "development";
  const [metrics, setMetrics] = useState<PerformanceMetrics>(INITIAL);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: -1, y: 12 }); // x = -1 means "not yet loaded"
  const [showDetails, setShowDetails] = useState(false);
  const initialized = useRef(false);

  const dragging = useRef(false);
  const didDrag = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLElement | null>(null);

  const setOverlayRef = useCallback((el: HTMLElement | null) => {
    overlayRef.current = el;
  }, []);

  const handleUpdate = useCallback((m: PerformanceMetrics) => {
    setMetrics(m);
  }, []);

  usePerformanceMetrics(handleUpdate, isEnabled);

  /* ── Load persisted state on mount ─────────────────────────────── */

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const saved = loadState();
    if (saved) {
      // Clamp to current viewport
      const x = Math.min(Math.max(0, saved.x), window.innerWidth - 40);
      const y = Math.min(Math.max(0, saved.y), window.innerHeight - 40);
      setPos({ x, y });
      setMinimized(saved.minimized);
    } else {
      setPos({ x: window.innerWidth - 194, y: 12 });
    }
  }, []);

  /* ── Persist on change ─────────────────────────────────────────── */

  useEffect(() => {
    if (pos.x === -1) return; // not initialized yet
    saveState({ x: pos.x, y: pos.y, minimized });
  }, [pos.x, pos.y, minimized]);

  /* ── Drag logic (pointer events — works for mouse + touch) ─────── */

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    e.preventDefault();
    dragging.current = true;
    didDrag.current = false;
    const el = overlayRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (!dragging.current) return;
    didDrag.current = true;
    const x = Math.max(0, e.clientX - dragOffset.current.x);
    const y = Math.max(0, e.clientY - dragOffset.current.y);
    setPos({ x, y });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (!isEnabled) return null;

  // Don't render until position is loaded
  if (pos.x === -1) return null;

  /* ── Minimized state ───────────────────────────────────────────── */

  if (minimized) {
    return (
      <button
        ref={setOverlayRef}
        style={{ ...minimizedBtn, left: pos.x, top: pos.y }}
        onClick={() => {
          if (!didDrag.current) setMinimized(false);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label="Expand performance overlay"
        data-perf-overlay
      >
        <GaugeIcon />
      </button>
    );
  }

  /* ── Expanded state ────────────────────────────────────────────── */

  const fpsColor =
    metrics.fps >= 55 ? accent : metrics.fps >= 30 ? dimAccent : warn;

  return (
    <div
      ref={setOverlayRef}
      style={{
        ...baseOverlay,
        left: pos.x,
        top: pos.y,
        minWidth: 170,
        padding: "0 14px 10px",
      }}
      aria-hidden="true"
      data-perf-overlay
    >
      {/* Drag handle */}
      <div
        style={dragHandle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span style={dot} />
        <span style={dot} />
        <span style={dot} />
        <span style={dot} />
        <span style={dot} />
      </div>

      {/* Title + buttons */}
      <div style={headerRow}>
        <div style={titleStyle}>perf</div>
        <div style={headerBtns}>
          <button
            style={{
              ...infoBtn,
              color: showDetails ? "#f59e0b" : "rgba(255, 255, 255, 0.4)",
              borderColor: showDetails
                ? "rgba(245, 158, 11, 0.3)"
                : "rgba(255, 255, 255, 0.15)",
            }}
            onClick={() => setShowDetails((v) => !v)}
            aria-label="Toggle long task details"
          >
            i
          </button>
          <button
            style={smallBtn}
            onClick={() => setMinimized(true)}
            aria-label="Minimize performance overlay"
          >
            &#x2212;
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div style={row}>
        <span style={label}>FPS</span>
        <span style={fpsColor}>{metrics.fps}</span>
      </div>
      <div style={row}>
        <span style={label}>Avg FPS</span>
        <span style={fpsColor}>{metrics.avgFps}</span>
      </div>
      <div style={row}>
        <span style={label}>Frame</span>
        <span style={accent}>{metrics.frameTime} ms</span>
      </div>
      <div style={row}>
        <span style={label}>Long tasks</span>
        <span style={metrics.longTaskCount > 0 ? warn : accent}>
          {metrics.longTaskCount}
        </span>
      </div>

      {/* Long task detail panel */}
      {showDetails && (
        <div style={detailPanel}>
          <div style={detailTitle}>long tasks (&gt;50ms)</div>
          {metrics.longTasks.length === 0 ? (
            <div style={emptyMsg}>No long tasks detected</div>
          ) : (
            [...metrics.longTasks].reverse().map((task, i) => (
              <div key={`${task.timestamp}-${i}`} style={taskCard}>
                <div style={taskHeader}>
                  <span style={taskTime}>{formatTime(task.timestamp)}</span>
                  <span style={taskDuration}>{task.duration} ms</span>
                </div>
                {task.scripts.length > 0 ? (
                  task.scripts.map((s, j) => (
                    <div key={j} style={scriptRow}>
                      {s.sourceFunctionName && (
                        <div>
                          <span style={scriptLabel}>fn </span>
                          <span style={scriptFn}>{s.sourceFunctionName}()</span>
                        </div>
                      )}
                      {s.sourceURL && (
                        <div>
                          <span style={scriptLabel}>src </span>
                          <span style={scriptValue}>
                            {shortenURL(s.sourceURL)}
                          </span>
                        </div>
                      )}
                      {s.invoker && (
                        <div>
                          <span style={scriptLabel}>via </span>
                          <span style={scriptValue}>{s.invoker}</span>
                        </div>
                      )}
                      {s.invokerType && (
                        <div>
                          <span style={scriptLabel}>type </span>
                          <span style={scriptValue}>{s.invokerType}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={noAttribution}>
                    No script attribution available
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
