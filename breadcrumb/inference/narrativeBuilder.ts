// ─────────────────────────────────────────────────────────────
// breadcrumb/inference/narrativeBuilder.ts — Session narrative for LLM context
// ─────────────────────────────────────────────────────────────
//
// Converts raw session data + inferred states into a concise,
// human-readable narrative paragraph. This narrative becomes
// the "behavioral context" injected into an LLM prompt.
//
// The narrative avoids clinical labels and instead reads like
// a brief observational field note — the kind a thoughtful
// colleague might write after watching someone browse.
// ─────────────────────────────────────────────────────────────

import type { BreadcrumbSession } from "../types";

/**
 * Build a natural-language session narrative from behavioral data.
 * Designed to be compact enough for LLM token budgets while rich
 * enough to enable emotionally intelligent response generation.
 */
export function buildNarrative(session: BreadcrumbSession): string {
  const parts: string[] = [];
  const { device, pageSequence, hoverHesitations, clickSignals, inferredStates } = session;

  // ── Arrival context ────────────────────────────────────────
  const arrival: string[] = [];
  if (device.isReturnVisitor) {
    arrival.push(
      `This is visit #${device.visitCount}` +
      (device.daysSinceLastVisit !== null ? ` (last visit ${device.daysSinceLastVisit} day(s) ago)` : "")
    );
  } else {
    arrival.push("This is their first visit");
  }

  if (device.referrer && device.referrer !== "direct") {
    try {
      arrival.push(`arriving via ${new URL(device.referrer).hostname}`);
    } catch {
      arrival.push(`arriving from an external link`);
    }
  } else {
    arrival.push("via direct navigation");
  }

  arrival.push(
    `on a ${device.deviceType} at ${device.localHour}:00 local time (${device.timezone})`
  );
  parts.push(arrival.join(", ") + ".");

  // ── Navigation pattern ─────────────────────────────────────
  if (pageSequence.length > 0) {
    const uniquePages = new Set(pageSequence.map((p) => p.path)).size;
    const dwells = pageSequence.map((p) => p.dwellMs).filter((d) => d > 0);
    const avgDwell = dwells.length > 0
      ? dwells.reduce((a, b) => a + b, 0) / dwells.length
      : 0;

    const pathSummary = pageSequence
      .slice(-6) // last 6 pages max for brevity
      .map((p) => p.path)
      .join(" → ");

    parts.push(
      `They visited ${uniquePages} unique page(s) (${pageSequence.length} total navigations): ${pathSummary}.` +
      (avgDwell > 0 ? ` Average time per page: ${(avgDwell / 1000).toFixed(1)}s.` : "")
    );
  }

  // ── Scroll behavior ────────────────────────────────────────
  const scrolledPages = pageSequence.filter((p) => p.scrollDepth > 0.1);
  if (scrolledPages.length > 0) {
    const avgDepth = scrolledPages.reduce((a, p) => a + p.scrollDepth, 0) / scrolledPages.length;
    const avgVelocity = scrolledPages.reduce((a, p) => a + p.scrollVelocity, 0) / scrolledPages.length;

    const depthDesc = avgDepth > 0.7 ? "deep" : avgDepth > 0.4 ? "moderate" : "shallow";
    const velocityDesc = avgVelocity > 500 ? "quickly" : avgVelocity > 200 ? "at a steady pace" : "slowly and deliberately";

    parts.push(
      `They scrolled ${depthDesc}ly through content, moving ${velocityDesc}.`
    );
  }

  // ── Interaction patterns ───────────────────────────────────
  if (hoverHesitations.length > 0) {
    const uncommitted = hoverHesitations.filter((h) => !h.didClick).length;
    const committed = hoverHesitations.filter((h) => h.didClick).length;

    if (uncommitted > 0) {
      parts.push(
        `They hovered over ${uncommitted} interactive element(s) without clicking — suggesting consideration without commitment.`
      );
    }
    if (committed > 0) {
      parts.push(
        `They paused before clicking ${committed} time(s) — deliberate rather than impulsive.`
      );
    }
  }

  // ── Micro-interactions ───────────────────────────────────────
  const micros = (session as { microInteractions?: { probe: string; value: string }[] }).microInteractions ?? [];
  if (micros.length > 0) {
    const descriptions = micros.map((m) => {
      if (m.probe === "intent") return `self-identified as "${m.value}"`;
      if (m.probe === "resonance") return `expressed a "${m.value}" reaction`;
      if (m.probe === "curiosity") return m.value === "engaged" ? "clicked a curiosity prompt" : "ignored a curiosity prompt";
      if (m.probe === "energy") return `reported "${m.value}" energy`;
      return `interacted with "${m.probe}" probe`;
    });
    parts.push(`Direct signals: ${descriptions.join("; ")}.`);
  }

  // ── Inferred states (top 3) ────────────────────────────────
  if (inferredStates.length > 0) {
    const topStates = inferredStates.slice(0, 3);
    const stateDescriptions = topStates.map(
      (s) => `"${s.key}" (${(s.weight * 100).toFixed(0)}% confidence)`
    );
    parts.push(
      `Behavioral signals suggest: ${stateDescriptions.join(", ")}.`
    );
  }

  // ── Session duration ───────────────────────────────────────
  const durationMin = (session.lastActivityAt - session.startedAt) / 60000;
  if (durationMin > 0.1) {
    parts.push(`Session duration so far: ${durationMin.toFixed(1)} minutes.`);
  }

  return parts.join(" ");
}
