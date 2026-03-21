"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRTDBMetrics } from "../hooks/useRTDBMetrics";
import { formatBytes } from "../utils";
import type { RTDBTrackerOverlayProps, RTDBEvent } from "../types";

const STORAGE_KEY = "__rtdb_tracker_state";

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

/* ── Styles (inline — fully self-contained) ────────────────────────── */

const baseOverlay: CSSProperties = {
  position: "fixed",
  zIndex: 2147483646, // one below perf overlay
  borderRadius: 10,
  background: "rgba(10, 15, 25, 0.72)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(56, 189, 248, 0.12)",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
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
  background: "rgba(56, 189, 248, 0.25)",
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
  color: "rgba(56, 189, 248, 0.5)",
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

const readColor: CSSProperties = {
  color: "#38bdf8",
  fontWeight: 600,
};

const writeColor: CSSProperties = {
  color: "#f97316",
  fontWeight: 600,
};

const dataColor: CSSProperties = {
  color: "#a78bfa",
  fontWeight: 600,
};

const listenerColor: CSSProperties = {
  color: "#34d399",
  fontWeight: 600,
};

const minimizedBtn: CSSProperties = {
  position: "fixed",
  zIndex: 2147483646,
  width: 34,
  height: 34,
  borderRadius: 9,
  background: "rgba(10, 15, 25, 0.72)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(56, 189, 248, 0.12)",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  pointerEvents: "auto",
  touchAction: "none",
  padding: 0,
  color: "#38bdf8",
};

const detailPanel: CSSProperties = {
  marginTop: 6,
  padding: "6px 0 2px",
  borderTop: "1px solid rgba(56, 189, 248, 0.08)",
  maxHeight: "50vh",
  overflowY: "auto",
  pointerEvents: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(56,189,248,0.15) transparent",
};

const detailTitle: CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  color: "rgba(56, 189, 248, 0.35)",
  marginBottom: 4,
};

const eventCard: CSSProperties = {
  padding: "3px 0",
  borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
  fontSize: 10,
  lineHeight: 1.5,
};

const eventPath: CSSProperties = {
  color: "rgba(255, 255, 255, 0.5)",
  fontSize: 9,
  wordBreak: "break-all" as const,
};

const emptyMsg: CSSProperties = {
  fontSize: 10,
  color: "rgba(255, 255, 255, 0.25)",
  fontStyle: "italic",
};

/* ── SVG Icons ─────────────────────────────────────────────────────── */

function DatabaseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#38bdf8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
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

