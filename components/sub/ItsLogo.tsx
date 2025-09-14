"use client";

import React, { useRef, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";

export default function ITSLogoSVG() {
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
    const next = Math.floor(Math.random() * (6500 - 2500 + 1)) + 2500;
    timerRef.current = window.setTimeout(async () => {
      if (!hoveredRef.current) {
        clearFlashTimer();
        return;
      }

      await controls.start({
        gradientTransform: [
          "translate(0,0)",
          "translate(200,0)",
          "translate(0,0)",
        ],
        transition: { duration: 1.0, ease: "easeInOut" },
      });

      if (hoveredRef.current) scheduleNextFlash();
    }, next);
  };

  const handleEnter = async () => {
    hoveredRef.current = true;

    // lift animation
    controls.start({
      y: -6,
      scale: 1.05,
      filter: "blur(0.8px)",
      transition: { duration: 0.36, ease: "easeOut" },
    });

    // initial streak
    await controls.start({
      gradientTransform: [
        "translate(0,0)",
        "translate(200,0)",
        "translate(0,0)",
      ],
      transition: { duration: 1.0, ease: "easeInOut" },
    });

    scheduleNextFlash();
  };

  const handleLeave = () => {
    hoveredRef.current = false;
    clearFlashTimer();
    controls.start({
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      gradientTransform: "translate(0,0)",
      transition: { duration: 0.35, ease: "easeOut" },
    });
  };

  useEffect(() => {
    return () => clearFlashTimer();
  }, []);

  return (
    <div
      className="relative flex items-center justify-center select-none cursor-pointer"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* subtle glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ filter: "blur(18px)", opacity: 0.18 }}
      >
        <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-tr from-sky-400/30 via-cyan-300/16 to-indigo-400/24" />
      </div>

      {/* One SVG with all letters */}
      <motion.svg
        viewBox="0 0 350 80"
        width="12rem"
        height="3.9rem"
        animate={controls}
        initial={{
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          gradientTransform: "translate(0,0)",
        }}
        className="z-10 drop-shadow-[0_4px_12px_rgba(56,189,248,0.22)]"
      >
        <defs>
          <motion.linearGradient
            id="its-gradient"
            x1="0"
            x2="300"
            gradientUnits="userSpaceOnUse"
            animate={controls}
            initial={{ gradientTransform: "translate(0,0)" }}
          >
            <stop offset="0%" stopColor="#c7d2fe" />
            <stop offset="25%" stopColor="#a5b4fc" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="75%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#d8b4fe" />
          </motion.linearGradient>
        </defs>

        <text
          x="30%"
          y="70%"
          textAnchor="middle"
          fontSize="84"
          fontWeight="800"
          fontFamily="Inter, ui-sans-serif, system-ui"
          fill="url(#its-gradient)"
          stroke="#0f0f0f"
          strokeWidth="4"
          paintOrder="stroke"
        >
          ITS
        </text>
      </motion.svg>
    </div>
  );
}
