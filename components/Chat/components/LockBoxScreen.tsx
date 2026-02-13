"use client";

import React from "react";
import LockBox from "@/components/LockBox/LockBox";

type LockBoxScreenProps = {
  onUnlock: (combo: [number, number, number, number]) => void;
  onBack: () => void;
};

export function LockBoxScreen({ onUnlock, onBack }: LockBoxScreenProps) {
  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950 overflow-hidden">
      <div className="flex-1 flex flex-col justify-center items-center px-2 pb-4">
        <div className="flex justify-center items-center gap-2 mb-6 text-center">
          <button
            type="button"
            onClick={onBack}
            className="-translate-y-10 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Back
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            GPT-4o AI Passkey Generator <span className="text-sm">v0.8</span>
          </h1>
        </div>

        <LockBox onUnlock={onUnlock}>
          <div />
        </LockBox>
      </div>
    </div>
  );
}
