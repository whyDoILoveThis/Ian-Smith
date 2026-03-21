"use client";

import { useEffect, useState } from "react";
import type { RTDBMetrics } from "../types";
import { subscribe, resetMetrics } from "../lib/tracker";

const INITIAL: RTDBMetrics = {
  reads: 0,
  writes: 0,
  readBytes: 0,
  writeBytes: 0,
  listeners: 0,
  listenerPaths: [],
  events: [],
};

export function useRTDBMetrics(enabled: boolean) {
  const [metrics, setMetrics] = useState<RTDBMetrics>(INITIAL);

  useEffect(() => {
    if (!enabled) return;
    return subscribe(setMetrics);
  }, [enabled]);

  return { metrics, resetMetrics };
}
