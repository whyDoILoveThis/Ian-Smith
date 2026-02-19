"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

/* ── Decorative floating emoji that drift across the showcase ── */
const FLOAT_EMOJIS = [
  "🍎",
  "🍊",
  "🍋",
  "🥝",
  "🫐",
  "🍇",
  "🍑",
  "🍓",
  "🌹",
  "💎",
  "🦋",
  "🐸",
  "🍒",
  "🍉",
  "💜",
  "🧁",
];

/* ── Jar emoji cycle list ── */
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

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

function useFloatingEmojis(count = 12): FloatingEmoji[] {
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);

  useEffect(() => {
    setEmojis(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        emoji: FLOAT_EMOJIS[Math.floor(Math.random() * FLOAT_EMOJIS.length)],
        x: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 10 + Math.random() * 8,
        size: 16 + Math.random() * 14,
      })),
    );
  }, [count]);

  return emojis;
}

/* ── Tube dimensions — proportional to game (W=56, H=176 → ratio ≈ 3.14) ── */
const MINI_TUBE_W = 28;
const MINI_LAYER_H = 28;
const MINI_TUBE_H = 4 * MINI_LAYER_H + 8; // 120px

/* ── Static decorative tubes ── */
const LEFT_TUBES = [
  ["#EF4444", "#EF4444", "#3B82F6", "#22C55E"],
  ["#3B82F6", "#22C55E", "#3B82F6", "#EF4444"],
];

const RIGHT_TUBES = [
  ["#8B5CF6", "#F97316", "#8B5CF6", "#F97316"],
  ["#F97316", "#8B5CF6", "#F97316", "#8B5CF6"],
];

function MiniTube({ colors, delay }: { colors: string[]; delay: number }) {
  return (
    <motion.div
      className="relative flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
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
          className="absolute bottom-0 left-0 right-0 flex flex-col-reverse overflow-hidden"
          style={{
            borderBottomLeftRadius: MINI_TUBE_W / 2 - 2,
            borderBottomRightRadius: MINI_TUBE_W / 2 - 2,
          }}
        >
          {colors.map((c, i) => (
            <motion.div
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
              }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ delay: delay + 0.08 * i, duration: 0.3 }}
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
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENT — Showcase Jar (matches game CenterEmoji)
   ═══════════════════════════════════════════════════════════ */

function ShowcaseJar() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % JAR_EMOJIS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

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
    <motion.div
      className="relative select-none"
      style={{ width: jarW, height: jarH }}
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.35, duration: 0.6, ease: "easeOut" }}
    >
      {/* Ambient glow — pulses with color change */}
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
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.55, 0.3] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
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

        {/* Liquid fill — animated color transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.color}
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: "65%",
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(0deg, ${current.color}cc 0%, ${current.color} 45%, ${current.color}88 100%)`,
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
              }}
            />
            {/* Liquid surface wave */}
            <motion.div
              className="absolute -top-[5px] left-0 right-0 h-3 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at 50% 100%, ${current.color}66 0%, transparent 70%)`,
              }}
              animate={{ y: [0, -2, 0] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* ── Cycling emoji ── */}
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
              initial={{ opacity: 0, scale: 0.6, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: -8 }}
              transition={{ duration: 0.5 }}
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
    </motion.div>
  );
}

/* ── Feature badge ── */
function FeatureBadge({
  icon,
  label,
  delay,
}: {
  icon: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-2 rounded-full
        bg-white/[0.05] border border-white/10 backdrop-blur-sm"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.45 }}
    >
      <span className="text-base" style={{ fontFamily: "var(--font-emoji)" }}>
        {icon}
      </span>
      <span className="text-sm font-medium text-white/70">{label}</span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN SHOWCASE COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function WaterSortShowcase() {
  const floaters = useFloatingEmojis(10);

  return (
    <section className="relative w-full max-w-5xl mx-auto my-24 px-4">
      {/* ── Background glow ── */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, #8B5CF6 0%, #EC4899 40%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Floating emoji decorations ── */}
      <div className="absolute inset-0 -z-5 overflow-hidden rounded-3xl pointer-events-none">
        {floaters.map((f) => (
          <motion.span
            key={f.id}
            className="absolute opacity-0"
            style={{
              left: `${f.x}%`,
              bottom: -30,
              fontSize: f.size,
              fontFamily: "var(--font-emoji)",
            }}
            animate={{
              y: [0, -500],
              opacity: [0, 0.25, 0.2, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: f.duration,
              delay: f.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {f.emoji}
          </motion.span>
        ))}
      </div>

      {/* ── Card ── */}
      <motion.div
        className="relative z-10 rounded-3xl border border-white/10
          bg-gradient-to-b from-white/[0.06] to-white/[0.02]
          backdrop-blur-xl shadow-2xl shadow-purple-500/5 overflow-hidden"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400" />

        <div className="p-8 md:p-12 lg:p-16">
          {/* Header area */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10 mb-10">
            {/* Left – text */}
            <div className="max-w-md flex-shrink-0">
              <motion.span
                className="inline-block px-3 py-1 mb-4 rounded-full text-xs font-semibold uppercase tracking-wider
                  bg-purple-500/20 text-purple-300 border border-purple-500/30"
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
              >
                Featured Game
              </motion.span>

              <motion.h2
                className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight
                  bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Emoji Sort
              </motion.h2>

              <motion.p
                className="mt-4 text-base md:text-lg text-white/50 leading-relaxed"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                A colorful twist on the classic water-sort puzzle — sort emojis
                into matching tubes across{" "}
                <span className="text-white/70 font-semibold">
                  30 hand-crafted levels
                </span>
                . Beautiful glass-tube physics, star ratings, and satisfying
                celebration particles on every win.
              </motion.p>

              {/* Feature badges */}
              <div className="flex flex-wrap gap-2 mt-6">
                <FeatureBadge icon="🧩" label="30 Levels" delay={0.35} />
                <FeatureBadge icon="⭐" label="Star Ratings" delay={0.4} />
                <FeatureBadge icon="🎉" label="Celebrations" delay={0.45} />
                <FeatureBadge icon="↩️" label="Undo Support" delay={0.5} />
              </div>
            </div>

            {/* Right – Tubes flanking the Jar */}
            <motion.div
              className="flex items-end gap-4 md:gap-5 self-center lg:self-end"
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
            >
              {/* Left tubes */}
              {LEFT_TUBES.map((colors, i) => (
                <MiniTube
                  key={`l-${i}`}
                  colors={colors}
                  delay={0.3 + i * 0.08}
                />
              ))}

              {/* Center jar */}
              <ShowcaseJar />

              {/* Right tubes */}
              {RIGHT_TUBES.map((colors, i) => (
                <MiniTube
                  key={`r-${i}`}
                  colors={colors}
                  delay={0.46 + i * 0.08}
                />
              ))}
            </motion.div>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

          {/* Bottom – CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <motion.p
              className="text-white/30 text-sm"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              Built with React, Framer Motion &amp; SVG — fully responsive &amp;
              mobile-friendly
            </motion.p>

            <Link href="/water-sort">
              <motion.button
                className="group relative px-8 py-3.5 rounded-2xl text-sm font-bold
                  bg-gradient-to-r from-purple-500 to-pink-500
                  hover:from-purple-400 hover:to-pink-400
                  text-white shadow-xl shadow-purple-500/25
                  transition-shadow hover:shadow-purple-500/40 cursor-pointer"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.55 }}
              >
                <span className="flex items-center gap-2">
                  Play Now
                  <svg
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </span>
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
