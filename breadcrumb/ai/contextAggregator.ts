// ─────────────────────────────────────────────────────────────
// breadcrumb/ai/contextAggregator.ts — Build the LLM-ready context object
// ─────────────────────────────────────────────────────────────
//
// Aggregates the session state + inferred signals into a minimal,
// clean JSON object designed for direct injection into an LLM prompt.
//
// The output is deliberately compact — LLMs work best with dense,
// well-structured context rather than verbose logs.
// ─────────────────────────────────────────────────────────────

import type { BreadcrumbSession, StateSignal } from "../types";
import type { SessionStore } from "../store/sessionStore";
import { inferStates } from "../inference/inferenceEngine";
import { buildNarrative } from "../inference/narrativeBuilder";

/** Compact version of the context for LLM consumption */
export interface LLMContext {
  /** Unique session identifier */
  sessionId: string;
  /** ISO timestamp of session start */
  sessionStart: string;
  /** Duration in seconds */
  durationSec: number;

  /** Device & environment */
  environment: {
    device: string;
    viewport: string;
    timezone: string;
    localTime: string;
    referrer: string;
    isReturnVisitor: boolean;
    visitCount: number;
  };

  /** Condensed navigation trail */
  navigation: {
    path: string;
    dwellSec: number;
    scrollDepthPct: number;
  }[];

  /** Top inferred behavioral states */
  inferredStates: {
    state: string;
    confidence: number;
    evidence: string[];
  }[];

  /** Direct user micro-interactions from breadcrumb probes */
  microInteractions: {
    probe: string;
    value: string;
  }[];

  /** Natural language narrative summary */
  narrative: string;
}

/**
 * Aggregate the current session into an LLM-ready context object.
 * This is the primary public API of the breadcrumb system.
 *
 * Usage:
 *   const ctx = aggregateForLLM(store);
 *   // inject ctx into your LLM prompt as JSON
 */
export function aggregateForLLM(store: SessionStore): LLMContext {
  const session = store.getSession();

  // Run inference
  const states = inferStates(session);
  store.setInferredStates(states);

  // Build narrative
  const narrative = buildNarrative({
    ...session,
    inferredStates: states,
  });
  store.setNarrative(narrative);

  // Assemble compact context
  const durationSec = Math.round((session.lastActivityAt - session.startedAt) / 1000);

  return {
    sessionId: session.sessionId,
    sessionStart: new Date(session.startedAt).toISOString(),
    durationSec,

    environment: {
      device: session.device.deviceType,
      viewport: `${session.device.viewportWidth}x${session.device.viewportHeight}`,
      timezone: session.device.timezone,
      localTime: `${session.device.localHour}:00 ${session.device.localDayOfWeek === 0 ? "Sun" : session.device.localDayOfWeek === 6 ? "Sat" : "weekday"}`,
      referrer: session.device.referrer,
      isReturnVisitor: session.device.isReturnVisitor,
      visitCount: session.device.visitCount,
    },

    navigation: session.pageSequence.slice(-10).map((p) => ({
      path: p.path,
      dwellSec: Math.round(p.dwellMs / 1000),
      scrollDepthPct: Math.round(p.scrollDepth * 100),
    })),

    inferredStates: states.slice(0, 5).map((s) => ({
      state: s.key,
      confidence: Math.round(s.weight * 100) / 100,
      evidence: s.evidence,
    })),

    microInteractions: (session.microInteractions ?? []).map((m) => ({
      probe: m.probe,
      value: m.value,
    })),

    narrative,
  };
}
