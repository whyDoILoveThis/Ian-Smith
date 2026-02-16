"use client";

import React, { useEffect, useState } from "react";
import type {
  CallStatus,
  ThemeColors,
  CallError,
  CallDebugState,
} from "../types";

type VoiceCallOverlayProps = {
  callStatus: CallStatus;
  callerId: "1" | "2" | null;
  callerName: string;
  isMuted: boolean;
  isSpeaker: boolean;
  callDuration: number;
  remoteAudioLevel: number;
  themeColors: ThemeColors;
  onAnswer: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onMinimize?: () => void;
  // New: Error and debug props
  callError?: CallError | null;
  onClearError?: () => void;
  debugState?: CallDebugState | null;
  showDebugPanel?: boolean;
  onToggleDebugPanel?: () => void;
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
  isSpeaker,
  callDuration,
  remoteAudioLevel,
  themeColors,
  onAnswer,
  onEnd,
  onToggleMute,
  onToggleSpeaker,
  onMinimize,
  callError,
  onClearError,
  debugState,
  showDebugPanel,
  onToggleDebugPanel,
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

  // Show overlay for error state too
  if (callStatus === "idle" || callStatus === "ended") {
    // But if there's an error, still show it briefly
    if (!callError) return null;
  }

  const isRinging = callStatus === "ringing";
  const isCalling = callStatus === "calling";
  const isConnected = callStatus === "connected";
  const isConnecting = callStatus === "connecting";
  const isError = callStatus === "error";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl"
      style={{ touchAction: "manipulation" }}
    >
      {/* Animated background gradient */}
      <div
        className={`absolute inset-0 opacity-30 transition-opacity duration-1000 ${
          isConnected ? "opacity-20" : "opacity-40"
        }`}
        style={{
          background: `radial-gradient(circle at center, ${
            isError
              ? "#ef4444"
              : isRinging
                ? "#f59e0b"
                : isConnected
                  ? "#10b981"
                  : "#6366f1"
          } 0%, transparent 70%)`,
        }}
      />

      {/* Debug button — top-left corner */}
      {onToggleDebugPanel && (
        <button
          type="button"
          onClick={onToggleDebugPanel}
          className={`absolute top-4 left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm transition-all hover:bg-white/20 active:scale-90 ${
            showDebugPanel
              ? "bg-amber-500/30 text-amber-400"
              : "bg-white/10 text-white/70"
          }`}
          style={{
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
          aria-label="Toggle debug panel"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      )}

      {/* Close / minimize overlay button — top-right corner */}
      {onMinimize && (
        <button
          type="button"
          onClick={onMinimize}
          className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white active:scale-90"
          style={{
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
          aria-label="Minimize call"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

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

          {/* Error pulse ring */}
          {isError && (
            <div
              className="absolute inset-0 rounded-full border-4 border-red-500 animate-pulse"
              style={{ opacity: 0.6 }}
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
              isError
                ? "bg-gradient-to-br from-red-400 to-rose-500"
                : isConnected
                  ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                  : isRinging
                    ? "bg-gradient-to-br from-amber-400 to-orange-500"
                    : "bg-gradient-to-br from-indigo-400 to-purple-500"
            }`}
          >
            {isError ? (
              <svg
                className="h-12 w-12 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ) : (
              <span className="text-white drop-shadow-lg">
                {callerName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">
            {isError ? "Call Failed" : callerName}
          </h2>
          <p
            className={`mt-2 text-sm font-medium ${
              isError
                ? "text-red-400"
                : isConnected
                  ? "text-emerald-400"
                  : isRinging
                    ? "text-amber-400"
                    : "text-indigo-400"
            }`}
          >
            {isError && callError?.message}
            {isRinging && "Incoming call..."}
            {isCalling && "Calling..."}
            {isConnecting && "Connecting..."}
            {isConnected && formatDuration(callDuration)}
          </p>
          {/* Error details */}
          {isError && callError?.details && (
            <p className="mt-2 text-xs text-red-300/70 max-w-xs">
              {callError.details}
            </p>
          )}
          {isError && callError?.code && (
            <p className="mt-1 text-xs text-red-400/50 font-mono">
              Error code: {callError.code}
            </p>
          )}
        </div>

        {/* Error action buttons */}
        {isError && (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                onClearError?.();
                onEnd();
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              style={{ touchAction: "manipulation" }}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Dismiss
            </button>
          </div>
        )}

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
                style={{
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
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
                style={{
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
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

            {/* Speaker / Handset toggle */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onToggleSpeaker}
                className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 ${
                  isSpeaker
                    ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/30"
                    : "bg-white/10 backdrop-blur-sm hover:bg-white/20"
                }`}
              >
                {isSpeaker ? (
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
                      d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
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
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                )}
              </button>
              <span className="text-xs font-medium text-white/70">
                {isSpeaker ? "Speaker" : "Handset"}
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

      {/* Debug Panel */}
      {showDebugPanel && debugState && (
        <div className="absolute bottom-0 left-0 right-0 max-h-[50vh] overflow-y-auto bg-black/95 backdrop-blur-xl border-t border-white/10">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-400">Debug Panel</h3>
              <span className="text-xs text-white/50">
                Status: {callStatus}
              </span>
            </div>

            {/* Connection States */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 rounded p-2">
                <div className="text-white/50 mb-1">Signaling</div>
                <div
                  className={`font-mono ${
                    debugState.signalingState === "stable"
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {debugState.signalingState ?? "N/A"}
                </div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-white/50 mb-1">ICE Connection</div>
                <div
                  className={`font-mono ${
                    debugState.iceConnectionState === "connected" ||
                    debugState.iceConnectionState === "completed"
                      ? "text-emerald-400"
                      : debugState.iceConnectionState === "failed" ||
                          debugState.iceConnectionState === "disconnected"
                        ? "text-red-400"
                        : "text-amber-400"
                  }`}
                >
                  {debugState.iceConnectionState ?? "N/A"}
                </div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-white/50 mb-1">ICE Gathering</div>
                <div
                  className={`font-mono ${
                    debugState.iceGatheringState === "complete"
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {debugState.iceGatheringState ?? "N/A"}
                </div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-white/50 mb-1">Connection</div>
                <div
                  className={`font-mono ${
                    debugState.connectionState === "connected"
                      ? "text-emerald-400"
                      : debugState.connectionState === "failed"
                        ? "text-red-400"
                        : "text-amber-400"
                  }`}
                >
                  {debugState.connectionState ?? "N/A"}
                </div>
              </div>
            </div>

            {/* Candidates & Tracks */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white/5 rounded p-2 text-center">
                <div className="text-white/50 mb-1">Local ICE</div>
                <div className="text-lg font-bold text-indigo-400">
                  {debugState.localCandidatesCount}
                </div>
              </div>
              <div className="bg-white/5 rounded p-2 text-center">
                <div className="text-white/50 mb-1">Remote ICE</div>
                <div className="text-lg font-bold text-indigo-400">
                  {debugState.remoteCandidatesCount}
                </div>
              </div>
              <div className="bg-white/5 rounded p-2 text-center">
                <div className="text-white/50 mb-1">Pending</div>
                <div
                  className={`text-lg font-bold ${
                    debugState.pendingCandidatesCount > 0
                      ? "text-amber-400"
                      : "text-white/30"
                  }`}
                >
                  {debugState.pendingCandidatesCount}
                </div>
              </div>
            </div>

            {/* Media State */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 rounded p-2">
                <div className="text-white/50 mb-1">Local Stream</div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${debugState.hasLocalStream ? "bg-emerald-400" : "bg-red-400"}`}
                  />
                  <span className="text-white/70">
                    {debugState.hasLocalStream
                      ? `${debugState.localTracksCount} tracks`
                      : "None"}
                  </span>
                  {debugState.localAudioEnabled && (
                    <span className="text-emerald-400 text-xs">(enabled)</span>
                  )}
                </div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-white/50 mb-1">Remote Stream</div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${debugState.hasRemoteStream ? "bg-emerald-400" : "bg-red-400"}`}
                  />
                  <span className="text-white/70">
                    {debugState.hasRemoteStream
                      ? `${debugState.remoteTracksCount} tracks`
                      : "None"}
                  </span>
                  {debugState.remoteAudioPlaying && (
                    <span className="text-emerald-400 text-xs">(playing)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Signals */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 rounded p-2">
                <div className="text-white/50 mb-1">Signals Sent</div>
                <div className="text-lg font-bold text-cyan-400">
                  {debugState.signalsSent}
                </div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-white/50 mb-1">Signals Received</div>
                <div className="text-lg font-bold text-cyan-400">
                  {debugState.signalsReceived}
                </div>
              </div>
            </div>

            {debugState.lastSignalType && (
              <div className="bg-white/5 rounded p-2 text-xs">
                <span className="text-white/50">Last signal: </span>
                <span className="text-cyan-400 font-mono">
                  {debugState.lastSignalType}
                </span>
                {debugState.lastSignalTime && (
                  <span className="text-white/30 ml-2">
                    (
                    {Math.round(
                      (Date.now() - debugState.lastSignalTime) / 1000,
                    )}
                    s ago)
                  </span>
                )}
              </div>
            )}

            {/* Event Log */}
            {debugState.eventLog.length > 0 && (
              <div className="bg-white/5 rounded p-2">
                <div className="text-white/50 mb-2 text-xs">Recent Events</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {debugState.eventLog
                    .slice(-10)
                    .reverse()
                    .map((event, i) => (
                      <div
                        key={i}
                        className="text-xs font-mono flex items-start gap-2"
                      >
                        <span className="text-white/30 w-16 flex-shrink-0">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={
                            event.level === "error"
                              ? "text-red-400"
                              : event.level === "warn"
                                ? "text-amber-400"
                                : "text-white/70"
                          }
                        >
                          {event.event}
                        </span>
                        {event.details && (
                          <span className="text-white/40 truncate">
                            {event.details}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
