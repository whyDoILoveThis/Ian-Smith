"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

/* ── Floating decorative icons that drift across the showcase ── */
const FLOAT_ICONS = [
  "🖼️",
  "🎨",
  "✂️",
  "📐",
  "🔲",
  "💎",
  "⬛",
  "🟧",
  "🪄",
  "🖌️",
  "📸",
  "🌟",
  "🔶",
  "✨",
  "🎯",
  "🗂️",
];

/* ── Icon size labels for the multi-size display ── */
const ICO_SIZES = [
  { size: 16, label: "16px", desc: "Favicon" },
  { size: 32, label: "32px", desc: "Taskbar" },
  { size: 48, label: "48px", desc: "Explorer" },
  { size: 256, label: "256px", desc: "Hi-DPI" },
] as const;

/* ── Color palette for the cycling demo ── */
const DEMO_LOGOS = [
  { bg: "#3B82F6", shape: "#FFFFFF", accent: "#1D4ED8", name: "Shield" },
  { bg: "#22C55E", shape: "#FFFFFF", accent: "#15803D", name: "Leaf" },
  { bg: "#EF4444", shape: "#FFFFFF", accent: "#B91C1C", name: "Flame" },
  { bg: "#8B5CF6", shape: "#FFFFFF", accent: "#6D28D9", name: "Gem" },
  { bg: "#F97316", shape: "#FFFFFF", accent: "#C2410C", name: "Star" },
];

/* ═══════════════════════════════════════════════════════════
   FLOATING ICONS HOOK
   ═══════════════════════════════════════════════════════════ */

interface FloatingIcon {
  id: number;
  icon: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

function useFloatingIcons(count = 10): FloatingIcon[] {
  const [icons, setIcons] = useState<FloatingIcon[]>([]);

  useEffect(() => {
    setIcons(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        icon: FLOAT_ICONS[Math.floor(Math.random() * FLOAT_ICONS.length)],
        x: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 12 + Math.random() * 8,
        size: 14 + Math.random() * 12,
      })),
    );
  }, [count]);

  return icons;
}

/* ═══════════════════════════════════════════════════════════
   MINI LOGO — Decorative shape that cycles through designs
   ═══════════════════════════════════════════════════════════ */

function MiniLogo({
  bg,
  shape,
  accent,
  transparent,
  size = 80,
  delay = 0,
}: {
  bg: string;
  shape: string;
  accent: string;
  transparent?: boolean;
  size?: number;
  delay?: number;
}) {
  const r = size * 0.15;

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: 0.7 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
    >
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
        {/* Main shape */}
        <path
          d="M20 8 L60 8 L68 25 L52 45 L40 65 L28 45 L12 25 Z"
          fill={shape}
          opacity={0.95}
        />
        {/* Accent diamond */}
        <path d="M40 18 L50 32 L40 46 L30 32 Z" fill={accent} opacity={0.6} />
        {/* Highlight dot */}
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
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BEFORE → AFTER VISUAL (the hero visual element)
   ═══════════════════════════════════════════════════════════ */

function BeforeAfterVisual() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % DEMO_LOGOS.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const current = DEMO_LOGOS[idx];

  return (
    <motion.div
      className="flex flex-col items-center gap-6"
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
    >
      {/* Before → After cards */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* BEFORE card */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            Before
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={`before-${idx}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.5 }}
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

        {/* Arrow / wand indicator */}
        <motion.div
          className="flex flex-col items-center gap-1"
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Wand SVG icon */}
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
              stroke="url(#arrowGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="arrowGrad" x1="0" y1="6" x2="28" y2="6">
                <stop stopColor="#F97316" stopOpacity="0.3" />
                <stop offset="1" stopColor="#F97316" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        {/* AFTER card */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400/70">
            After
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={`after-${idx}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.5, delay: 0.15 }}
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
      <motion.div
        className="flex items-end gap-2 sm:gap-3"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.55, duration: 0.5 }}
      >
        {ICO_SIZES.map(({ size, label, desc }, i) => {
          /* Each size gets a visibly different display dimension */
          const sizeMap: Record<number, number> = {
            16: 20,
            32: 28,
            48: 36,
            256: 48,
          };
          const displaySize = sizeMap[size] ?? 24;

          return (
            <motion.div
              key={size}
              className="flex flex-col items-center gap-1.5"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 + i * 0.08, duration: 0.35 }}
            >
              {/* Mini icon square */}
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
            </motion.div>
          );
        })}
      </motion.div>

      {/* .ico label */}
      <motion.div
        className="flex items-center gap-2 px-3 py-1 rounded-full
          bg-orange-500/10 border border-orange-500/20"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-[10px] font-bold text-orange-400/80 uppercase tracking-wider">
          Multi-Size .ICO Output
        </span>
      </motion.div>
    </motion.div>
  );
}

