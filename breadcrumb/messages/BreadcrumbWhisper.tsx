"use client";
// ─────────────────────────────────────────────────────────────
// breadcrumb/messages/BreadcrumbWhisper.tsx — Subtle message renderer
// ─────────────────────────────────────────────────────────────
//
// A minimal, non-invasive floating text element that fades in,
// lingers, then fades out. Appears in the bottom-left corner
// of the viewport — away from typical CTA positions.
//
// Design goals:
// - Feels like a passing thought, not a notification
// - Never blocks content or interaction
// - Disappears on its own — no dismiss button needed
// - Uses only inline styles (no external CSS dependency)
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from "react";

interface BreadcrumbWhisperProps {
  /** The message text to display */
  message: string | null;
  /** How long (ms) the message stays fully visible */
  displayDurationMs?: number;
  /** Fade-in/out duration (ms) */
  fadeDurationMs?: number;
}

type Phase = "hidden" | "fading-in" | "visible" | "fading-out";

export function BreadcrumbWhisper({
  message,
  displayDurationMs = 8000,
  fadeDurationMs = 1200,
}: BreadcrumbWhisperProps) {
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("hidden");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    // Only trigger when we get a new, different message
    if (!message || message === lastMessageRef.current) return;
    lastMessageRef.current = message;

    // If currently showing something, fast-fade-out first
    if (phase !== "hidden") {
      setPhase("fading-out");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        showMessage(message);
      }, fadeDurationMs);
      return;
    }

    showMessage(message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  function showMessage(msg: string) {
    setCurrentMessage(msg);
    setPhase("fading-in");

    if (timerRef.current) clearTimeout(timerRef.current);

    // After fade-in completes → visible
    timerRef.current = setTimeout(() => {
      setPhase("visible");

      // After display duration → fade out
      timerRef.current = setTimeout(() => {
        setPhase("fading-out");

        // After fade-out → hidden
        timerRef.current = setTimeout(() => {
          setPhase("hidden");
          setCurrentMessage(null);
        }, fadeDurationMs);
      }, displayDurationMs);
    }, fadeDurationMs);
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (phase === "hidden" || !currentMessage) return null;

  const opacity =
    phase === "fading-in"
      ? 1
      : phase === "visible"
        ? 1
        : phase === "fading-out"
          ? 0
          : 0;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "fixed",
        bottom: "120px",
        left: "2rem",
        maxWidth: "min(360px, calc(100vw - 4rem))",
        zIndex: 40,
        pointerEvents: "none",
        // Animation
        opacity,
        transform:
          phase === "fading-in"
            ? "translateY(0)"
            : phase === "fading-out"
              ? "translateY(4px)"
              : "translateY(0)",
        transition: `opacity ${fadeDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${fadeDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderRadius: "10px",
          background: "hsl(var(--card) / 0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 2px 12px hsl(var(--foreground) / 0.06)",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          fontSize: "0.875rem",
          lineHeight: 1.5,
          letterSpacing: "0.01em",
          fontWeight: 500,
          fontStyle: "italic",
          color: "hsl(var(--card-foreground))",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {currentMessage}
      </div>
    </div>
  );
}
