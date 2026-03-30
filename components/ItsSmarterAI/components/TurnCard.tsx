"use client";

import type { ConversationTurn } from "../types/pipeline";
import { FocalPointCard } from "./FocalPointCard";
import { SynthesisCard } from "./SynthesisCard";
import { PhaseIndicator } from "./PhaseIndicator";
import { PipelineProgress } from "./PipelineProgress";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TurnCardProps {
  turn: ConversationTurn;
  index: number;
}

const modeLabels: Record<string, { label: string; color: string }> = {
  fast: {
    label: "Fast",
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  medium: {
    label: "Medium",
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  },
  deep: {
    label: "Deep",
    color: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  },
};

export function TurnCard({ turn, index }: TurnCardProps) {
  const isActive =
    turn.status !== "idle" &&
    turn.status !== "complete" &&
    turn.status !== "error";

  const modeStyle = modeLabels[turn.mode];

  const completedFocal = turn.focalPoints.filter(
    (fp) => fp.status === "complete" || fp.status === "failed",
  ).length;
  const allTodos = turn.focalPoints.flatMap((fp) => fp.todos);
  const completedTodos = allTodos.filter(
    (t) => t.status === "complete" || t.status === "failed",
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="space-y-4"
    >
      {/* User prompt bubble */}
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                modeStyle.color,
              )}
            >
              {modeStyle.label}
            </span>
            {isActive && (
              <span className="flex items-center gap-1 text-[10px] text-blue-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                Thinking
              </span>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
            <p className="text-sm text-zinc-300 leading-relaxed">
              {turn.prompt}
            </p>
          </div>
        </div>
      </div>

      {/* Phase indicator (medium/deep only, while active) */}
      {turn.mode !== "fast" && turn.status !== "idle" && (
        <div className="ml-10">
          <PhaseIndicator status={turn.status} />
        </div>
      )}

      {/* Progress bars (medium/deep) */}
      <AnimatePresence>
        {turn.focalPoints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
            className="ml-10 space-y-2"
          >
            <PipelineProgress
              current={completedFocal}
              total={turn.focalPoints.length}
              label="Focal Points"
            />
            {allTodos.length > 0 && (
              <PipelineProgress
                current={completedTodos}
                total={allTodos.length}
                label="Steps"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focal point cards (medium/deep) */}
      <AnimatePresence>
        {turn.focalPoints.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="ml-10 space-y-3"
          >
            {turn.focalPoints.map((fp, i) => (
              <FocalPointCard key={fp.id} focalPoint={fp} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final output */}
      <AnimatePresence>
        {turn.finalOutput && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="ml-10"
          >
            <SynthesisCard output={turn.finalOutput} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {turn.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-10 rounded-xl border border-red-500/30 bg-red-500/5 p-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-sm">✕</span>
              <p className="text-sm text-red-400">{turn.error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
