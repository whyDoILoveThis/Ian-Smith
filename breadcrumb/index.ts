// ─────────────────────────────────────────────────────────────
// breadcrumb/index.ts — Public API barrel export
// ─────────────────────────────────────────────────────────────
//
// Single entry point for the breadcrumb behavioral intelligence layer.
// Import ONLY from here — internal module paths are implementation details.
//
// ─────────────────────────────────────────────────────────────

// Core component — mount this in layout.tsx
export { BreadcrumbProvider } from "./BreadcrumbProvider";

// AI integration — call these from your API routes or components
export { aggregateForLLM } from "./ai/contextAggregator";
export type { LLMContext } from "./ai/contextAggregator";
export { buildPrompt, buildFlatPrompt } from "./ai/promptTemplate";

// Types
export type {
  BreadcrumbSession,
  BreadcrumbConfig,
  StateSignal,
  PageVisit,
  HoverHesitation,
  ClickSignal,
  DeviceContext,
} from "./types";
export { DEFAULT_CONFIG } from "./types";

// Store — exposed for advanced usage (e.g. manual context aggregation)
export { SessionStore } from "./store/sessionStore";

// Opt-out / data clearing
export { clearVisitorData } from "./store/returnVisitor";
