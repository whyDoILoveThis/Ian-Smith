import type { ReactNode } from "react";

/* ─── ItsTagline ─── */

export interface ItsTaglineProps {
  /** Text to display. Ignored if children are provided. */
  text?: string;
  /** CSS color for the text */
  textColor?: string;
  /** CSS background color */
  bgColor?: string;
  /** Additional Tailwind / CSS classes */
  className?: string;
  /** Custom component or card to render instead of plain text */
  children?: ReactNode;
  /**
   * How long (ms) the tagline stays visible.
   * Required when used as a direct child of ItsTaglineRenderer.
   * Defaults to 3000 ms when managed by a parent.
   */
  duration?: number;
}

/** Injected by parent orchestrators – not part of the public API. */
export interface ItsTaglineInternalProps {
  _onComplete?: () => void;
}

/* ─── ItsTaglineGroup ─── */

export interface ItsTaglineGroupProps {
  /** One or more ItsTagline components */
  children: ReactNode;
  /** Display duration (ms) for each child ItsTagline (by index) */
  intervals: number[];
  /** Additional Tailwind / CSS classes */
  className?: string;
}

/** Injected by ItsTaglineRenderer. */
export interface ItsTaglineGroupInternalProps {
  _onComplete?: () => void;
}

/* ─── ItsTaglineRenderer ─── */

export interface ItsTaglineRendererProps {
  /** ItsTagline or ItsTaglineGroup children */
  children: ReactNode;
  /**
   * Delay (ms) before each child is shown.
   * intervals[0] = delay before the 1st child, etc.
   */
  intervals: number[];
  /** Override the default "absolute inset‑0" positioning */
  className?: string;
  /** Restart from the first child after the last one finishes */
  loop?: boolean;
  /** Randomize child order on each loop iteration (after the first pass). Requires loop=true. */
  randomizeOrder?: boolean;
  /**
   * Per-child trigger overrides. `triggers[i]` maps to child `i`.
   * - `boolean` — child waits for the value to become `true` instead of using the interval timeout.
   * - `0`       — ignore the trigger; fall back to `intervals[i]` as normal.
   *
   * Example: `[true, 0, someState]` — child 0 shows immediately (true),
   * child 1 uses its interval, child 2 waits for `someState` to be true.
   */
  triggers?: (boolean | 0)[];
  /** Fires once all children have been displayed (ignored when loop=true) */
  onComplete?: () => void;
}

/* ─── ItsToastRenderer ─── */

export interface ItsToastRendererProps {
  children: ReactNode;
  /** Delay (ms) before the toast first appears (default 0) */
  delayBeforeShown?: number;
  /** Delay (ms) after appearing before it auto‑hides (0 = never) */
  delayBeforeGone?: number;
  /** Additional Tailwind / CSS classes – override position with top/right/bottom/left utilities */
  className?: string;
  /** Clicking the toast dismisses (or minimises) it */
  closeWhenClicked?: boolean;
  /** Slide in from the right edge; when closed it peeks so the user can reopen */
  slideFromSide?: boolean;
}
