"use client";

import React from "react";
import type { CallStatus } from "../types";

type CallButtonProps = {
  slotId: "1" | "2" | null;
  callStatus: CallStatus;
  otherPersonOnline: boolean;
  onStartCall: () => void;
};

export function CallButton({
  slotId,
  callStatus,
  otherPersonOnline,
  onStartCall,
}: CallButtonProps) {
  const isDisabled = !slotId || !otherPersonOnline || callStatus !== "idle";
  const isInCall = callStatus !== "idle";

  return (
    <button
      type="button"
      onClick={onStartCall}
      disabled={isDisabled}
      className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
        isInCall
          ? "bg-emerald-500/20 text-emerald-400"
          : isDisabled
            ? "bg-white/5 text-neutral-600 cursor-not-allowed"
            : "bg-white/10 text-white hover:bg-emerald-500/20 hover:text-emerald-400 hover:scale-110 active:scale-95"
      }`}
      title={
        !slotId
          ? "Join the room to call"
          : !otherPersonOnline
            ? "Other person is not online"
            : isInCall
              ? "Call in progress"
              : "Start voice call"
      }
    >
      {/* Phone icon */}
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      </svg>

      {/* Pulse indicator when in call */}
      {isInCall && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
      )}
    </button>
  );
}
