/**
 * AboutTab — Splash-style presentation tab
 *
 * Explains what the tool does with:
 *  - Hero section with large typography
 *  - Animated feature cards
 *  - Glassmorphic design
 *  - Emphasis on speed, privacy, and client-side processing
 */

"use client";

import { motion } from "framer-motion";
import {
  Zap,
  Shield,
  Target,
  Package,
  MonitorSmartphone,
  Palette,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { ANIM } from "../lib/constants";

// ─── Feature Data ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "All processing happens instantly in your browser. No uploads, no round-trips, no waiting.",
    accent: "from-orange-500 to-amber-500",
  },
  {
    icon: Shield,
    title: "100% Private",
    description:
      "Your images never leave your device. Zero server processing. Complete privacy guaranteed.",
    accent: "from-orange-600 to-red-500",
  },
  {
    icon: Target,
    title: "Precision Removal",
    description:
      "Smart flood-fill algorithm with adjustable tolerance preserves your logo edges perfectly.",
    accent: "from-amber-500 to-orange-500",
  },
  {
    icon: Package,
    title: "Multi-Format Export",
    description:
      "Download transparent PNGs and multi-size ICO files (16, 32, 48, 256px) instantly.",
    accent: "from-orange-500 to-yellow-500",
  },
  {
    icon: MonitorSmartphone,
    title: "Works Everywhere",
    description:
      "Fully responsive — works perfectly on desktop, tablet, and mobile devices.",
    accent: "from-red-500 to-orange-500",
  },
  {
    icon: Palette,
    title: "Smart Detection",
    description:
      "Automatically samples your image background and removes it with surgical precision.",
    accent: "from-yellow-500 to-orange-500",
  },
] as const;

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
  },
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function AboutTab() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto space-y-12 py-4"
    >
      {/* ── Hero Section ── */}
      <motion.div variants={itemVariants} className="text-center space-y-5">
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/20"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            Client-Side Only
          </span>
        </motion.div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
          <span className="text-gray-900 dark:text-white">Logo</span>
          <br />
          <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500 bg-clip-text text-transparent">
            Background Remover
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Remove backgrounds from logos and generate multi-size icon files —
          entirely in your browser. No uploads. No servers. No compromise.
        </p>

        {/* Decorative line */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-orange-500/50" />
          <div className="w-2 h-2 rounded-full bg-orange-500/60" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-orange-500/50" />
        </div>
      </motion.div>

      {/* ── Process Steps ── */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6 sm:p-8">
          <h2 className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-5">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                label: "Upload",
                text: "Drop your logo image — PNG, JPG, or WEBP.",
              },
              {
                step: "02",
                label: "Process",
                text: "We remove the background using smart flood-fill.",
              },
              {
                step: "03",
                label: "Download",
                text: "Get transparent PNG + multi-size ICO files.",
              },
            ].map(({ step, label, text }) => (
              <div key={step} className="flex gap-4">
                <span className="text-3xl font-black text-orange-500/20 dark:text-orange-500/30 leading-none">
                  {step}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {label}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* ── Feature Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((feature) => (
          <motion.div key={feature.title} variants={itemVariants}>
            <GlassCard className="p-5 h-full" glow>
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${feature.accent} mb-3`}
              >
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1.5">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* ── Privacy Note ── */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6 text-center border-orange-500/20 dark:border-orange-500/15">
          <Shield className="w-8 h-8 text-orange-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Your Privacy Matters
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
            This tool runs entirely in your browser using the Canvas API. Your
            images are never uploaded to any server. All processing happens
            locally on your device, making it as fast and private as possible.
          </p>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