function truncatePath(path: string, max = 40): string {
  if (path.length <= max) return path;
  return "…" + path.slice(-(max - 1));
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function FirebaseRTDBTrackerOverlay({
  enabled,
}: RTDBTrackerOverlayProps) {
  const isEnabled = enabled ?? process.env.NODE_ENV === "development";
  const { metrics, resetMetrics } = useRTDBMetrics(isEnabled);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: -1, y: 12 });
  const [showDetails, setShowDetails] = useState(false);
  const [showListeners, setShowListeners] = useState(false);

  const initialized = useRef(false);
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLElement | null>(null);

  const setOverlayRef = useCallback((el: HTMLElement | null) => {
    overlayRef.current = el;
  }, []);

  /* ── Load persisted state on mount ─────────────────────────────── */

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const saved = loadState();
    if (saved) {
      const x = Math.min(Math.max(0, saved.x), window.innerWidth - 40);
      const y = Math.min(Math.max(0, saved.y), window.innerHeight - 40);
      setPos({ x, y });
      setMinimized(saved.minimized);
    } else {
      setPos({ x: window.innerWidth - 210, y: 56 });
    }
  }, []);

  /* ── Persist on change ─────────────────────────────────────────── */

  useEffect(() => {
    if (pos.x === -1) return;
    saveState({ x: pos.x, y: pos.y, minimized });
  }, [pos.x, pos.y, minimized]);

  /* ── Drag logic ────────────────────────────────────────────────── */

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
    const el = overlayRef.current;
    const elW = el?.offsetWidth ?? 190;
    const elH = el?.offsetHeight ?? 40;
    const rawX = e.clientX - dragOffset.current.x;
    const rawY = e.clientY - dragOffset.current.y;
    const x = Math.min(Math.max(0, rawX), window.innerWidth - elW);
    const y = Math.min(Math.max(0, rawY), window.innerHeight - elH);
    setPos({ x, y });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (!isEnabled) return null;
  if (pos.x === -1) return null;

  const totalBytes = metrics.readBytes + metrics.writeBytes;

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
        aria-label="Expand RTDB tracker"
        data-rtdb-overlay
      >
        <DatabaseIcon />
      </button>
    );
  }

  /* ── Expanded state ────────────────────────────────────────────── */

  // Reverse events so newest is first
  const recentEvents = [...metrics.events].reverse().slice(0, 50);

  return (
    <div
      ref={setOverlayRef}
      style={{
        ...baseOverlay,
        left: pos.x,
        top: pos.y,
        minWidth: 190,
        padding: "0 14px 10px",
      }}
      aria-hidden="true"
      data-rtdb-overlay
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
        <div style={titleStyle}>rtdb tracker</div>
        <div style={headerBtns}>
          <button
            style={{
              ...infoBtn,
              color: "#ef4444",
              borderColor: "rgba(239, 68, 68, 0.3)",
              fontSize: 9,
            }}
            onClick={() => resetMetrics()}
            title="Reset counters"
          >
            ↺
          </button>
          <button
            style={{
              ...infoBtn,
              color: showDetails ? "#38bdf8" : "rgba(255, 255, 255, 0.4)",
              borderColor: showDetails
                ? "rgba(56, 189, 248, 0.3)"
                : "rgba(255, 255, 255, 0.15)",
            }}
            onClick={() => setShowDetails((v) => !v)}
            title="Show event log"
          >
            ⋯
          </button>
          <button
            style={smallBtn}
            onClick={() => {
              if (!didDrag.current) setMinimized(true);
            }}
            aria-label="Minimize"
          >
            −
          </button>
        </div>
      </div>

      {/* Metrics rows */}
      <div style={row}>
        <span style={label}>reads</span>
        <span style={readColor}>{metrics.reads.toLocaleString()}</span>
      </div>
      <div style={row}>
        <span style={label}>writes</span>
        <span style={writeColor}>{metrics.writes.toLocaleString()}</span>
      </div>
      <div
        style={{
          ...row,
          marginTop: 2,
          paddingTop: 2,
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <span style={label}>↓ read data</span>
        <span style={readColor}>{formatBytes(metrics.readBytes)}</span>
      </div>
      <div style={row}>
        <span style={label}>↑ write data</span>
        <span style={writeColor}>{formatBytes(metrics.writeBytes)}</span>
      </div>
      <div
        style={{
          ...row,
          marginTop: 2,
          paddingTop: 2,
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <span style={label}>total data</span>
        <span style={dataColor}>{formatBytes(totalBytes)}</span>
      </div>
      <button
        type="button"
        onClick={() => setShowListeners((v) => !v)}
        style={{
          ...row,
          marginTop: 0,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          pointerEvents: "auto",
          width: "100%",
        }}
      >
        <span style={label}>listeners {showListeners ? "▾" : "▸"}</span>
        <span style={listenerColor}>{metrics.listeners}</span>
      </button>
      {showListeners && (
        <div
          style={{
            paddingLeft: 6,
            borderLeft: "2px solid rgba(52, 211, 153, 0.2)",
            marginTop: 2,
            marginBottom: 2,
          }}
        >
          {metrics.listenerPaths.length === 0 ? (
            <div style={emptyMsg}>No active listeners</div>
          ) : (
            metrics.listenerPaths.map((p, i) => (
              <div
                key={i}
                style={{
                  fontSize: 9,
                  lineHeight: 1.6,
                  color: "rgba(52, 211, 153, 0.7)",
                  wordBreak: "break-all" as const,
                }}
              >
                {p}
              </div>
            ))
          )}
        </div>
      )}

      {/* Detail panel */}
      {showDetails && (
        <div style={detailPanel}>
          <div style={detailTitle}>recent events</div>
          {recentEvents.length === 0 ? (
            <div style={emptyMsg}>No events recorded yet</div>
          ) : (
            recentEvents.map((evt: RTDBEvent, i: number) => (
              <div key={i} style={eventCard}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={evt.type === "read" ? readColor : writeColor}>
                    {evt.type === "read" ? "↓" : "↑"} {evt.op}
                  </span>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.3)",
                      fontSize: 9,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatBytes(evt.estimatedBytes)} ·{" "}
                    {formatTime(evt.timestamp)}
                  </span>
                </div>
                <div style={eventPath}>{truncatePath(evt.path)}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
