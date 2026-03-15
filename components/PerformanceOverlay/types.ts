export interface LongTaskScript {
  sourceURL: string;
  sourceFunctionName: string;
  invoker: string;
  invokerType: string;
  duration: number;
}

export interface LongTaskEntry {
  duration: number;
  startTime: number;
  name: string;
  timestamp: number; // Date.now() when captured
  scripts: LongTaskScript[]; // populated by LoAF API when available
  // LoAF rendering breakdown (Chromium 123+)
  blockingDuration?: number;
  renderStart?: number;
  styleAndLayoutStart?: number;
  firstUIEventTimestamp?: number;
  // longtask attribution
  containerType?: string;
  containerSrc?: string;
  containerName?: string;
  // Inferred context hint
  context?: string;
}

export interface PerformanceMetrics {
  fps: number;
  avgFps: number;
  frameTime: number;
  longTaskCount: number;
  longTasks: LongTaskEntry[];
}

export interface PerformanceOverlayProps {
  /** Enable/disable the overlay. Defaults to process.env.NODE_ENV === 'development'. */
  enabled?: boolean;
  /** Render inline (position: relative) instead of fixed. Disables drag & localStorage. */
  contained?: boolean;
}
