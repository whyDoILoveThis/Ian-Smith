"use client";

import { motion } from "framer-motion";
import { DEMO_PRESETS } from "./types";

interface GeneratingPhaseProps {
  selectedPreset: number;
}

export default function GeneratingPhase({
  selectedPreset,
}: GeneratingPhaseProps) {
  return (
    <motion.div
      key="generating"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35 }}
      className="flex-1 flex flex-col items-center justify-center"
    >
      <div className="relative">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 mb-6 shadow-lg shadow-purple-500/25">
          <motion.span
            className="text-3xl"
            animate={{ rotate: 360 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            ✨
          </motion.span>
        </div>
        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-purple-500/30"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
      <h3 className="text-xl font-bold text-white/90 mb-2">
        Generating Your Quiz
      </h3>
      <p className="text-sm text-white/40 mb-4">
        AI is crafting questions on{" "}
        <span className="text-purple-300">
          {DEMO_PRESETS[selectedPreset].label}
        </span>
        ...
      </p>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-purple-500"
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 0.6,
              delay: i * 0.15,
              repeat: Infinity,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
