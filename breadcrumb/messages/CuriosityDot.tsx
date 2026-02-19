"use client";
// ─────────────────────────────────────────────────────────────
// breadcrumb/messages/CuriosityDot.tsx — Passive curiosity breadcrumb
// ─────────────────────────────────────────────────────────────
//
// A small pulsing dot that appears in the bottom-left margin
// after some time. If clicked, it briefly shows a one-word
// question and records the interaction. If ignored, it fades
// away — and that avoidance is itself a signal.
//
// This is the most ambient of the breadcrumbs — its presence
// alone is data, and engagement reveals curiosity threshold.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import type { SessionStore } from "../store/sessionStore";

interface CuriosityDotProps {
  store: SessionStore | null;
  /** Delay before appearing (ms) */
  delayMs?: number;
}

const STORAGE_KEY = "bc_curiosity_shown";

// The dot reveals one of these when clicked
const reveals = [
  "Still looking?",
  "Found it yet?",
  "Need anything?",
  "Enjoying the scroll?",
  "Going deeper?",
];

export function CuriosityDot({ store, delayMs = 30_000 }: CuriosityDotProps) {
  const [phase, setPhase] = useState<"hidden" | "dot" | "revealed" | "done">(
    "hidden",
  );
  const [revealText, setRevealText] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) {
        setPhase("done");
        return;
      }

      // Restore phase across route changes / remounts
      const savedPhase = sessionStorage.getItem("bc_curiosity_phase");
      const savedText = sessionStorage.getItem("bc_curiosity_text");
      if (savedPhase === "dot" || savedPhase === "revealed") {
        if (savedText) setRevealText(savedText);
        setPhase(savedPhase as "dot" | "revealed");

        if (savedPhase === "dot") {
          // Resume auto-dismiss timer
          let remaining = 30_000;
          try {
            const dotStart = sessionStorage.getItem("bc_curiosity_dot_timer");
            if (dotStart)
              remaining = Math.max(0, 30_000 - (Date.now() - Number(dotStart)));
          } catch {
            /* ignore */
          }
          timerRef.current = setTimeout(() => {
            if (store) {
              store.addMicroInteraction({
                probe: "curiosity",
                value: "ignored",
                path: window.location.pathname,
                timestamp: Date.now(),
              });
            }
            setPhase("done");
            try {
              sessionStorage.setItem(STORAGE_KEY, "1");
            } catch {
              /* ignore */
            }
          }, remaining);
        } else {
          // "revealed" phase — auto-dismiss after 4s
          timerRef.current = setTimeout(() => setPhase("done"), 4000);
        }
        return () => {
          if (timerRef.current) clearTimeout(timerRef.current);
        };
      }
    } catch {
      /* ignore */
    }

    // Resume initial timer from where it left off
    let remaining = delayMs;
    try {
      const started = sessionStorage.getItem("bc_curiosity_timer");
      if (started) {
        remaining = Math.max(0, delayMs - (Date.now() - Number(started)));
      } else {
        sessionStorage.setItem("bc_curiosity_timer", String(Date.now()));
      }
    } catch {
      /* ignore */
    }

    timerRef.current = setTimeout(() => {
      const text = reveals[Math.floor(Math.random() * reveals.length)];
      setRevealText(text);
      setPhase("dot");
      try {
        sessionStorage.setItem("bc_curiosity_phase", "dot");
        sessionStorage.setItem("bc_curiosity_text", text);
        sessionStorage.setItem("bc_curiosity_dot_timer", String(Date.now()));
      } catch {
        /* ignore */
      }

      // Auto-dismiss after 30s if not clicked
      timerRef.current = setTimeout(() => {
        if (store) {
          store.addMicroInteraction({
            probe: "curiosity",
            value: "ignored",
            path: window.location.pathname,
            timestamp: Date.now(),
          });
        }
        setPhase("done");
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* ignore */
        }
      }, 30_000);
    }, remaining);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [store, delayMs]);

  function handleClick() {
    if (phase === "dot") {
      // Clear the auto-dismiss timer
      if (timerRef.current) clearTimeout(timerRef.current);

      setPhase("revealed");

      if (store) {
        store.addMicroInteraction({
          probe: "curiosity",
          value: "engaged",
          path: window.location.pathname,
          timestamp: Date.now(),
        });
      }

      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
        sessionStorage.setItem("bc_curiosity_phase", "revealed");
      } catch {
        /* ignore */
      }

      timerRef.current = setTimeout(() => setPhase("done"), 4000);
    }
  }

  if (phase === "hidden" || phase === "done") return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "180px",
        left: "1.25rem",
        zIndex: 41,
        animation: "bc-dot-in 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {phase === "dot" && (
        <button
          onClick={handleClick}
          aria-label="Something here"
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            border: "none",
            background: "hsl(var(--primary) / 0.5)",
            cursor: "pointer",
            animation: "bc-pulse 2s ease-in-out infinite",
            transition: "transform 0.2s ease",
            boxShadow: "0 0 8px hsl(var(--primary) / 0.3)",
          }}
        />
      )}

      {phase === "revealed" && (
        <div
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            background: "hsl(var(--card) / 0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 2px 8px hsl(var(--foreground) / 0.06)",
            fontSize: "0.75rem",
            fontWeight: 500,
            fontStyle: "italic",
            color: "hsl(var(--card-foreground))",
            fontFamily: "'Inter', system-ui, sans-serif",
            whiteSpace: "nowrap",
            animation: "bc-fade-up 0.3s ease",
          }}
        >
          {revealText}
        </div>
      )}

      <style>{`
        @keyframes bc-dot-in {
          from { opacity: 0; transform: scale(0); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bc-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes bc-fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
