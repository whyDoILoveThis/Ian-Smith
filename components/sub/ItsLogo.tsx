"use client";

import React, { useRef, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";

export default function ITSLogo() {
  const letters = ["I", "T", "S"] as const;
  const controls = useAnimation();
  const timerRef = useRef<number | null>(null);
  const hoveredRef = useRef(false);

  const clearFlashTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleNextFlash = () => {
    clearFlashTimer();
    // random interval 2.5s - 6.5s
    const next = Math.floor(Math.random() * (6500 - 2500 + 1)) + 2500;
    timerRef.current = window.setTimeout(async () => {
      // ensure still hovered before running a flash
      if (!hoveredRef.current) {
        clearFlashTimer();
        return;
      }

      // run one smooth subtle streak across backgroundPositionX
      // using a single controls.start call with keyframes to avoid race conditions
      await controls.start({
        backgroundPositionX: ["0%", "220%", "0%"],
        transition: { duration: 1.0, ease: "easeInOut" },
      });

      // schedule again only if still hovered
      if (hoveredRef.current) scheduleNextFlash();
    }, next);
  };

  const handleEnter = async () => {
    hoveredRef.current = true;

    // initial lift animation for letters (staggered by index)
    // run once and wait for it to finish before starting the random streak loop
    controls.start((i: number) => ({
      y: -6,
      scale: 1.05,
      filter: "blur(0.8px)",
      backgroundPositionX: "0%", // ensure base pos
      transition: {
        duration: 0.36,
        delay: i * 0.06,
        ease: "easeOut",
      },
    }));

    // run one smooth subtle streak across backgroundPositionX
    // using a single controls.start call with keyframes to avoid race conditions
    await controls.start({
      backgroundPositionX: ["0%", "220%", "0%"],
      transition: { duration: 1.0, ease: "easeInOut" },
    });

    // start random streaks while hovered
    scheduleNextFlash();
  };

  const handleLeave = () => {
    hoveredRef.current = false;
    clearFlashTimer();

    // return everything to neutral
    controls.start({
      y: 0,
      scale: 1,
      backgroundPositionX: "0%",
      filter: "blur(0px)",
      transition: { duration: 0.35, ease: "easeOut" },
    });
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      clearFlashTimer();
    };
  }, []);

  return (
    <div
      className="relative flex items-center justify-center select-none cursor-pointer"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      aria-label="ITS logo"
    >
      {/* subtle glow behind logo */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ filter: "blur(18px)", opacity: 0.18 }}
      >
        <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-tr from-sky-400/30 via-cyan-300/16 to-indigo-400/24" />
      </div>

      {/* letters */}
      <div className="relative flex gap-1 sm:gap-2 z-10 will-change-transform">
        {letters.map((ch) => (
          <motion.span
            key={ch}
            animate={controls}
            initial={{
              y: 0,
              scale: 1,
              backgroundPositionX: "0%",
              filter: "blur(0px)",
            }}
            className="inline-block text-5xl  font-extrabold leading-none tracking-[0.12em] bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(56,189,248,0.22)]"
            style={{
              // PASTEL BLUES & PURPLES ONLY, no white
              backgroundImage:
                "linear-gradient(110deg, #c7d2fe 0%, #a5b4fc 25%, #818cf8 50%, #a78bfa 75%, #d8b4fe 100%)",
              backgroundSize: "200% 100%", // keeps your existing flash animation intact
            }}
          >
            {/* DARK OUTLINE DUPLICATE */}
            <span
              aria-hidden
              className="absolute inset-0 text-transparent font-extrabold"
              style={{
                WebkitTextStroke: "1px #0f0f0f", // dark outline
                zIndex: 0,
              }}
            >
              {ch}
            </span>
            {ch}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
