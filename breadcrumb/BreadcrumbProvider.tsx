"use client";
// ─────────────────────────────────────────────────────────────
// breadcrumb/BreadcrumbProvider.tsx — Root mount component
// ─────────────────────────────────────────────────────────────
//
// This is the ONLY component that needs to be imported outside
// the breadcrumb module. It mounts invisibly, starts all collectors,
// and periodically runs inference.
//
// INTEGRATION:
//   In app/layout.tsx, add:
//     import { BreadcrumbProvider } from "@/breadcrumb";
//   Then place <BreadcrumbProvider /> anywhere inside <body>.
//
// REMOVAL:
//   1. Delete the breadcrumb/ folder
//   2. Remove the import + <BreadcrumbProvider /> from layout.tsx
//   That's it. No other files are touched.
//
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, createContext, useContext } from "react";
import type { BreadcrumbConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { SessionStore } from "./store/sessionStore";
import { collectDeviceContext } from "./collectors/deviceCollector";
import { startNavigationCollector } from "./collectors/navigationCollector";
import { startScrollCollector } from "./collectors/scrollCollector";
import { startInteractionCollector } from "./collectors/interactionCollector";
import { inferStates } from "./inference/inferenceEngine";
import { buildNarrative } from "./inference/narrativeBuilder";
import { aggregateForLLM, type LLMContext } from "./ai/contextAggregator";
import { selectMessage } from "./messages/messageBank";
import { BreadcrumbWhisper } from "./messages/BreadcrumbWhisper";
import { IntentProbe } from "./messages/IntentProbe";
import { ResonancePing } from "./messages/ResonancePing";
import { CuriosityDot } from "./messages/CuriosityDot";
import { EnergyCheck } from "./messages/EnergyCheck";

// ── Context for downstream consumers ─────────────────────────
// Optional: any component can access the store or latest LLM context.

interface BreadcrumbContextValue {
  /** Get the current LLM-ready context snapshot */
  getContext: () => LLMContext | null;
  /** Get the raw session store (advanced) */
  getStore: () => SessionStore | null;
  /** Whether the system is active */
  isActive: boolean;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  getContext: () => null,
  getStore: () => null,
  isActive: false,
});

/** Hook for downstream components to access breadcrumb data */
export function useBreadcrumb(): BreadcrumbContextValue {
  return useContext(BreadcrumbContext);
}

// ── Props ────────────────────────────────────────────────────

interface BreadcrumbProviderProps {
  /** Override default config values */
  config?: Partial<BreadcrumbConfig>;
  /** React children — passed through untouched */
  children?: React.ReactNode;
}

// ── Timing ───────────────────────────────────────────────────
const INFERENCE_INTERVAL_MS = 10_000; // re-run inference every 10s
const FIRST_WHISPER_DELAY_MS = 15_000; // first message after 15s of browsing
const WHISPER_CYCLE_MS = 90_000; // rotate message every 90s after that

/**
 * BreadcrumbProvider — behavioral intelligence mount point.
 *
 * Starts all collectors on mount, tears them down on unmount.
 * Runs inference periodically and surfaces a subtle whisper message.
 */
