"use client";

import { cn } from "@/lib/utils";
import type { PipelineStatus } from "../types/pipeline";
import { motion } from "framer-motion";

interface PhaseIndicatorProps {
  status: PipelineStatus;
  className?: string;
}

const phases: { key: PipelineStatus; label: string; icon: string }[] = [
  { key: "thinking", label: "Think", icon: "⚡" },
  { key: "decomposing", label: "Decompose", icon: "◆" },
  { key: "processing-focal-points", label: "Analyze", icon: "◈" },
  { key: "processing-todos", label: "Implement", icon: "▣" },
  { key: "synthesizing", label: "Synthesize", icon: "◉" },
  { key: "complete", label: "Done", icon: "✦" },
];

function getPhaseIndex(status: PipelineStatus): number {
  if (status === "idle" || status === "error") return -1;
  return phases.findIndex((p) => p.key === status);
}

export function PhaseIndicator({ status, className }: PhaseIndicatorProps) {
  const currentIdx = getPhaseIndex(status);

  return (
    <div className={cn("flex items-center gap-1 sm:gap-2 w-full", className)}>
      {phases.map((phase, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx || status === "complete";

        return (
          <div
            key={phase.key}
            className="flex items-center gap-1 sm:gap-2 flex-1 last:flex-initial"
          >
            {/* Node */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-xs font-semibold transition-all duration-500",
                  isDone
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : isActive
                      ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                      : "bg-zinc-800/60 text-zinc-600 border border-zinc-800",
                )}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border border-blue-400/40"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                <span className="text-sm">{phase.icon}</span>
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-300 whitespace-nowrap",
                  isDone
                    ? "text-emerald-400/70"
                    : isActive
                      ? "text-blue-400"
                      : "text-zinc-600",
                )}
              >
                {phase.label}
              </span>
            </div>

            {/* Connector line (skip after last) */}
            {i < phases.length - 1 && (
              <div className="flex-1 h-px mb-5">
                <div
                  className={cn(
                    "h-full transition-colors duration-500",
                    i < currentIdx ? "bg-emerald-500/30" : "bg-zinc-800",
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
