// ─────────────────────────────────────────────────────────────
// breadcrumb/types.ts — All type definitions for the behavioral intelligence layer
// ─────────────────────────────────────────────────────────────

/** A single page visit in the user's navigation sequence */
export interface PageVisit {
  path: string;
  timestamp: number;       // epoch ms
  dwellMs: number;         // time spent before navigating away (filled retroactively)
  scrollDepth: number;     // 0–1, maximum scroll ratio reached
  scrollVelocity: number;  // average px/s scroll speed across the visit
}

/** Hover hesitation event — cursor lingered over an interactive element */
export interface HoverHesitation {
  selector: string;        // CSS selector or data attribute of the hovered element
  durationMs: number;      // how long the cursor lingered
  didClick: boolean;       // did the user eventually click?
  timestamp: number;
}

/** Click intent signal — captures intent vs abandonment */
export interface ClickSignal {
  target: string;          // simplified selector of what was clicked
  path: string;            // page where it happened
  timestamp: number;
  type: "follow-through" | "abandoned"; // resolved after a short timeout
}

/** Device & environment context — captured once per session */
export interface DeviceContext {
  deviceType: "mobile" | "tablet" | "desktop";
  viewportWidth: number;
  viewportHeight: number;
  timezone: string;
  localHour: number;       // 0–23 in user's timezone
  localDayOfWeek: number;  // 0 (Sun) – 6 (Sat)
  referrer: string;        // document.referrer or "direct"
  isReturnVisitor: boolean;
  visitCount: number;      // total sessions ever
  daysSinceLastVisit: number | null;
}

/** A user micro-interaction with an embedded breadcrumb element */
export interface MicroInteraction {
  /** Which breadcrumb type triggered this */
  probe: "intent" | "resonance" | "curiosity" | "energy";
  /** The option the user selected */
  value: string;
  /** Page where it happened */
  path: string;
  timestamp: number;
}

/** Probabilistic state signal — NOT a label, a weighted tendency */
export interface StateSignal {
  /** Human-readable key describing the inferred tendency */
  key: string;
  /** 0–1 confidence weight */
  weight: number;
  /** Which raw signals contributed to this inference */
  evidence: string[];
}

/** Complete session snapshot — designed for direct LLM consumption */
export interface BreadcrumbSession {
  sessionId: string;
  startedAt: number;
  lastActivityAt: number;
  device: DeviceContext;
  pageSequence: PageVisit[];
  hoverHesitations: HoverHesitation[];
  clickSignals: ClickSignal[];
  /** User responses to interactive breadcrumb probes */
  microInteractions: MicroInteraction[];
  /** Derived inference layer */
  inferredStates: StateSignal[];
  /** Human-readable session narrative for LLM context */
  sessionNarrative: string;
}

/** Configuration for the breadcrumb system */
export interface BreadcrumbConfig {
  /** Master switch — if false, nothing runs */
  enabled: boolean;
  /** Minimum dwell time (ms) before a page visit is recorded */
  minDwellMs: number;
  /** How long (ms) cursor must linger to count as hover hesitation */
  hoverThresholdMs: number;
  /** Debounce interval for scroll sampling (ms) */
  scrollSampleIntervalMs: number;
  /** localStorage key prefix */
  storagePrefix: string;
  /** Maximum number of page visits to retain per session */
  maxPageHistory: number;
  /** Maximum hover hesitations to retain */
  maxHoverHistory: number;
}

/** Default configuration */
export const DEFAULT_CONFIG: BreadcrumbConfig = {
  enabled: true,
  minDwellMs: 800,
  hoverThresholdMs: 600,
  scrollSampleIntervalMs: 250,
  storagePrefix: "bc_",
  maxPageHistory: 100,
  maxHoverHistory: 50,
};
