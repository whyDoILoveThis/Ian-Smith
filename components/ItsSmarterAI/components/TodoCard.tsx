"use client";

import { cn } from "@/lib/utils";
import type { TodoItem } from "../types/pipeline";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { StatusIndicator } from "./StatusIndicator";
import { motion, AnimatePresence } from "framer-motion";

interface TodoCardProps {
  todo: TodoItem;
  index: number;
}

export function TodoCard({ todo, index }: TodoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      className={cn(
        "rounded-lg border bg-zinc-900/80 overflow-hidden transition-colors duration-200",
        todo.status === "running"
          ? "border-blue-500/20"
          : todo.status === "retrying"
            ? "border-amber-500/20"
            : todo.status === "failed"
              ? "border-red-500/20"
              : "border-zinc-800/50",
      )}
    >
      <div className="flex items-start gap-2.5 p-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-800/80 text-[10px] font-semibold text-zinc-400">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-300 leading-relaxed">{todo.text}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <StatusIndicator status={todo.status} />
            {todo.confidence > 0 && (
              <ConfidenceBadge
                confidence={todo.confidence}
                retryCount={todo.retryCount}
                className="text-[10px]"
              />
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {todo.response && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="border-t border-zinc-800/40 px-3 py-2.5"
          >
            <p className="text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap">
              {todo.response}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
