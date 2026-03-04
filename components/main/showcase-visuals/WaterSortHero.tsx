"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useShowcaseInView,
  useShowcaseHasEntered,
} from "@/components/main/ShowcaseCard";

/* ── Tube dimensions (match original) ── */
const MINI_TUBE_W = 28;
const MINI_LAYER_H = 28;
const MINI_TUBE_H = 4 * MINI_LAYER_H + 8; // 120px

/* ── Static decorative tube color stacks ── */
const LEFT_TUBES = [
  ["#EF4444", "#EF4444", "#3B82F6", "#22C55E"],
  ["#3B82F6", "#22C55E", "#3B82F6", "#EF4444"],
];

const RIGHT_TUBES = [
  ["#8B5CF6", "#F97316", "#8B5CF6", "#F97316"],
  ["#F97316", "#8B5CF6", "#F97316", "#8B5CF6"],
];

/* ── Jar emoji cycle list (original timing: 3.5 s per frame) ── */
const JAR_EMOJIS = [
  { emoji: "🍎", color: "#EF4444" },
  { emoji: "🍊", color: "#F97316" },
  { emoji: "🫐", color: "#3B82F6" },
  { emoji: "🍇", color: "#8B5CF6" },
  { emoji: "🍑", color: "#EC4899" },
  { emoji: "🥝", color: "#22C55E" },
  { emoji: "🍋", color: "#EAB308" },
  { emoji: "🦋", color: "#3B82F6" },
  { emoji: "🌹", color: "#EF4444" },
  { emoji: "💎", color: "#8B5CF6" },
  { emoji: "🐸", color: "#22C55E" },
  { emoji: "🍒", color: "#EF4444" },
];

/* ── AnimatePresence swap variants ──
   Content-cycling layout transitions that CSS cannot replicate:
   coordinated exit → wait → enter of dynamic keyed content.
*/
const glowPulseVariants = {
  enter: { opacity: 0 },
  pulse: {
    opacity: [0.3, 0.55, 0.3],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const },
  },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

const liquidFadeVariants = {
  enter: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
  exit: { opacity: 0, transition: { duration: 0.6 } },
};

const emojiSwapVariants = {
  enter: { opacity: 0, scale: 0.6, y: 8 },
  center: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, scale: 0.6, y: -8, transition: { duration: 0.5 } },
};

/* ═══════════════════════════════════════════════════════════
   MINI TUBE — glass tube with liquid-fill entrance animation.
   Uses CSS transitions driven by `hasEntered` from context so
   the fill is synchronised with the card's own entrance rather
   than racing ahead via an independent IntersectionObserver.
   ═══════════════════════════════════════════════════════════ */

