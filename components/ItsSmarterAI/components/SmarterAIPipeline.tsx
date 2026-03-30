"use client";

import { useRef, useEffect } from "react";
import { usePipeline } from "../hooks/usePipeline";
import { PromptInput } from "./PromptInput";
import { TurnCard } from "./TurnCard";
import { motion } from "framer-motion";

export function SmarterAIPipeline() {
  const { state, runPipeline, setMode, abort, reset } = usePipeline();
  const bottomRef = useRef<HTMLDivElement>(null);

  const isRunning =
    state.status !== "idle" &&
    state.status !== "complete" &&
    state.status !== "error";

  // Auto-scroll to bottom when new content appears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.turns, state.status]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 sm:py-10 min-h-screen">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            AI Reasoning Pipeline
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
          Smarter AI
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
          Multi-pass reasoning with focal-point decomposition, confidence
          scoring, and iterative refinement.
        </p>
      </div>

      {/* Conversation turns */}
      <div className="flex-1 space-y-6 mb-6">
        {state.turns.map((turn, i) => (
          <TurnCard key={turn.id} turn={turn} index={i} />
        ))}

        {/* Empty state */}
        {state.turns.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/60 text-2xl">
              ◈
            </div>
            <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
              Choose a thinking mode and ask anything. Switch between fast,
              medium, and deep reasoning at any time.
            </p>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Sticky input at bottom */}
      <div className="sticky bottom-0 pb-4 pt-2 bg-gradient-to-t from-background via-background to-transparent">
        <PromptInput
          onSubmit={runPipeline}
          isRunning={isRunning}
          onAbort={abort}
          onReset={reset}
          mode={state.mode}
          onModeChange={setMode}
          hasHistory={state.turns.length > 0}
        />
        <p className="mt-2 text-center text-[11px] text-zinc-700">
          Powered by multi-pass AI reasoning · Groq inference
        </p>
      </div>
    </div>
  );
}
