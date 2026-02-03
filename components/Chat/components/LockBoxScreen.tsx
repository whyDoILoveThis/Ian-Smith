"use client";

import React from "react";
import LockBox from "@/components/LockBox/LockBox";

type LockBoxScreenProps = {
  onUnlock: (combo: [number, number, number, number]) => void;
  onBack: () => void;
};

export function LockBoxScreen({ onUnlock, onBack }: LockBoxScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-black py-10 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            GPT-4o AI Passkey Generator
          </h1>
          <p className="mt-2 text-neutral-400">Choose any LockBox code.</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Back to chat
          </button>
        </div>

        <div className="mt-6">
          <LockBox onUnlock={onUnlock}>
            <div />
          </LockBox>
        </div>
      </div>
    </div>
  );
}