/* ── Feature badge (same style as other showcases) ── */
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

export default function IconCreatorShowcase() {
  const floaters = useFloatingIcons(10);

  return (
    <section className="relative w-full max-w-5xl mx-auto px-4">
      {/* ── Background glow ── */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, #F97316 0%, #EF4444 40%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Floating icon decorations ── */}
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
              opacity: [0, 0.2, 0.15, 0],
              rotate: [0, 180],
            }}
            transition={{
              duration: f.duration,
              delay: f.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {f.icon}
          </motion.span>
        ))}
      </div>

      {/* ── Card ── */}
      <motion.div
        className="relative z-10 rounded-3xl border border-white/10
          bg-gradient-to-b from-white/[0.06] to-white/[0.02]
          backdrop-blur-xl shadow-2xl shadow-orange-500/5 overflow-hidden"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400" />

        <div className="p-8 md:p-12 lg:p-16">
          {/* Header area */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10 mb-10">
            {/* Left – text */}
            <div className="max-w-md flex-shrink-0">
              <motion.span
                className="inline-block px-3 py-1 mb-4 rounded-full text-xs font-semibold uppercase tracking-wider
                  bg-orange-500/20 text-orange-300 border border-orange-500/30"
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
              >
                Featured Tool
              </motion.span>

              <motion.h2
                className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight
                  bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Icon
                <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                  Creator
                </span>
              </motion.h2>

              <motion.p
                className="mt-4 text-base md:text-lg text-white/50 leading-relaxed"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                Remove backgrounds from logos and generate{" "}
                <span className="text-white/70 font-semibold">
                  multi-size .ICO files
                </span>{" "}
                — entirely in your browser. Smart flood-fill detection,
                adjustable tolerance, and instant transparent PNG exports. No
                uploads, no servers, no compromise.
              </motion.p>

              {/* Feature badges */}
              <div className="flex flex-wrap gap-2 mt-6">
                <FeatureBadge icon="🪄" label="Auto BG Removal" delay={0.35} />
                <FeatureBadge icon="🔒" label="100% Private" delay={0.4} />
                <FeatureBadge icon="⚡" label="Instant" delay={0.45} />
                <FeatureBadge icon="📦" label="PNG + ICO" delay={0.5} />
              </div>
            </div>

            {/* Right – Before/After visual with ICO sizes */}
            <div className="self-center lg:self-end">
              <BeforeAfterVisual />
            </div>
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
              Built with Canvas API &amp; TypeScript — client-side processing,
              zero dependencies
            </motion.p>

            <Link href="/iconcreator">
              <motion.button
                className="group relative px-8 py-3.5 rounded-2xl text-sm font-bold
                  bg-gradient-to-r from-orange-500 to-amber-500
                  hover:from-orange-400 hover:to-amber-400
                  text-white shadow-xl shadow-orange-500/25
                  transition-shadow hover:shadow-orange-500/40 cursor-pointer"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.55 }}
              >
                <span className="flex items-center gap-2">
                  Try It Now
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
