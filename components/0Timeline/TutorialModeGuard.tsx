"use client";

import React, { useEffect, useState } from "react";

interface Props {
  onClose: () => void;
}

/**
 * Renders a blocking overlay inside a modal when the tutorial is active.
 * Content behind it is visible but fully inert — only the
 * "Back to Tutorial" button works.
 */
export default function TutorialModeGuard({ onClose }: Props) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(document.body.dataset.tutorialActive === "true");
  }, []);

  if (!active) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[inherit]"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Pulsing tutorial badge */}
      <div className="flex flex-col items-center gap-4 text-center px-6">
        <div className="animate-pulse inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/20 border-2 border-amber-500/50 shadow-lg shadow-amber-500/10 backdrop-blur-sm">
          <span className="text-amber-400 text-lg">📖</span>
          <span className="text-amber-300 text-sm font-semibold tracking-wide uppercase">
            Tutorial Mode
          </span>
        </div>

        <p className="text-neutral-300 text-sm max-w-xs leading-relaxed">
          This panel is preview‑only while the tutorial is running.
          <br />
          Close it to pick up where you left off.
        </p>

        <button
          onClick={onClose}
          type="button"
          className="mt-1 px-5 py-2 text-sm font-medium rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 hover:text-amber-200 transition-colors backdrop-blur-sm"
        >
          ← Back to Tutorial
        </button>
      </div>
    </div>
  );
}
