"use client";

import React, { useEffect, useState } from "react";
import type { CallStatus, ThemeColors } from "../types";

type VoiceCallOverlayProps = {
  callStatus: CallStatus;
  callerId: "1" | "2" | null;
  callerName: string;
  isMuted: boolean;
  callDuration: number;
  remoteAudioLevel: number;
  themeColors: ThemeColors;
  onAnswer: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onMinimize?: () => void;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VoiceCallOverlay({
  callStatus,
  callerId,
  callerName,
  isMuted,
  callDuration,
  remoteAudioLevel,
  themeColors,
  onAnswer,
  onEnd,
  onToggleMute,
  onMinimize,
}: VoiceCallOverlayProps) {
  const [pulseScale, setPulseScale] = useState(1);

  // Pulse animation for ringing
  useEffect(() => {
    if (callStatus !== "ringing" && callStatus !== "calling") return;
    const interval = setInterval(() => {
      setPulseScale((prev) => (prev === 1 ? 1.15 : 1));
    }, 600);
    return () => clearInterval(interval);
  }, [callStatus]);

  if (callStatus === "idle" || callStatus === "ended") return null;

  const isRinging = callStatus === "ringing";
  const isCalling = callStatus === "calling";
  const isConnected = callStatus === "connected";
  const isConnecting = callStatus === "connecting";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl">
      {/* Animated background gradient */}
      <div
        className={`absolute inset-0 opacity-30 transition-opacity duration-1000 ${
          isConnected ? "opacity-20" : "opacity-40"
        }`}
        style={{
          background: `radial-gradient(circle at center, ${
            isRinging ? "#f59e0b" : isConnected ? "#10b981" : "#6366f1"
          } 0%, transparent 70%)`,
        }}
      />

      <div className="relative flex flex-col items-center gap-8 px-6 py-10">
        {/* Avatar with audio level indicator */}
        <div className="relative">
          {/* Audio level ring */}
          {isConnected && (
            <div
              className="absolute inset-0 rounded-full transition-all duration-100"
              style={{
                transform: `scale(${1 + remoteAudioLevel / 200})`,
                boxShadow: `0 0 ${remoteAudioLevel / 2}px ${remoteAudioLevel / 4}px rgba(16, 185, 129, 0.5)`,
              }}
            />
          )}

          {/* Pulse ring for ringing/calling */}
          {(isRinging || isCalling) && (
            <div
              className="absolute inset-0 rounded-full border-4 transition-transform duration-300"
              style={{
                transform: `scale(${pulseScale})`,
                borderColor: isRinging ? "#f59e0b" : "#6366f1",
                opacity: 0.6,
              }}
            />
          )}

          {/* Avatar */}
          <div
            className={`relative flex h-28 w-28 items-center justify-center rounded-full text-4xl font-bold shadow-2xl ${
              isConnected
                ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                : isRinging
                  ? "bg-gradient-to-br from-amber-400 to-orange-500"
                  : "bg-gradient-to-br from-indigo-400 to-purple-500"
            }`}
          >
            <span className="text-white drop-shadow-lg">
              {callerName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Status text */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">{callerName}</h2>
          <p
            className={`mt-2 text-sm font-medium ${
              isConnected
                ? "text-emerald-400"
                : isRinging
                  ? "text-amber-400"
                  : "text-indigo-400"
            }`}
          >
            {isRinging && "Incoming call..."}
            {isCalling && "Calling..."}
            {isConnecting && "Connecting..."}
            {isConnected && formatDuration(callDuration)}
          </p>
        </div>

        {/* Call controls - INCOMING CALL (Ringing) */}
        {isRinging && (
          <div className="flex items-center gap-12">
            {/* DECLINE button */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEnd();
                }}
                className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-2xl shadow-red-500/50 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <svg
                  className="h-9 w-9 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
                  />
                </svg>
              </button>
              <span className="text-lg font-bold uppercase tracking-wider text-red-400">
                Decline
              </span>
            </div>

            {/* ANSWER button */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAnswer();
                }}
                className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-500/50 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <svg
                  className="h-9 w-9 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </button>
              <span className="text-lg font-bold uppercase tracking-wider text-emerald-400">
                Answer
              </span>
            </div>
          </div>
        )}

        {/* Call controls - OUTGOING CALL (Calling/Connecting) */}
        {(isCalling || isConnecting) && (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={onEnd}
              className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-2xl shadow-red-500/50 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <svg
                className="h-9 w-9 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
                />
              </svg>
            </button>
            <span className="text-lg font-bold uppercase tracking-wider text-red-400">
              Cancel
            </span>
          </div>
        )}

        {/* Call controls - CONNECTED */}
        {isConnected && (
          <div className="flex items-center gap-6">
            {/* End call button */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onEnd}
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <svg
                  className="h-7 w-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
                  />
                </svg>
              </button>
              <span className="text-xs font-medium text-red-400">End</span>
            </div>

            {/* Mute button */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onToggleMute}
                className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 ${
                  isMuted
                    ? "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30"
                    : "bg-white/10 backdrop-blur-sm hover:bg-white/20"
                }`}
              >
                {isMuted ? (
                  <svg
                    className="h-6 w-6 text-white"
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
                    className="h-6 w-6 text-white"
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
              <span className="text-xs font-medium text-white/70">
                {isMuted ? "Unmute" : "Mute"}
              </span>
            </div>

            {/* Minimize button */}
            {onMinimize && (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={onMinimize}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm shadow-lg transition-all duration-200 hover:scale-110 hover:bg-white/20 active:scale-95"
                >
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <span className="text-xs font-medium text-white/70">
                  Minimize
                </span>
              </div>
            )}
          </div>
        )}

        {/* Mute indicator text */}
        {isConnected && isMuted && (
          <p className="text-sm font-medium text-amber-400">Microphone muted</p>
        )}
      </div>
    </div>
  );
}
