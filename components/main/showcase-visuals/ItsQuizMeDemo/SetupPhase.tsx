"use client";

import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { DEMO_PRESETS } from "./types";

interface SetupPhaseProps {
  selectedPreset: number;
  handleGenerate: () => void;
}

export default function SetupPhase({
  selectedPreset,
  handleGenerate,
}: SetupPhaseProps) {
  return (
    <motion.div
      key="setup"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.35 }}
      className="flex-1 flex flex-col"
    >
      {/* Mini header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 mb-4 shadow-lg shadow-purple-500/25">
          <HelpCircle className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white/90">ItsQuizMe</h3>
        <p className="text-sm text-white/40 mt-1">
          Generate an AI-powered quiz on any topic
        </p>
      </div>

      {/* Topic input (decorative) */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4">
        <label className="block text-xs font-semibold text-white/50 mb-2">
          What would you like to be quizzed on?
        </label>
        <div className="w-full h-10 px-4 rounded-lg border border-white/10 bg-white/[0.04] flex items-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={selectedPreset}
              className="text-sm text-purple-300"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {DEMO_PRESETS[selectedPreset].icon}{" "}
              {DEMO_PRESETS[selectedPreset].label}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Quick picks */}
        <div className="mt-3">
          <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
            Quick picks
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {DEMO_PRESETS.map((preset, i) => (
              <span
                key={preset.label}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-full border transition-all duration-300 ${
                  i === selectedPreset
                    ? "border-purple-500/50 bg-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/20"
                    : "border-white/10 bg-white/[0.03] text-white/40"
                }`}
              >
                {preset.icon} {preset.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Question count + type mix preview */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-white/50">Questions</span>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              10
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
              style={{ width: "40%" }}
            />
          </div>
        </div>
        <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <span className="text-xs font-medium text-white/50 block mb-2">
            Type Mix
          </span>
          <div className="w-full h-5 rounded-full overflow-hidden flex">
            <div
              className="bg-blue-500/80 flex items-center justify-center"
              style={{ width: "30%" }}
            >
              <span className="text-[9px] font-bold text-white">30%</span>
            </div>
            <div
              className="bg-emerald-500/80 flex items-center justify-center"
              style={{ width: "50%" }}
            >
              <span className="text-[9px] font-bold text-white">50%</span>
            </div>
            <div
              className="bg-violet-500/80 flex items-center justify-center"
              style={{ width: "20%" }}
            >
              <span className="text-[9px] font-bold text-white">20%</span>
            </div>
          </div>
          <div className="flex justify-between text-[9px] text-white/30 mt-1">
            <span>T/F</span>
            <span>MC</span>
            <span>Typed</span>
          </div>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        className="group relative w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-300 overflow-hidden cursor-pointer"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        <span className="relative flex items-center justify-center gap-2">
          ✨ Generate Quiz
        </span>
      </button>

      {/* More options note */}
      <p className="text-center text-[11px] text-white/25 mt-3">
        Full app includes AI settings, quiz style selection, difficulty levels,
        creativity control &amp; more
      </p>
    </motion.div>
  );
}
