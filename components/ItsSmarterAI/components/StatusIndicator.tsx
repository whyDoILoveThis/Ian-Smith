"use client";

import { cn } from "@/lib/utils";
import type { ItemStatus } from "../types/pipeline";

interface StatusIndicatorProps {
  status: ItemStatus;
  label?: string;
  className?: string;
}

const statusConfig: Record<
  ItemStatus,
  { icon: string; text: string; color: string }
> = {
  pending: { icon: "○", text: "Queued", color: "text-zinc-500" },
  running: { icon: "◉", text: "Processing", color: "text-blue-400" },
  retrying: { icon: "↻", text: "Retrying", color: "text-amber-400" },
  complete: { icon: "✓", text: "Complete", color: "text-emerald-400" },
  failed: { icon: "✕", text: "Failed", color: "text-red-400" },
};

export function StatusIndicator({
  status,
  label,
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        config.color,
        status === "running" && "animate-pulse",
        className,
      )}
    >
      <span className="text-sm">{config.icon}</span>
      {label || config.text}
    </span>
  );
}
