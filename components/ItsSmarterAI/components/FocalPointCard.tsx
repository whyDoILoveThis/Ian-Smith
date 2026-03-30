"use client";

import { cn } from "@/lib/utils";
import type { FocalPoint } from "../types/pipeline";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { StatusIndicator } from "./StatusIndicator";
import { TodoCard } from "./TodoCard";
import { motion, AnimatePresence } from "framer-motion";

interface FocalPointCardProps {
  focalPoint: FocalPoint;
  index: number;
}

export function FocalPointCard({ focalPoint, index }: FocalPointCardProps) {
  const hasResponse = !!focalPoint.response;
  const hasTodos = focalPoint.todos.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className={cn(
        "rounded-xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden transition-colors duration-300",
        focalPoint.status === "running" && "border-blue-500/30",
        focalPoint.status === "retrying" && "border-amber-500/30",
        focalPoint.status === "complete" && "border-zinc-700/50",
        focalPoint.status === "failed" && "border-red-500/30",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xs font-bold text-zinc-300 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 leading-relaxed">
            {focalPoint.text}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <StatusIndicator status={focalPoint.status} />
            {focalPoint.confidence > 0 && (
              <ConfidenceBadge
                confidence={focalPoint.confidence}
                retryCount={focalPoint.retryCount}
              />
            )}
          </div>
        </div>
      </div>

      {/* Response */}
      <AnimatePresence>
        {hasResponse && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="border-t border-zinc-800/60"
          >
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Analysis
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {focalPoint.response}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Todos */}
      <AnimatePresence>
        {hasTodos && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="border-t border-zinc-800/60"
          >
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                Implementation Steps
              </p>
              <div className="space-y-2">
                {focalPoint.todos.map((todo, i) => (
                  <TodoCard key={todo.id} todo={todo} index={i} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
