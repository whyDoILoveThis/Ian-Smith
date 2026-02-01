// components/0Timeline/TimelineAI/AIButton.tsx
"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface AIButtonProps {
  onClick: () => void;
}

export default function AIButton({ onClick }: AIButtonProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      aria-label="Generate timeline with AI"
      className="group relative flex items-center gap-2 px-3 py-1 text-sm rounded-full border transition-all duration-300 overflow-hidden bg-gradient-to-r from-violet-600/20 via-cyan-600/20 to-pink-600/20 border-violet-500/30 hover:border-violet-400/60 text-violet-300 hover:text-white whitespace-nowrap hover:shadow-lg hover:shadow-violet-500/20"
    >
      {/* Animated gradient background on hover */}
      <span className="absolute inset-0 bg-gradient-to-r from-violet-600 via-cyan-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Shimmer effect */}
      <span className="absolute inset-0 opacity-0 group-hover:opacity-30 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

      {/* Content */}
      <span className="relative flex items-center gap-2">
        <Sparkles size={16} className="group-hover:animate-pulse" />
        <span>AI Agent</span>
      </span>
    </button>
  );
}
