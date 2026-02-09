"use client";

import React from "react";
import type { CallStatus } from "../types";

type ActiveCallBannerProps = {
  callStatus: CallStatus;
  callDuration: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  onExpand: () => void;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ActiveCallBanner({
  callStatus,
  callDuration,
  isMuted,
  onToggleMute,
  onEndCall,
  onExpand,
}: ActiveCallBannerProps) {
  if (callStatus === "idle" || callStatus === "ended") return null;

  const isRinging = callStatus === "ringing";
  const isCalling = callStatus === "calling";
  const isConnecting = callStatus === "connecting";
  const isConnected = callStatus === "connected";

  const statusText = isRinging
    ? "Incoming call…"
    : isCalling
      ? "Calling…"
      : isConnecting
        ? "Connecting…"
        : "Call in progress";

  // Colour tokens – use full class names so Tailwind can detect them
  const wrapperCls = isRinging
    ? "from-amber-500/20 via-amber-500/10 to-amber-500/20 border-amber-500/30 hover:bg-amber-500/25"
    : isConnected
      ? "from-emerald-500/20 via-emerald-500/10 to-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/25"
      : "from-indigo-500/20 via-indigo-500/10 to-indigo-500/20 border-indigo-500/30 hover:bg-indigo-500/25";

  const dotCls = isRinging
    ? "bg-amber"
    : isConnected
      ? "bg-emerald"
      : "bg-indigo";
  const textCls = isRinging
    ? "text-amber-400"
    : isConnected
      ? "text-emerald-400"
      : "text-indigo-400";

  return (
    <div
      onClick={onExpand}
      className={`flex-shrink-0 flex items-center justify-between gap-3 bg-gradient-to-r ${wrapperCls} border-b px-3 py-2 cursor-pointer transition-colors`}
      style={{ touchAction: "manipulation" }}
    >
      {/* Left: Status */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isRinging ? "bg-amber-400" : isConnected ? "bg-emerald-400" : "bg-indigo-400"} opacity-75`}
          />
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRinging ? "bg-amber-500" : isConnected ? "bg-emerald-500" : "bg-indigo-500"}`}
          />
        </span>
        <span className={`text-xs font-medium ${textCls}`}>{statusText}</span>
        {isConnected && (
          <span className="text-xs text-emerald-300/70">
            {formatDuration(callDuration)}
          </span>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
            isMuted
              ? "bg-amber-500/80 text-white"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {isMuted ? (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              />
            </svg>
          ) : (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEndCall();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-all"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
