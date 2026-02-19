// ─────────────────────────────────────────────────────────────
// breadcrumb/collectors/scrollCollector.ts — Scroll depth & velocity tracking
// ─────────────────────────────────────────────────────────────
// Samples scroll position at a configurable interval to compute:
// 1. Maximum scroll depth (0–1 ratio of page height)
// 2. Average scroll velocity (px/s) — indicates scanning vs reading
//
// These are updated on the most recent PageVisit in the store.
// ─────────────────────────────────────────────────────────────

import type { SessionStore } from "../store/sessionStore";

/**
 * Start observing scroll behavior.
 * Returns a cleanup function.
 */
export function startScrollCollector(store: SessionStore): () => void {
  let maxDepth = 0;
  let lastScrollY = window.scrollY;
  let lastSampleTime = Date.now();
  let totalScrollDistance = 0; // absolute px moved (includes up-scrolls)
  let sampleCount = 0;

  /**
   * Compute the current scroll depth as a ratio 0–1.
   * Handles edge cases where document is shorter than viewport.
   */
  function getScrollDepth(): number {
    const docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const viewportHeight = window.innerHeight;
    const maxScroll = docHeight - viewportHeight;
    if (maxScroll <= 0) return 1; // entire page fits in viewport
    return Math.min(1, window.scrollY / maxScroll);
  }

  function sample(): void {
    const now = Date.now();
    const currentY = window.scrollY;
    const depth = getScrollDepth();

    // Track peak depth
    if (depth > maxDepth) {
      maxDepth = depth;
    }

    // Accumulate absolute scroll distance for velocity calc
    const delta = Math.abs(currentY - lastScrollY);
    totalScrollDistance += delta;
    sampleCount++;

    lastScrollY = currentY;
    lastSampleTime = now;

    // Push to store — update the latest page visit
    const elapsedSec = (now - (store.getSession().pageSequence.at(-1)?.timestamp ?? now)) / 1000;
    const avgVelocity = elapsedSec > 0 ? totalScrollDistance / elapsedSec : 0;

    store.updateLastPageVisit({
      scrollDepth: Math.round(maxDepth * 1000) / 1000, // 3 decimal precision
      scrollVelocity: Math.round(avgVelocity),
    });
  }

  const intervalId = setInterval(sample, store.getConfig().scrollSampleIntervalMs);

  // Also sample on scroll events (throttled by the interval naturally)
  const onScroll = () => {
    // The interval handles the heavy lifting — we just mark activity
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  // Reset accumulators when navigation occurs (new page = fresh tracking)
  const onReset = () => {
    maxDepth = 0;
    lastScrollY = 0;
    totalScrollDistance = 0;
    sampleCount = 0;
    lastSampleTime = Date.now();
  };
  window.addEventListener("popstate", onReset);

  return () => {
    clearInterval(intervalId);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("popstate", onReset);
  };
}
