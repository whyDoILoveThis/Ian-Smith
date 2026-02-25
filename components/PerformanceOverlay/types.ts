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
}
