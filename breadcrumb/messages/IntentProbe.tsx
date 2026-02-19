"use client";
// ─────────────────────────────────────────────────────────────
// breadcrumb/messages/IntentProbe.tsx — "What brings you here?" breadcrumb
// ─────────────────────────────────────────────────────────────
//
// A small, friendly floating prompt that appears ONCE per session
// after the user has been browsing for a while. Offers 4 quick-tap
// options that feel like natural curiosity, not data collection.
//
// The user's choice feeds directly into the inference engine as
// a high-confidence signal about their visit intent.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import type { SessionStore } from "../store/sessionStore";

interface IntentProbeProps {
  store: SessionStore | null;
  /** Delay before showing (ms) */
  delayMs?: number;
}

const STORAGE_KEY = "bc_intent_shown";

const options = [
  { emoji: "💼", label: "Hiring", value: "hiring" },
  { emoji: "🔍", label: "Exploring", value: "exploring" },
  { emoji: "💡", label: "Curious", value: "curious" },
  { emoji: "👋", label: "Just passing through", value: "passing-through" },
];

export function IntentProbe({ store, delayMs = 25_000 }: IntentProbeProps) {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) {
        setDismissed(true);
        return;
      }
      // Restore visibility across route changes / remounts
      if (sessionStorage.getItem("bc_intent_visible")) {
        setVisible(true);
        return;
      }
    } catch {
      /* ignore */
    }

    // Resume timer from where it left off (survives remount)
    let remaining = delayMs;
    try {
      const started = sessionStorage.getItem("bc_intent_timer");
      if (started) {
        remaining = Math.max(0, delayMs - (Date.now() - Number(started)));
      } else {
        sessionStorage.setItem("bc_intent_timer", String(Date.now()));
      }
    } catch {
      /* ignore */
    }

    timerRef.current = setTimeout(() => {
      setVisible(true);
      try {
        sessionStorage.setItem("bc_intent_visible", "1");
      } catch {
        /* ignore */
      }
    }, remaining);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [delayMs]);

  function handleSelect(value: string) {
    setSelected(value);

    // Record the interaction
    if (store) {
      store.addMicroInteraction({
        probe: "intent",
        value,
        path: window.location.pathname,
        timestamp: Date.now(),
      });
    }

    // Mark as shown so it doesn't reappear this session
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
      sessionStorage.removeItem("bc_intent_visible");
      sessionStorage.removeItem("bc_intent_timer");
    } catch {
      /* ignore */
    }

    // Fade out after a brief moment
    setTimeout(() => {
      setDismissed(true);
    }, 1500);
  }

  if (dismissed || !visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        right: "1.25rem",
        transform: "translateY(-50%)",
        zIndex: 41,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "6px",
        animation: "bc-slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Question label */}
      <div
        style={{
          background: "hsl(var(--card) / 0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid hsl(var(--border))",
          borderRadius: "10px",
          padding: "8px 14px",
          fontSize: "0.78rem",
          fontWeight: 500,
          color: "hsl(var(--card-foreground))",
          boxShadow: "0 2px 12px hsl(var(--foreground) / 0.06)",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        What brings you here?
      </div>

      {/* Options */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          alignItems: "flex-end",
        }}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid hsl(var(--border))",
              background:
                selected === opt.value
                  ? "hsl(var(--accent))"
                  : "hsl(var(--card) / 0.92)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 1px 6px hsl(var(--foreground) / 0.04)",
              cursor: "pointer",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "hsl(var(--card-foreground))",
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: "all 0.2s ease",
              opacity: selected && selected !== opt.value ? 0.4 : 1,
            }}
          >
            <span>{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Inject keyframes */}
      <style>{`
        @keyframes bc-slide-in {
          from { opacity: 0; transform: translateY(-50%) translateX(20px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `}</style>
    </div>
  );
}
