"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ThinkingMode } from "../types/pipeline";
import { ModeSelect } from "./ModeSelect";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isRunning: boolean;
  onAbort: () => void;
  onReset: () => void;
  mode: ThinkingMode;
  onModeChange: (mode: ThinkingMode) => void;
  hasHistory: boolean;
}

export function PromptInput({
  onSubmit,
  isRunning,
  onAbort,
  onReset,
  mode,
  onModeChange,
  hasHistory,
}: PromptInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isRunning) return;
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <div className="w-full space-y-3">
      {/* Mode selector row */}
      <div className="flex items-center justify-between gap-3">
        <ModeSelect mode={mode} onChange={onModeChange} disabled={isRunning} />
        {hasHistory && !isRunning && (
          <button
            onClick={onReset}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300 hover:border-zinc-600"
          >
            New Chat
          </button>
        )}
      </div>

      {/* Input area */}
      <div
        className={cn(
          "relative rounded-2xl border bg-zinc-900/80 transition-all duration-300",
          isRunning
            ? "border-blue-500/30"
            : "border-zinc-800 focus-within:border-zinc-600",
        )}
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={
            hasHistory
              ? "Follow up on the conversation..."
              : "Describe a complex problem and watch the AI think through it step by step..."
          }
          disabled={isRunning}
          rows={2}
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-12 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
        />

        {/* Action bar */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {isRunning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-xs text-blue-400"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                {mode === "fast" ? "Thinking" : "Pipeline active"}
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                onClick={onAbort}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                ■ Stop
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!value.trim()}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                  value.trim()
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/20"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed",
                )}
              >
                {hasHistory ? "Send →" : "Run →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
