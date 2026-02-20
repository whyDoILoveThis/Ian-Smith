"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Animated badge that alternates between two scroll-control hints
 * (Ctrl+Scroll to pan ↔ Alt+Scroll to zoom).
 *
 * Switches quickly at first, then slows down so users see both
 * instructions a few times before it settles.
 */
export default function TimelineScrollHint() {
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    // Delays in ms — fast at first, slowing down
    const delays = [2000, 2000, 2000, 2000, 3500, 3500, 5000, 5000, 7000];
    const delay = delays[Math.min(hintIndex, delays.length - 1)];
    const timer = setTimeout(() => setHintIndex((i) => i + 1), delay);
    return () => clearTimeout(timer);
  }, [hintIndex]);

  const showCtrl = hintIndex % 2 === 0;

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <AnimatePresence mode="wait">
        {showCtrl ? (
          <motion.div
            key="ctrl"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-[11px] text-neutral-300 backdrop-blur-sm"
          >
            <span className="flex items-center gap-1">
              Hold{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-white font-mono text-[10px] border border-white/20">
                Ctrl
              </kbd>
              + Scroll to pan
            </span>
            <span className="text-neutral-600">|</span>
            <span>Drag to pan</span>
          </motion.div>
        ) : (
          <motion.div
            key="alt"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-[11px] text-neutral-300 backdrop-blur-sm"
          >
            <span className="flex items-center gap-1">
              Hold{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-white font-mono text-[10px] border border-white/20">
                Alt
              </kbd>
              + Scroll to zoom
            </span>
            <span className="text-neutral-600">|</span>
            <span>Drag to pan</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
