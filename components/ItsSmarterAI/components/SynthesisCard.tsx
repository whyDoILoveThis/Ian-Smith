"use client";

import { motion } from "framer-motion";

interface SynthesisCardProps {
  output: string;
}

export function SynthesisCard({ output }: SynthesisCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-violet-500/30 bg-gradient-to-b from-violet-500/5 to-transparent overflow-hidden"
    >
      <div className="p-4 border-b border-violet-500/20">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400 text-sm">
            ✦
          </span>
          <h3 className="text-sm font-semibold text-violet-300">
            Synthesized Answer
          </h3>
        </div>
      </div>
      <div className="p-4">
        <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {output}
        </div>
      </div>
    </motion.div>
  );
}
