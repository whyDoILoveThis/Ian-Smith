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
 * Infer a human-readable context hint for a long task based on its metadata.
 */
function inferContext(entry: PerformanceEntry, scripts: LongTaskScript[]): string {
  const e = entry as unknown as Record<string, unknown>;

  // If we have script attribution, no guessing needed
  if (scripts.length > 0) return "";

  const duration = entry.duration;
  const renderStart = typeof e.renderStart === "number" ? e.renderStart : 0;
  const styleAndLayoutStart = typeof e.styleAndLayoutStart === "number" ? e.styleAndLayoutStart : 0;
  const startTime = entry.startTime;
  const firstUI = typeof e.firstUIEventTimestamp === "number" ? e.firstUIEventTimestamp : 0;

  // Detect if it was triggered by user interaction
  const fromUI = firstUI > 0;

  // Calculate rendering vs scripting time
  if (renderStart > 0 && startTime > 0) {
    const scriptTime = renderStart - startTime;
    const renderTime = duration - (renderStart - startTime);
    const layoutTime = styleAndLayoutStart > 0 && renderStart > 0
      ? duration - (styleAndLayoutStart - startTime) - (renderStart > styleAndLayoutStart ? 0 : renderTime)
      : 0;

    if (scriptTime < 5 && renderTime > 30) {
      return fromUI ? "UI event → heavy render/paint" : "Style/layout/paint (no JS)";
    }
    if (scriptTime > renderTime * 2) {
      return fromUI ? "UI event → script execution" : "Script execution (no attribution)";
    }
    if (styleAndLayoutStart > 0 && (styleAndLayoutStart - startTime) > duration * 0.5) {
      return fromUI ? "UI event → layout thrash" : "Forced layout/reflow";
    }
    if (renderTime > scriptTime) {
      return fromUI ? "UI event → render-heavy" : "Render-heavy task";
    }
  }

  // longtask API fallback: use name for origin context
  const name = entry.name;
  if (name === "cross-origin-ancestor" || name === "cross-origin-descendant" || name === "cross-origin-unreachable") {
    return "Cross-origin iframe/embed";
  }
  if (name === "same-origin-ancestor" || name === "same-origin-descendant" || name === "same-origin") {
    return "Same-origin frame";
  }
  if (name === "multiple-contexts") {
    return "Multiple browsing contexts";
  }

  if (fromUI) return "User interaction handler";

  return "Browser internal task";
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
          const e = entry as unknown as Record<string, unknown>;
          const scripts = extractScripts(entry);
          pushTask({
            duration: Math.round(entry.duration * 10) / 10,
            startTime: Math.round(entry.startTime * 10) / 10,
            name: entry.name || "long-animation-frame",
            timestamp: Date.now(),
            scripts,
            blockingDuration: typeof e.blockingDuration === "number" ? Math.round(e.blockingDuration * 10) / 10 : undefined,
            renderStart: typeof e.renderStart === "number" ? Math.round(e.renderStart * 10) / 10 : undefined,
            styleAndLayoutStart: typeof e.styleAndLayoutStart === "number" ? Math.round(e.styleAndLayoutStart * 10) / 10 : undefined,
            firstUIEventTimestamp: typeof e.firstUIEventTimestamp === "number" ? e.firstUIEventTimestamp : undefined,
            context: inferContext(entry, scripts),
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
            // Extract TaskAttributionTiming from longtask entries
            const attr = (entry as unknown as Record<string, unknown>).attribution;
            let containerType: string | undefined;
            let containerSrc: string | undefined;
            let containerName: string | undefined;
            if (Array.isArray(attr) && attr.length > 0) {
              const a = attr[0] as Record<string, unknown>;
              containerType = typeof a.containerType === "string" && a.containerType ? a.containerType : undefined;
              containerSrc = typeof a.containerSrc === "string" && a.containerSrc ? a.containerSrc : undefined;
              containerName = typeof a.containerName === "string" && a.containerName ? a.containerName : undefined;
            }
            pushTask({
              duration: Math.round(entry.duration * 10) / 10,
              startTime: Math.round(entry.startTime * 10) / 10,
              name: entry.name || "self",
              timestamp: Date.now(),
              scripts: [],
              containerType,
              containerSrc,
              containerName,
              context: inferContext(entry, []),
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
