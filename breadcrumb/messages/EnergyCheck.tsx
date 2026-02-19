"use client";
// ─────────────────────────────────────────────────────────────
// breadcrumb/messages/EnergyCheck.tsx — Scroll-depth energy probe
// ─────────────────────────────────────────────────────────────
//
// Appears inline-style at the right edge of the viewport after
// the user has scrolled past 50% of the page. A tiny temperature
// gauge that lets users express their energy level — signals
// engagement momentum vs fatigue.
//
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import type { SessionStore } from "../store/sessionStore";

interface EnergyCheckProps {
  store: SessionStore | null;
  /** Scroll depth threshold (0–1) before showing */
  scrollThreshold?: number;
}

const STORAGE_KEY = "bc_energy_shown";

const levels = [
  { emoji: "🔋", value: "high", label: "Charged" },
  { emoji: "😐", value: "neutral", label: "Meh" },
  { emoji: "🥱", value: "low", label: "Fading" },
];

export function EnergyCheck({
  store,
  scrollThreshold = 0.5,
}: EnergyCheckProps) {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) {
        setDismissed(true);
        return;
      }
      // Restore visibility across route changes / remounts
      if (sessionStorage.getItem("bc_energy_visible")) {
        setVisible(true);
        return;
      }
    } catch {
      /* ignore */
    }

    // If scroll threshold was already met on a previous mount
    const alreadyQualified = (() => {
      try {
        return sessionStorage.getItem("bc_energy_qualified") === "1";
      } catch {
        return false;
      }
    })();

    if (alreadyQualified) {
      shownRef.current = true;
      setTimeout(() => {
        setVisible(true);
        try {
          sessionStorage.setItem("bc_energy_visible", "1");
        } catch {
          /* ignore */
        }
      }, 1500);
      return;
    }

    function onScroll() {
      if (shownRef.current) return;
      const docHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );
      const scrolled = window.scrollY + window.innerHeight;
      const ratio = scrolled / docHeight;

      if (ratio >= scrollThreshold) {
        shownRef.current = true;
        try {
          sessionStorage.setItem("bc_energy_qualified", "1");
        } catch {
          /* ignore */
        }
        setTimeout(() => {
          setVisible(true);
          try {
            sessionStorage.setItem("bc_energy_visible", "1");
          } catch {
            /* ignore */
          }
        }, 1500);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollThreshold]);

  function handleSelect(value: string) {
    setSelected(value);

    if (store) {
      store.addMicroInteraction({
        probe: "energy",
        value,
        path: window.location.pathname,
        timestamp: Date.now(),
      });
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
      sessionStorage.removeItem("bc_energy_visible");
      sessionStorage.removeItem("bc_energy_qualified");
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
        right: "1.25rem",
        bottom: "50%",
        transform: "translateY(50%)",
        zIndex: 41,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        animation: "bc-energy-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Tiny vertical label */}
      <div
        style={{
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          fontSize: "0.6rem",
          fontWeight: 500,
          color: "hsl(var(--muted-foreground))",
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: "4px",
        }}
      >
        energy
      </div>

      {levels.map((l) => (
        <button
          key={l.value}
          onClick={() => handleSelect(l.value)}
          title={l.label}
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            border: "1px solid hsl(var(--border))",
            background:
              selected === l.value
                ? "hsl(var(--accent))"
                : "hsl(var(--card) / 0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 1px 4px hsl(var(--foreground) / 0.04)",
            cursor: "pointer",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            opacity: selected && selected !== l.value ? 0.3 : 1,
          }}
        >
          {l.emoji}
        </button>
      ))}

      <style>{`
        @keyframes bc-energy-in {
          from { opacity: 0; transform: translateY(50%) translateX(16px); }
          to { opacity: 1; transform: translateY(50%) translateX(0); }
        }
      `}</style>
    </div>
  );
}
