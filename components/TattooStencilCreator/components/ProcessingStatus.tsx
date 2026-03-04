/* ─────────────────────────────────────────────────────────────
   ProcessingStatus – animated step-by-step progress indicator
   ───────────────────────────────────────────────────────────── */
"use client";

import React from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { ProcessingState } from "../types";

interface Props {
  processing: ProcessingState;
}

export default function ProcessingStatus({ processing }: Props) {
  const { step, progress, message } = processing;

  if (step === "idle") return null;

  const isComplete = step === "complete";
  const isError = step === "error";
  const isRunning = !isComplete && !isError;

  return (
    <div
      className={`
        flex flex-col gap-3 rounded-xl border px-5 py-4 text-sm transition-colors
        ${
          isError
            ? "border-destructive/40 bg-destructive/5"
            : isComplete
              ? "border-green-500/40 bg-green-500/5"
              : "border-border bg-muted/30"
        }
      `}
    >
      {/* ── Status label ──────────────────────────────────── */}
      <div className="flex items-center gap-2 font-medium">
        {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {isComplete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {isError && <XCircle className="h-4 w-4 text-destructive" />}
        <span
          className={
            isError
              ? "text-destructive"
              : isComplete
                ? "text-green-600 dark:text-green-400"
                : "text-foreground"
          }
        >
          {message}
        </span>
      </div>

      {/* ── Progress bar ──────────────────────────────────── */}
      {isRunning && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
