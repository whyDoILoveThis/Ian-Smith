"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShowcaseInView } from "@/components/main/ShowcaseCard";

/* ── Icon size labels for the multi-size display ── */
const ICO_SIZES = [
  { size: 16, label: "16px", desc: "Favicon" },
  { size: 32, label: "32px", desc: "Taskbar" },
  { size: 48, label: "48px", desc: "Explorer" },
  { size: 256, label: "256px", desc: "Hi-DPI" },
] as const;

const SIZE_MAP: Record<number, number> = { 16: 20, 32: 28, 48: 36, 256: 48 };

/* ── Color palette for the cycling demo (original timing: 3.8 s per frame) ── */
const DEMO_LOGOS = [
  { bg: "#3B82F6", shape: "#FFFFFF", accent: "#1D4ED8", name: "Shield" },
  { bg: "#22C55E", shape: "#FFFFFF", accent: "#15803D", name: "Leaf" },
  { bg: "#EF4444", shape: "#FFFFFF", accent: "#B91C1C", name: "Flame" },
  { bg: "#8B5CF6", shape: "#FFFFFF", accent: "#6D28D9", name: "Gem" },
  { bg: "#F97316", shape: "#FFFFFF", accent: "#C2410C", name: "Star" },
];

/* ── AnimatePresence swap variants ──
   Logo crossfade requires coordinated exit → enter on keyed content.
   CSS cannot animate removed DOM nodes.
*/
const logoSwapVariants = {
  enter: { opacity: 0, x: -10 },
  center: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, x: 10, transition: { duration: 0.5 } },
};

const afterLogoSwapVariants = {
  enter: { opacity: 0, x: -10 },
  center: { opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.15 } },
  exit: { opacity: 0, x: 10, transition: { duration: 0.5 } },
};

/* ═══════════════════════════════════════════════════════════
   MINI LOGO — static decorative shape
   ═══════════════════════════════════════════════════════════ */

function MiniLogo({
  bg,
  shape,
  accent,
  transparent,
  size = 80,
}: {
  bg: string;
  shape: string;
  accent: string;
  transparent?: boolean;
  size?: number;
}) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background — solid or checkerboard */}
      <div
        className="absolute inset-0 rounded-xl overflow-hidden"
        style={
          transparent
            ? {
                backgroundImage: `
                  linear-gradient(45deg, #d1d5db 25%, transparent 25%),
                  linear-gradient(-45deg, #d1d5db 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #d1d5db 75%),
                  linear-gradient(-45deg, transparent 75%, #d1d5db 75%)
                `,
                backgroundSize: "12px 12px",
                backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
                backgroundColor: "#f3f4f6",
              }
            : { backgroundColor: bg }
        }
      />

      {/* Inner shape — abstract logo mark */}
      <svg
        viewBox="0 0 80 80"
        fill="none"
        className="absolute inset-0 w-full h-full"
        style={{ padding: size * 0.18 }}
      >
        <path
          d="M20 8 L60 8 L68 25 L52 45 L40 65 L28 45 L12 25 Z"
          fill={shape}
          opacity={0.95}
        />
        <path d="M40 18 L50 32 L40 46 L30 32 Z" fill={accent} opacity={0.6} />
        <circle cx="40" cy="30" r="4" fill={shape} opacity={0.8} />
      </svg>

      {/* Glass overlay */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
        }}
      />

      {/* Border */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          border: transparent
            ? "2px solid rgba(249,115,22,0.4)"
            : "2px solid rgba(255,255,255,0.15)",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EXPORT — Composed hero visual: Before→After + ICO ribbon
   ═══════════════════════════════════════════════════════════ */

export default function IconCreatorHero() {
  const [idx, setIdx] = useState(0);
  const inView = useShowcaseInView();

  /* Interval only ticks while the showcase is in the viewport */
  useEffect(() => {
    if (!inView) return;
    const timer = setInterval(
      () => setIdx((prev) => (prev + 1) % DEMO_LOGOS.length),
      3800,
    );
    return () => clearInterval(timer);
  }, [inView]);

  const current = DEMO_LOGOS[idx];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Before → After cards */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* BEFORE card — AnimatePresence for keyed content swap */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            Before
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={`before-${idx}`}
              variants={logoSwapVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <MiniLogo
                bg={current.bg}
                shape={current.shape}
                accent={current.accent}
                size={90}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Arrow / wand indicator — nudge translateX 0→4px→0, 1.5s ease-in-out */}
        <div className="flex flex-col items-center gap-1 sc-wand-nudge">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            className="text-orange-400"
          >
            <path
              d="M15 4V2M15 16V14M8 9H10M20 9H22M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15 9L3 21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <svg
            width="32"
            height="12"
            viewBox="0 0 32 12"
            fill="none"
            className="opacity-40"
          >
            <path
              d="M0 6H28M28 6L22 1M28 6L22 11"
              stroke="url(#arrowGradStatic)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="arrowGradStatic" x1="0" y1="6" x2="28" y2="6">
                <stop stopColor="#F97316" stopOpacity="0.3" />
                <stop offset="1" stopColor="#F97316" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* AFTER card — AnimatePresence with 150 ms enter delay */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400/70">
            After
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={`after-${idx}`}
              variants={afterLogoSwapVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <MiniLogo
                bg={current.bg}
                shape={current.shape}
                accent={current.accent}
                transparent
                size={90}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Multi-size ICO output ribbon */}
      <div className="flex items-end gap-2 sm:gap-3">
        {ICO_SIZES.map(({ size, label, desc }) => {
          const displaySize = SIZE_MAP[size] ?? 24;

          return (
            <div key={size} className="flex flex-col items-center gap-1.5">
              <div
                className="rounded-md border border-orange-500/30 flex items-center justify-center"
                style={{
                  width: displaySize,
                  height: displaySize,
                  backgroundImage: `
                    linear-gradient(45deg, rgba(249,115,22,0.08) 25%, transparent 25%),
                    linear-gradient(-45deg, rgba(249,115,22,0.08) 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, rgba(249,115,22,0.08) 75%),
                    linear-gradient(-45deg, transparent 75%, rgba(249,115,22,0.08) 75%)
                  `,
                  backgroundSize: "6px 6px",
                  backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px",
                }}
              >
                <div
                  className="rounded-sm bg-gradient-to-br from-orange-400 to-amber-500"
                  style={{
                    width: displaySize * 0.55,
                    height: displaySize * 0.55,
                  }}
                />
              </div>
              <span className="text-[9px] font-bold text-orange-400/60 tabular-nums">
                {label}
              </span>
              <span className="text-[8px] text-white/25 hidden sm:block">
                {desc}
              </span>
            </div>
          );
        })}
      </div>

      {/* .ico label — dot frozen (no pulse) */}
      <div
        className="flex items-center gap-2 px-3 py-1 rounded-full
          bg-orange-500/10 border border-orange-500/20"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-[10px] font-bold text-orange-400/80 uppercase tracking-wider">
          Multi-Size .ICO Output
        </span>
      </div>
    </div>
  );
}
