"use client";

import { useEffect, useRef, useCallback } from "react";
import type { PerformanceMetrics, LongTaskEntry, LongTaskScript } from "./types";

const SAMPLE_INTERVAL = 1000; // update metrics once per second
const ROLLING_WINDOW = 60; // rolling average over 60 samples
const MAX_LONG_TASKS = 50; // keep last 50 long task entries

/**
 * Extract script attribution from a LoAF entry (long-animation-frame).
 * The `scripts` property is only available in Chromium 123+.
 */
function extractScripts(entry: PerformanceEntry): LongTaskScript[] {
  const scripts: LongTaskScript[] = [];
  // LoAF `scripts` property — not in TS lib types yet
  const raw = (entry as unknown as Record<string, unknown>).scripts;
  if (!Array.isArray(raw)) return scripts;

  for (const s of raw) {
    scripts.push({
      sourceURL: s.sourceURL ?? "",
      sourceFunctionName: s.sourceFunctionName ?? "",
      invoker: s.invoker ?? "",
      invokerType: s.invokerType ?? "",
      duration: Math.round((s.duration ?? 0) * 10) / 10,
    });
  }
  return scripts;
}

/**
 * Shorten a full URL to just filename + line:col when possible.
 * e.g. "http://localhost:3000/_next/static/chunks/app/page-abc123.js" → "page-abc123.js"
 */
export function shortenURL(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    return parts[parts.length - 1] || u.pathname;
  } catch {
    // Not a valid URL, return as-is
    const parts = url.split("/");
    return parts[parts.length - 1] || url;
  }
}

/**
 * Measures real FPS via requestAnimationFrame and detects long tasks
 * via PerformanceObserver. Uses the Long Animation Frames (LoAF) API
 * when available for detailed script attribution, falling back to the
 * basic longtask API.
 *
 * Calls `onUpdate` at most once per second with the latest snapshot.
 * All RAF / observer cleanup is handled automatically on unmount.
 */
export function usePerformanceMetrics(
  onUpdate: (metrics: PerformanceMetrics) => void,
  enabled: boolean
) {
  const rafId = useRef(0);
  const lastTime = useRef(0);
  const frameCount = useRef(0);
  const lastReportTime = useRef(0);
  const lastFrameTime = useRef(0);
  const longTaskCount = useRef(0);
  const longTasks = useRef<LongTaskEntry[]>([]);
  const fpsHistory = useRef<number[]>([]);
  const onUpdateRef = useRef(onUpdate);

  onUpdateRef.current = onUpdate;

  const pushTask = useCallback((entry: LongTaskEntry) => {
    longTasks.current.push(entry);
    if (longTasks.current.length > MAX_LONG_TASKS) {
      longTasks.current.shift();
    }
  }, []);

  const tick = useCallback((now: number) => {
    frameCount.current++;

    if (lastTime.current > 0) {
      lastFrameTime.current = now - lastTime.current;
    }
    lastTime.current = now;

    if (now - lastReportTime.current >= SAMPLE_INTERVAL) {
      const elapsed = now - lastReportTime.current;
      const fps = Math.round((frameCount.current / elapsed) * 1000);

      const history = fpsHistory.current;
      history.push(fps);
      if (history.length > ROLLING_WINDOW) history.shift();
      const avgFps = Math.round(
        history.reduce((a, b) => a + b, 0) / history.length
      );

      onUpdateRef.current({
        fps,
        avgFps,
        frameTime: Math.round(lastFrameTime.current * 10) / 10,
        longTaskCount: longTaskCount.current,
        longTasks: longTasks.current.slice(),
      });

      frameCount.current = 0;
      lastReportTime.current = now;
    }

    rafId.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Reset
    lastTime.current = 0;
    frameCount.current = 0;
    lastReportTime.current = performance.now();
    lastFrameTime.current = 0;
    longTaskCount.current = 0;
    longTasks.current = [];
    fpsHistory.current = [];

    rafId.current = requestAnimationFrame(tick);

    const observers: PerformanceObserver[] = [];

    // Try LoAF first (Chromium 123+) — provides script-level attribution
    let hasLoAF = false;
    try {
      const loaf = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration < 50) continue; // only count >50ms
          longTaskCount.current++;
          pushTask({
            duration: Math.round(entry.duration * 10) / 10,
            startTime: Math.round(entry.startTime * 10) / 10,
            name: entry.name || "long-animation-frame",
            timestamp: Date.now(),
            scripts: extractScripts(entry),
          });
        }
      });
      loaf.observe({ type: "long-animation-frame", buffered: true });
      observers.push(loaf);
      hasLoAF = true;
    } catch {
      // Not supported
    }

    // Fallback: basic longtask API (no script details)
    if (!hasLoAF) {
      try {
        const lt = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          longTaskCount.current += entries.length;
          for (const entry of entries) {
            pushTask({
              duration: Math.round(entry.duration * 10) / 10,
              startTime: Math.round(entry.startTime * 10) / 10,
              name: entry.name || "self",
              timestamp: Date.now(),
              scripts: [],
            });
          }
        });
        lt.observe({ type: "longtask", buffered: true });
        observers.push(lt);
      } catch {
        // Not supported
      }
    }

    return () => {
      cancelAnimationFrame(rafId.current);
      for (const o of observers) o.disconnect();
    };
  }, [enabled, tick, pushTask]);
}
