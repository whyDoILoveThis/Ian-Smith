"use client";

import { cn } from "@/lib/utils";

interface PipelineProgressProps {
  current: number;
  total: number;
  label: string;
  className?: string;
}

export function PipelineProgress({
  current,
  total,
  label,
  className,
}: PipelineProgressProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-zinc-400 font-medium">{label}</span>
        <span className="text-xs tabular-nums text-zinc-500">
          {current}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-800/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
