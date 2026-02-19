"use client";
// ─────────────────────────────────────────────────────────────
// breadcrumb/messages/ResonancePing.tsx — "Did anything stand out?" breadcrumb
// ─────────────────────────────────────────────────────────────
//
// A tiny floating reaction strip that appears after the user has
// visited 2+ pages. Shows 3 subtle emoji-style reactions that
// hint at emotional resonance without being intrusive.
//
// Appears docked to the left edge, mid-page — feels ambient,
// like a margin note rather than a popup.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import type { SessionStore } from "../store/sessionStore";

interface ResonancePingProps {
  store: SessionStore | null;
  /** Minimum page visits before showing */
  minPages?: number;
  /** Delay after qualifying (ms) */
  delayMs?: number;
}

const STORAGE_KEY = "bc_resonance_shown";

const reactions = [
  { emoji: "✨", value: "impressed", label: "Nice" },
  { emoji: "🤔", value: "thinking", label: "Hmm" },
  { emoji: "🔥", value: "excited", label: "Want" },
];

export function ResonancePing({
  store,
  minPages = 2,
  delayMs = 45_000,
}: ResonancePingProps) {
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
      if (sessionStorage.getItem("bc_resonance_visible")) {
        setVisible(true);
        return;
      }
    } catch {
      /* ignore */
    }

    function startDelay() {
      let remaining = delayMs;
      try {
        const started = sessionStorage.getItem("bc_resonance_timer");
        if (started) {
          remaining = Math.max(0, delayMs - (Date.now() - Number(started)));
        } else {
          sessionStorage.setItem("bc_resonance_timer", String(Date.now()));
        }
      } catch {
        /* ignore */
      }

      timerRef.current = setTimeout(() => {
        setVisible(true);
        try {
          sessionStorage.setItem("bc_resonance_visible", "1");
        } catch {
          /* ignore */
        }
      }, remaining);
    }

    // If pages requirement was already met on a previous mount
    const alreadyQualified = (() => {
      try {
        return sessionStorage.getItem("bc_resonance_qualified") === "1";
      } catch {
        return false;
      }
    })();

    if (alreadyQualified) {
      startDelay();
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    // Check page count periodically
    const checkInterval = setInterval(() => {
      if (!store) return;
      const session = store.getSession();
      if (session.pageSequence.length >= minPages) {
        clearInterval(checkInterval);
        try {
          sessionStorage.setItem("bc_resonance_qualified", "1");
        } catch {
          /* ignore */
        }
        startDelay();
      }
    }, 5000);

    return () => {
      clearInterval(checkInterval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [store, minPages, delayMs]);

  function handleSelect(value: string) {
    setSelected(value);

    if (store) {
      store.addMicroInteraction({
        probe: "resonance",
        value,
        path: window.location.pathname,
        timestamp: Date.now(),
      });
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
      sessionStorage.removeItem("bc_resonance_visible");
      sessionStorage.removeItem("bc_resonance_timer");
      sessionStorage.removeItem("bc_resonance_qualified");
    } catch {
      /* ignore */
    }

    setTimeout(() => setDismissed(true), 1200);
  }

  if (dismissed || !visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "1.25rem",
        top: "40%",
        zIndex: 41,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        animation: "bc-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Tiny label */}
      <div
        style={{
          fontSize: "0.65rem",
          fontWeight: 500,
          color: "hsl(var(--muted-foreground))",
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          paddingLeft: "4px",
          marginBottom: "2px",
        }}
      >
        vibes?
      </div>

      {/* Reaction buttons — stacked vertically */}
      {reactions.map((r) => (
        <button
          key={r.value}
          onClick={() => handleSelect(r.value)}
          title={r.label}
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            border: "1px solid hsl(var(--border))",
            background:
              selected === r.value
                ? "hsl(var(--accent))"
                : "hsl(var(--card) / 0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 1px 6px hsl(var(--foreground) / 0.04)",
            cursor: "pointer",
            fontSize: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            opacity: selected && selected !== r.value ? 0.3 : 1,
            transform: selected === r.value ? "scale(1.15)" : "scale(1)",
          }}
        >
          {r.emoji}
        </button>
      ))}

      <style>{`
        @keyframes bc-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
