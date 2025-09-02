"use client";
import React from "react";
import { motion } from "framer-motion";

/**
 * ITSLoader.tsx
 * Sleek, modern loader that animates the letters "ITS" with a shimmering gradient,
 * subtle bounce, and a looping progress pulse bar.
 * Fullscreen silver streak background.
 */

export default function ITSLoader() {
  const letters = ["I", "T", "S"] as const;

  return (
    <div
      className="relative grid place-items-center min-h-screen w-full overflow-hidden bg-neutral-950 select-none"
      aria-label="ITS loading"
    >
      {/* Fullscreen Silver Streak Background */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={{ backgroundPositionX: "0%" }}
        animate={{ backgroundPositionX: ["0%", "200%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage:
            "linear-gradient(115deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.05) 100%)",
          backgroundSize: "200% 100%",
        }}
      />

      {/* Overlay Glow */}
      <div className="pointer-events-none absolute inset-0 mx-auto blur-3xl opacity-40">
        <div className="h-80 w-80 rounded-full bg-gradient-to-tr from-sky-400/30 via-cyan-300/20 to-indigo-400/30 mx-auto" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-[320px] sm:w-[380px] rounded-2xl p-6  shadow-[0_10px_60px_-15px_rgba(0,0,0,0.6)]">
        {/* Letters row */}
        <div className="flex items-end justify-center gap-2 sm:gap-4">
          {letters.map((ch, i) => (
            <motion.span
              key={ch}
              animate={{
                opacity: 1,
                y: [0, -6, 0],
                scale: [1, 1.06, 1],
                filter: ["blur(0px)", "blur(1.5px)", "blur(0px)"],
                backgroundPositionX: ["0%", "200%"],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
              }}
              className="inline-block text-7xl sm:text-8xl font-extrabold leading-none tracking-[0.18em] sm:tracking-[0.22em] bg-clip-text text-transparent drop-shadow-[0_6px_25px_rgba(56,189,248,0.35)]"
              style={{
                backgroundImage:
                  "linear-gradient(110deg, #e5e7eb 0%, #ffffff 30%, #60a5fa 50%, #22d3ee 70%, #e5e7eb 100%)",
                backgroundSize: "200% 100%",
              }}
            >
              {ch}
            </motion.span>
          ))}
        </div>

        {/* Tiny subtitle */}
        <div className="mt-3 text-center text-xs text-neutral-400 tracking-[0.35em] uppercase">
          Loading
        </div>

        {/* Progress bar */}
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800/80">
          <motion.div
            className="h-full w-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, rgba(34,211,238,0.15), rgba(96,165,250,0.6), rgba(34,211,238,0.15))",
            }}
            initial={{ x: "-100%" }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
}
