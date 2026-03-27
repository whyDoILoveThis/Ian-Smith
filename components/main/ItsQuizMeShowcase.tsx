"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import QuizMeDemo from "./showcase-visuals/ItsQuizMeDemo";

/* ===================================================================
   Feature badge (same style as TimelineShowcase)
   =================================================================== */

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
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-sm"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.45 }}
    >
      <span className="text-base">{icon}</span>
      <span className="text-sm font-medium text-white/70">{label}</span>
    </motion.div>
  );
}

/* ===================================================================
   Floating particles (purple/blue tint for quiz theme)
   =================================================================== */

function useFloatingParticles(count = 14) {
  const [particles, setParticles] = useState<
    {
      id: number;
      x: number;
      delay: number;
      duration: number;
      size: number;
      opacity: number;
    }[]
  >([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 12 + Math.random() * 10,
        size: 2 + Math.random() * 4,
        opacity: 0.15 + Math.random() * 0.2,
      })),
    );
  }, [count]);

  return particles;
}

/* ===================================================================
   MAIN SHOWCASE
   =================================================================== */

export default function ItsQuizMeShowcase() {
  const particles = useFloatingParticles(12);

  return (
    <section className="relative w-full max-w-5xl mx-auto px-4">
      {/* -- Background glow -- */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, #8b5cf6 0%, #6366f1 40%, transparent 70%)",
          }}
        />
      </div>

      {/* -- Floating particles -- */}
      <div className="absolute inset-0 -z-5 overflow-hidden rounded-3xl pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              bottom: -10,
              width: p.size,
              height: p.size,
              background: `radial-gradient(circle, rgba(139,92,246,${p.opacity}) 0%, transparent 70%)`,
            }}
            animate={{
              y: [0, -600],
              opacity: [0, p.opacity, p.opacity * 0.8, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* -- Card -- */}
      <motion.div
        className="relative z-10 rounded-3xl border border-white/10 overflow-clip
          bg-gradient-to-b from-white/[0.06] to-white/[0.02]
          backdrop-blur-xl shadow-2xl shadow-purple-500/5"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-t-3xl" />

        <div className="p-8 md:p-12 lg:p-16">
          {/* -- Header row -- */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
            <div className="max-w-md flex-shrink-0">
              <motion.span
                className="inline-block px-3 py-1 mb-4 rounded-full text-xs font-semibold uppercase tracking-wider
                  bg-purple-500/20 text-purple-300 border border-purple-500/30"
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
              >
                AI-Powered
              </motion.span>

              <motion.h2
                className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight
                  bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                ItsQuizMe
              </motion.h2>

              <motion.p
                className="mt-4 text-base md:text-lg text-white/50 leading-relaxed"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                Generate{" "}
                <span className="text-white/70 font-semibold">
                  AI-powered quizzes
                </span>{" "}
                on any topic instantly. Features multiple question types,{" "}
                <span className="text-white/70 font-semibold">
                  adaptive difficulty
                </span>
                , self-assessment mode, and detailed AI feedback on every
                answer.
              </motion.p>

              <div className="flex flex-wrap gap-2 mt-6">
                <FeatureBadge icon="🧠" label="AI Generated" delay={0.35} />
                <FeatureBadge icon="📝" label="3 Question Types" delay={0.4} />
                <FeatureBadge icon="🎯" label="AI Grading" delay={0.45} />
                <FeatureBadge icon="⚙️" label="Customizable" delay={0.5} />
              </div>
            </div>
          </div>

          {/* -- Interactive Demo -- */}
          <QuizMeDemo />

          {/* -- Divider -- */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

          {/* -- Bottom - CTA -- */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <motion.p
              className="text-white/30 text-sm"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              Built with React &amp; AI &mdash; supports knowledge quizzes,
              self-assessments &amp; opinion polls
            </motion.p>

            <Link href="/itsquizme">
              <motion.button
                className="group relative px-8 py-3.5 rounded-2xl text-sm font-bold
                  bg-gradient-to-r from-purple-500 to-blue-500
                  hover:from-purple-400 hover:to-blue-400
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
                  Try ItsQuizMe
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
