// ─────────────────────────────────────────────────────────────
// breadcrumb/collectors/navigationCollector.ts — Page visit & dwell tracking
// ─────────────────────────────────────────────────────────────
// Observes Next.js client-side navigation using the History API.
// Records each page visit with timestamp, then retroactively fills
// dwell time when the user navigates away.
// ─────────────────────────────────────────────────────────────

import type { PageVisit } from "../types";
import type { SessionStore } from "../store/sessionStore";

/**
 * Start observing navigation events.
 * Returns a cleanup function that removes all listeners.
 */
export function startNavigationCollector(store: SessionStore): () => void {
  let currentPath = window.location.pathname;
  let enteredAt = Date.now();

  // Record the initial page visit
  const initialVisit: PageVisit = {
    path: currentPath,
    timestamp: enteredAt,
    dwellMs: 0,
    scrollDepth: 0,
    scrollVelocity: 0,
  };
  store.addPageVisit(initialVisit);

  /**
   * Finalize the current page visit and start tracking the new one.
   */
  function handleNavigation(): void {
    const newPath = window.location.pathname;
    if (newPath === currentPath) return; // hash-only change, ignore

    const now = Date.now();
    const dwellMs = now - enteredAt;

    // Only record if dwell time meets minimum threshold
    if (dwellMs >= store.getConfig().minDwellMs) {
      store.updateLastPageVisit({ dwellMs });
    }

    // Start tracking the new page
    currentPath = newPath;
    enteredAt = now;

    const visit: PageVisit = {
      path: currentPath,
      timestamp: enteredAt,
      dwellMs: 0,
      scrollDepth: 0,
      scrollVelocity: 0,
    };
    store.addPageVisit(visit);
  }

  // ── Intercept History API ──────────────────────────────────
  // Next.js App Router uses pushState/replaceState for navigation.
  // We patch them non-destructively to detect route changes.

  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    originalPushState(...args);
    handleNavigation();
  };

  history.replaceState = function (...args) {
    originalReplaceState(...args);
    handleNavigation();
  };

  // Also handle browser back/forward
  const onPopState = () => handleNavigation();
  window.addEventListener("popstate", onPopState);

  // Finalize dwell on page unload
  const onBeforeUnload = () => {
    const dwellMs = Date.now() - enteredAt;
    store.updateLastPageVisit({ dwellMs });
  };
  window.addEventListener("beforeunload", onBeforeUnload);

  // ── Cleanup ────────────────────────────────────────────────
  return () => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener("popstate", onPopState);
    window.removeEventListener("beforeunload", onBeforeUnload);
  };
}
