// components/0Timeline/TimelineAI/AIUnsavedBanner.tsx
"use client";

import React from "react";
import { Sparkles, AlertTriangle, X, LogIn } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
import type { GeneratedTimeline } from "./types";

interface AIUnsavedBannerProps {
  timeline: GeneratedTimeline;
  isSignedIn: boolean;
  onOpenModal: () => void;
  onDiscard: () => void;
}

export default function AIUnsavedBanner({
  timeline,
  isSignedIn,
  onOpenModal,
  onDiscard,
}: AIUnsavedBannerProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] animate-slide-up">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-900/90 via-orange-900/90 to-amber-900/90 backdrop-blur-xl shadow-2xl shadow-amber-500/20">
        {/* Pulsing indicator */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-50" />
          <div className="relative p-2 rounded-full bg-gradient-to-br from-amber-500 to-orange-500">
            <AlertTriangle size={18} className="text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-sm font-semibold text-white">
              AI Timeline Preview
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-500/30 text-amber-300 border border-amber-500/50">
              Unsaved
            </span>
          </div>
          <span className="text-xs text-amber-200/70">
            {timeline.name} • {timeline.nodes.length} events
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {isSignedIn ? (
            <button
              onClick={onOpenModal}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg transition-all hover:scale-105"
            >
              Save Timeline
            </button>
          ) : (
            <SignInButton mode="modal">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg transition-all hover:scale-105">
                <LogIn size={12} />
                Sign in to Save
              </button>
            </SignInButton>
          )}
          <button
            onClick={onOpenModal}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500/50 text-amber-300 hover:bg-amber-500/20 transition-all"
          >
            Preview
          </button>
          <button
            onClick={onDiscard}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/20 transition-all"
          >
            Discard
          </button>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
