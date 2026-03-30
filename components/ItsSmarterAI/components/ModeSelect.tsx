"use client";

import { cn } from "@/lib/utils";
import type { ThinkingMode } from "../types/pipeline";
import { motion } from "framer-motion";

interface ModeSelectProps {
  mode: ThinkingMode;
  onChange: (mode: ThinkingMode) => void;
  disabled?: boolean;
}

const modes: {
  key: ThinkingMode;
  label: string;
  icon: string;
  desc: string;
}[] = [
  { key: "fast", label: "Fast", icon: "⚡", desc: "Single response" },
  {
    key: "medium",
    label: "Medium",
    icon: "◈",
    desc: "Focal points + summaries",
  },
  { key: "deep", label: "Deep", icon: "◉", desc: "Full pipeline + scoring" },
];

export function ModeSelect({ mode, onChange, disabled }: ModeSelectProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
      {modes.map((m) => {
        const active = m.key === mode;
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            disabled={disabled}
            className={cn(
              "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {active && (
              <motion.div
                layoutId="mode-bg"
                className={cn(
                  "absolute inset-0 rounded-lg",
                  m.key === "fast" &&
                    "bg-emerald-500/15 border border-emerald-500/30",
                  m.key === "medium" &&
                    "bg-blue-500/15 border border-blue-500/30",
                  m.key === "deep" &&
                    "bg-violet-500/15 border border-violet-500/30",
                )}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{m.icon}</span>
            <span className="relative z-10 hidden sm:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