function MiniTube({
  colors,
  delay,
  hasEntered,
}: {
  colors: string[];
  delay: number;
  hasEntered: boolean;
}) {
  return (
    <div
      className="relative flex flex-col items-center"
      style={{
        opacity: 0,
        ...(hasEntered && {
          animation: `sc-tube-enter 0.5s ease-out ${delay}s both`,
        }),
      }}
    >
      {/* Tube rim — wider than body */}
      <div
        style={{ width: MINI_TUBE_W + 8, height: 4 }}
        className="rounded-t-sm"
      >
        <div
          className="w-full h-full rounded-t-sm"
          style={{
            borderLeft: "2px solid rgba(255,255,255,0.22)",
            borderRight: "2px solid rgba(255,255,255,0.22)",
            borderTop: "2px solid rgba(255,255,255,0.18)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Tube body */}
      <div
        className="relative overflow-hidden"
        style={{
          width: MINI_TUBE_W,
          height: MINI_TUBE_H,
          borderLeft: "2px solid rgba(255,255,255,0.15)",
          borderRight: "2px solid rgba(255,255,255,0.15)",
          borderBottom: "2px solid rgba(255,255,255,0.15)",
          borderBottomLeftRadius: MINI_TUBE_W / 2,
          borderBottomRightRadius: MINI_TUBE_W / 2,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        }}
      >
        {/* Liquid layers — stacked from bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col-reverse"
          style={{
            borderBottomLeftRadius: MINI_TUBE_W / 2 - 2,
            borderBottomRightRadius: MINI_TUBE_W / 2 - 2,
          }}
        >
          {colors.map((c, i) => (
            <div
              key={i}
              className="w-full"
              style={{
                height: MINI_LAYER_H,
                background: `linear-gradient(90deg, ${c}50 0%, ${c} 22%, ${c} 78%, ${c}cc 100%)`,
                borderTop:
                  i === colors.length - 1
                    ? "1.5px solid rgba(255,255,255,0.18)"
                    : "0.5px solid rgba(255,255,255,0.06)",
                ...(i === colors.length - 1
                  ? { borderTopLeftRadius: 3, borderTopRightRadius: 3 }
                  : {}),
                transform: "translateY(-140px)",
                ...(hasEntered && {
                  animation: `sc-liquid-fall 0.4s ease-in ${delay + 0.35 + 0.15 * i}s both`,
                }),
              }}
            />
          ))}
        </div>

        {/* Glass reflection */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: 3,
            top: "10%",
            width: 3,
            height: "55%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.30) 0%, transparent 100%)",
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHOWCASE JAR — cycles through emoji/color frames.
   AnimatePresence required: CSS cannot coordinate exit → enter
   of dynamically-keyed content swaps.
   ═══════════════════════════════════════════════════════════ */

function ShowcaseJar({ hasEntered }: { hasEntered: boolean }) {
  const [idx, setIdx] = useState(0);
  const inView = useShowcaseInView();

  /* Interval only ticks while the showcase is in the viewport */
  useEffect(() => {
    if (!inView) return;
    const timer = setInterval(
      () => setIdx((prev) => (prev + 1) % JAR_EMOJIS.length),
      3500,
    );
    return () => clearInterval(timer);
  }, [inView]);

  const current = JAR_EMOJIS[idx];

  const jarW = 120;
  const jarH = 156;
  const bodyTop = 34;
  const neckW = jarW * 0.42;
  const neckH = 28;
  const lidW = neckW + 14;
  const lidH = 10;
  const bodyH = jarH - bodyTop;

  return (
    <div
      className="relative select-none"
      style={{
        width: jarW,
        height: jarH,
        opacity: 0,
        ...(hasEntered && {
          animation: "sc-jar-enter 0.6s ease-out 0.5s both",
        }),
      }}
    >
      {/* Ambient glow — color swap via AnimatePresence, pulse via variant */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.color}
          className="absolute pointer-events-none"
          style={{
            left: -20,
            right: -20,
            top: bodyTop - 20,
            bottom: -20,
            borderRadius: 40,
            background: `radial-gradient(circle, ${current.color}55 0%, transparent 70%)`,
            filter: "blur(16px)",
          }}
          variants={glowPulseVariants}
          initial="enter"
          animate="pulse"
          exit="exit"
        />
      </AnimatePresence>

      {/* ── LID ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: (jarW - lidW) / 2,
          top: 0,
          width: lidW,
          height: lidH,
          borderRadius: "5px 5px 2px 2px",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.06) 100%)",
          border: "1.5px solid rgba(255,255,255,0.20)",
          boxShadow:
            "0 2px 6px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.15)",
        }}
      />

      {/* ── NECK ── */}
      <div
        className="absolute pointer-events-none overflow-hidden"
        style={{
          left: (jarW - neckW) / 2,
          top: lidH - 1,
          width: neckW,
          height: neckH,
          borderLeft: "2px solid rgba(255,255,255,0.18)",
          borderRight: "2px solid rgba(255,255,255,0.18)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
        }}
      >
        {/* Neck glass highlight */}
        <div
          className="absolute"
          style={{
            left: 3,
            top: 2,
            width: 2,
            height: "80%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.30) 0%, transparent 100%)",
            borderRadius: 999,
          }}
        />
      </div>

      {/* ── SHOULDER ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: (jarW - neckW) / 2 - (jarW - 8 - neckW) / 2,
          top: bodyTop - 8,
          width: jarW - 8,
          height: 14,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          borderLeft: "2px solid rgba(255,255,255,0.16)",
          borderRight: "2px solid rgba(255,255,255,0.16)",
          borderTop: "2px solid rgba(255,255,255,0.14)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
          clipPath: `polygon(${((jarW - 8 - neckW) / 2 / (jarW - 8)) * 100}% 0%, ${(1 - (jarW - 8 - neckW) / 2 / (jarW - 8)) * 100}% 0%, 100% 100%, 0% 100%)`,
        }}
      />

      {/* ── JAR BODY ── */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: 4,
          top: bodyTop,
          width: jarW - 8,
          height: bodyH,
          borderLeft: "2.5px solid rgba(255,255,255,0.16)",
          borderRight: "2.5px solid rgba(255,255,255,0.16)",
          borderBottom: "2.5px solid rgba(255,255,255,0.16)",
          borderBottomLeftRadius: 18,
          borderBottomRightRadius: 18,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 60%, rgba(255,255,255,0.02) 100%)",
          backdropFilter: "blur(6px)",
          boxShadow:
            "inset 0 0 24px rgba(255,255,255,0.02), 0 10px 36px rgba(0,0,0,0.3)",
        }}
      >
        {/* Left glass reflection */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: 5,
            top: "8%",
            width: 4,
            height: "65%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
            borderRadius: 999,
          }}
        />

        {/* Right faint reflection */}
        <div
          className="absolute pointer-events-none"
          style={{
            right: 7,
            top: "15%",
            width: 2.5,
            height: "40%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)",
            borderRadius: 999,
          }}
        />

        {/* Liquid fill — color swap via AnimatePresence */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.color}
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: "65%",
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
            }}
            variants={liquidFadeVariants}
            initial="enter"
            animate="visible"
            exit="exit"
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(0deg, ${current.color}cc 0%, ${current.color} 45%, ${current.color}88 100%)`,
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
              }}
            />
            {/* Liquid surface wave — CSS animation (sc-liquid-wave) */}
            <div
              className="absolute -top-[5px] left-0 right-0 h-3 pointer-events-none sc-liquid-wave"
              style={{
                background: `radial-gradient(ellipse at 50% 100%, ${current.color}66 0%, transparent 70%)`,
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Emoji — swap via AnimatePresence */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ top: -4 }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={idx}
              className="absolute text-5xl"
              style={{
                fontFamily:
                  "var(--font-emoji, 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif)",
              }}
              variants={emojiSwapVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {current.emoji}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Glass overlay sheen */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.03) 100%)",
          }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EXPORT — Composed hero visual: tubes flanking the jar.
   Reads `hasEntered` from context so all entrance transitions
   share the same trigger as the card’s own fade-in.
   ═══════════════════════════════════════════════════════════ */

export default function WaterSortHero() {
  const hasEntered = useShowcaseHasEntered();

  return (
    <div className="flex items-end gap-4 md:gap-5">
      {LEFT_TUBES.map((colors, i) => (
        <MiniTube
          key={`l-${i}`}
          colors={colors}
          delay={0.3 + i * 0.08}
          hasEntered={hasEntered}
        />
      ))}
      <ShowcaseJar hasEntered={hasEntered} />
      {RIGHT_TUBES.map((colors, i) => (
        <MiniTube
          key={`r-${i}`}
          colors={colors}
          delay={0.46 + i * 0.08}
          hasEntered={hasEntered}
        />
      ))}
    </div>
  );
}
