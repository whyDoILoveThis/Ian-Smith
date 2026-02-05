"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type EphemeralVideoPlayerProps = {
  videoUrl: string;
  sender: string;
  onClose: () => void;
  onViewed: () => void;
};

export function EphemeralVideoPlayer({
  videoUrl,
  sender,
  onClose,
  onViewed,
}: EphemeralVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  // Mark as viewed when video starts playing
  useEffect(() => {
    if (hasStarted) {
      onViewed();
    }
  }, [hasStarted, onViewed]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setHasStarted(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      const prog =
        (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(prog);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    videoRef.current.currentTime = percentage * videoRef.current.duration;
  }, []);

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClose = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onClose();
  }, [onClose]);

  // Auto-play on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {
          // Autoplay blocked - user needs to interact
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-xl">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
            {sender.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-medium">{sender}</p>
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <span>👁️</span> Ephemeral Video
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Video container */}
      <div className="relative w-full max-w-2xl mx-4">
        <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full"
            playsInline
            onClick={togglePlayPause}
            onPlay={handlePlay}
            onPause={handlePause}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
          />

          {/* Play/Pause overlay */}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300 ${
              isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
            onClick={togglePlayPause}
          >
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer">
              <svg
                className="w-10 h-10 text-white ml-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* Warning badge */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-red-500/20 backdrop-blur-sm border border-red-500/30">
            <span className="text-red-400 text-xs font-medium">
              🔥 Disappears when closed
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 px-2">
          {/* Progress bar */}
          <div
            className="h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Time display */}
          <div className="mt-2 flex items-center justify-between text-sm text-white/70">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Warning footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-neutral-400 text-sm">
          This video will disappear from the chat when you close this player
        </p>
      </div>
    </div>
  );
}