export function BreadcrumbProvider({
  config = {},
  children,
}: BreadcrumbProviderProps) {
  const storeRef = useRef<SessionStore | null>(null);
  const latestContextRef = useRef<LLMContext | null>(null);
  const [whisperMessage, setWhisperMessage] = useState<string | null>(null);
  const whisperCycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  useEffect(() => {
    // ── Guard: master kill switch ────────────────────────────
    if (!mergedConfig.enabled) return;

    // ── Initialize store ─────────────────────────────────────
    const store = new SessionStore(mergedConfig);
    storeRef.current = store;

    // ── Collect device context (once) ────────────────────────
    collectDeviceContext(store);

    // ── Start collectors ─────────────────────────────────────
    const cleanups: (() => void)[] = [];
    cleanups.push(startNavigationCollector(store));
    cleanups.push(startScrollCollector(store));
    cleanups.push(startInteractionCollector(store));

    // ── Periodic inference ───────────────────────────────────
    // Run inference on a timer so the context stays fresh
    // without being coupled to any specific user event.
    const inferenceTimer = setInterval(() => {
      try {
        const session = store.getSession();
        const states = inferStates(session);
        store.setInferredStates(states);

        const narrative = buildNarrative({
          ...session,
          inferredStates: states,
        });
        store.setNarrative(narrative);

        // Cache the latest context
        latestContextRef.current = aggregateForLLM(store);
      } catch {
        // Inference failure is non-critical — degrade silently
      }
    }, INFERENCE_INTERVAL_MS);

    // Run once immediately after a short delay (let initial data accumulate)
    const initialTimer = setTimeout(() => {
      try {
        latestContextRef.current = aggregateForLLM(store);
      } catch {
        // Non-critical
      }
    }, 2000);

    // ── Whisper message lifecycle ─────────────────────────────
    // First message appears after FIRST_WHISPER_DELAY_MS of browsing,
    // then rotates every WHISPER_CYCLE_MS.
    const pickMessage = () => {
      try {
        const session = store.getSession();
        const states =
          session.inferredStates.length > 0
            ? session.inferredStates
            : inferStates(session);
        const msg = selectMessage(states, session.sessionId);
        setWhisperMessage(msg);
      } catch {
        // Non-critical — no message is fine
      }
    };

    const firstWhisperTimer = setTimeout(() => {
      pickMessage();
      // After the first one, rotate on a longer cycle
      whisperCycleRef.current = setInterval(pickMessage, WHISPER_CYCLE_MS);
    }, FIRST_WHISPER_DELAY_MS);

    // ── Expose to console for development ────────────────────
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      (window as unknown as Record<string, unknown>).__breadcrumb = {
        getContext: () => aggregateForLLM(store),
        getSession: () => store.getSession(),
        getStore: () => store,
        /** Reset all probe flags so they reappear — then refresh the page */
        resetProbes: () => {
          const keys = [
            "bc_intent_shown",
            "bc_intent_visible",
            "bc_intent_timer",
            "bc_resonance_shown",
            "bc_resonance_visible",
            "bc_resonance_timer",
            "bc_resonance_qualified",
            "bc_curiosity_shown",
            "bc_curiosity_phase",
            "bc_curiosity_text",
            "bc_curiosity_timer",
            "bc_curiosity_dot_timer",
            "bc_energy_shown",
            "bc_energy_visible",
            "bc_energy_qualified",
          ];
          keys.forEach((k) => {
            try {
              sessionStorage.removeItem(k);
            } catch {
              /* */
            }
            try {
              localStorage.removeItem(k);
            } catch {
              /* */
            }
          });
          console.log(
            "%c🍞 Breadcrumb",
            "color: #b8860b; font-weight: bold",
            "All probe flags cleared. Refresh to see them again.",
          );
        },
      };
      console.log(
        "%c🍞 Breadcrumb",
        "color: #b8860b; font-weight: bold",
        "Behavioral layer active. Access via window.__breadcrumb",
        "\n  → resetProbes() to re-show all interactive breadcrumbs",
      );
    }

    // ── Cleanup ──────────────────────────────────────────────
    return () => {
      cleanups.forEach((fn) => fn());
      clearInterval(inferenceTimer);
      clearTimeout(initialTimer);
      clearTimeout(firstWhisperTimer);
      if (whisperCycleRef.current) clearInterval(whisperCycleRef.current);
      storeRef.current = null;

      if (typeof window !== "undefined") {
        delete (window as unknown as Record<string, unknown>).__breadcrumb;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedConfig.enabled]);

  const contextValue: BreadcrumbContextValue = {
    getContext: () => latestContextRef.current,
    getStore: () => storeRef.current,
    isActive: mergedConfig.enabled,
  };

  return (
    <BreadcrumbContext.Provider value={contextValue}>
      {children}
      {mergedConfig.enabled && (
        <>
          <BreadcrumbWhisper message={whisperMessage} />
          <IntentProbe store={storeRef.current} />
          <ResonancePing store={storeRef.current} />
          <CuriosityDot store={storeRef.current} />
          <EnergyCheck store={storeRef.current} />
        </>
      )}
    </BreadcrumbContext.Provider>
  );
}
