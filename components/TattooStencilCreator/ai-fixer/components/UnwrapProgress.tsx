/* ─────────────────────────────────────────────────────────────
   Unwrap Progress – Visual pipeline progress tracker
   Shows all 7 steps with status indicators.
   ───────────────────────────────────────────────────────────── */
"use client";

import React from "react";
import { useUnwrapStore } from "../store";
import { UNWRAP_STEPS } from "../types";
import type { StepStatus } from "../types";

const statusStyles: Record<
  StepStatus,
  { dot: string; text: string; ring: string }
> = {
  pending: { dot: "bg-zinc-600", text: "text-zinc-500", ring: "" },
  running: {
    dot: "bg-indigo-500 animate-pulse",
    text: "text-indigo-300",
    ring: "ring-2 ring-indigo-500/40",
  },
  complete: { dot: "bg-emerald-500", text: "text-emerald-300", ring: "" },
  error: { dot: "bg-red-500", text: "text-red-400", ring: "" },
  skipped: { dot: "bg-zinc-500", text: "text-zinc-500 line-through", ring: "" },
};

export default function UnwrapProgress() {
  const steps = useUnwrapStore((s) => s.steps);

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Pipeline Progress
      </h3>

      <div className="flex flex-col gap-0">
        {UNWRAP_STEPS.map((meta, idx) => {
          const state = steps[meta.id];
          const styles = statusStyles[state.status];
          const isLast = idx === UNWRAP_STEPS.length - 1;

          return (
            <div key={meta.id} className="flex items-start gap-3">
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`h-3 w-3 shrink-0 rounded-full ${styles.dot} ${styles.ring} mt-0.5`}
                />
                {!isLast && (
                  <div
                    className={`w-px flex-1 min-h-[20px] ${
                      state.status === "complete"
                        ? "bg-emerald-500/40"
                        : "bg-zinc-700/50"
                    }`}
                  />
                )}
              </div>

              {/* Label + status */}
              <div className="flex flex-col pb-2">
                <span className={`text-xs font-medium ${styles.text}`}>
                  {meta.icon} {meta.label}
                </span>

                {state.status === "running" && state.message && (
                  <span className="mt-0.5 text-[10px] text-zinc-500">
                    {state.message}
                  </span>
                )}
                {state.status === "running" && state.progress > 0 && (
                  <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                )}
                {state.status === "complete" && state.message && (
                  <span className="mt-0.5 text-[10px] text-zinc-500">
                    {state.message}
                  </span>
                )}
                {state.status === "error" && state.message && (
                  <span className="mt-0.5 text-[10px] text-red-400/80">
                    {state.message}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
