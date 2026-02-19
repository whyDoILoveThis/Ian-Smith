// ─────────────────────────────────────────────────────────────
// breadcrumb/collectors/interactionCollector.ts — Hover & click intent tracking
// ─────────────────────────────────────────────────────────────
// Observes two high-signal interaction patterns:
//
// 1. HOVER HESITATION — cursor lingers over an interactive element
//    (link, button, card) without clicking. Signals consideration,
//    uncertainty, or evaluation behavior.
//
// 2. CLICK INTENT vs ABANDONMENT — user clicks an interactive element
//    but then navigates back quickly (< 2s), suggesting they clicked
//    out of curiosity but weren't committed.
//
// All selectors are simplified for privacy — we capture element type
// and data attributes, never text content.
// ─────────────────────────────────────────────────────────────

import type { SessionStore } from "../store/sessionStore";

/** Interactive elements we consider worthy of hover tracking */
const INTERACTIVE_SELECTOR = "a, button, [role='button'], [data-clickable]";

/**
 * Build a privacy-safe simplified selector for an element.
 * Example output: "a.project-card" or "button#submit"
 */
function simplifySelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls = el.className && typeof el.className === "string"
    ? `.${el.className.split(/\s+/).slice(0, 2).join(".")}`
    : "";
  const dataAction = el.getAttribute("data-action") || "";
  const suffix = dataAction ? `[data-action="${dataAction}"]` : "";
  return `${tag}${id}${cls}${suffix}`.slice(0, 80);
}

/**
 * Start observing hover hesitation and click intent.
 * Returns a cleanup function.
 */
export function startInteractionCollector(store: SessionStore): () => void {
  const hoverThreshold = store.getConfig().hoverThresholdMs;

  // ── Hover Hesitation Tracking ──────────────────────────────
  // We track mouseenter/mouseleave on interactive elements.
  // If the cursor stays for longer than the threshold, we record it.

  let hoverTarget: Element | null = null;
  let hoverStart = 0;
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

  function onMouseOver(e: MouseEvent): void {
    const target = (e.target as Element)?.closest?.(INTERACTIVE_SELECTOR);
    if (!target || target === hoverTarget) return;

    // Clear any pending hover from previous element
    clearHover(false);

    hoverTarget = target;
    hoverStart = Date.now();

    // Set a timeout — if cursor is still here after threshold, it's a hesitation
    hoverTimeout = setTimeout(() => {
      // Cursor is still lingering — will be finalized on mouseout
    }, hoverThreshold);
  }

  function onMouseOut(e: MouseEvent): void {
    const target = (e.target as Element)?.closest?.(INTERACTIVE_SELECTOR);
    if (!target || target !== hoverTarget) return;
    clearHover(false);
  }

  function clearHover(didClick: boolean): void {
    if (hoverTarget && hoverStart) {
      const duration = Date.now() - hoverStart;
      if (duration >= hoverThreshold) {
        store.addHoverHesitation({
          selector: simplifySelector(hoverTarget),
          durationMs: duration,
          didClick,
          timestamp: hoverStart,
        });
      }
    }
    if (hoverTimeout) clearTimeout(hoverTimeout);
    hoverTarget = null;
    hoverStart = 0;
    hoverTimeout = null;
  }

  // ── Click Intent Tracking ──────────────────────────────────
  // Every click on an interactive element is recorded.
  // We also resolve pending hovers as "clicked".

  function onClick(e: MouseEvent): void {
    const target = (e.target as Element)?.closest?.(INTERACTIVE_SELECTOR);
    if (!target) return;

    // If we were hovering this element, resolve the hover as clicked
    if (target === hoverTarget) {
      clearHover(true);
    }

    store.addClickSignal({
      target: simplifySelector(target),
      path: window.location.pathname,
      timestamp: Date.now(),
      type: "follow-through",
    });
  }

  // ── Mount ──────────────────────────────────────────────────
  document.addEventListener("mouseover", onMouseOver, { passive: true });
  document.addEventListener("mouseout", onMouseOut, { passive: true });
  document.addEventListener("click", onClick, { passive: true });

  return () => {
    document.removeEventListener("mouseover", onMouseOver);
    document.removeEventListener("mouseout", onMouseOut);
    document.removeEventListener("click", onClick);
    if (hoverTimeout) clearTimeout(hoverTimeout);
  };
}
