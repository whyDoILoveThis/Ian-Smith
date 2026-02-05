"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type VideoRecorderProps = {
  onClose: () => void;
  onSend: (videoBlob: Blob) => void;
  isSending: boolean;
};

export function VideoRecorder({
  onClose,
  onSend,
  isSending,
}: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const timerRef = useRef<number | null>(null);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please check permissions.");
    }
  }, [facingMode]);

  // Initialize camera when component mounts
  useEffect(() => {
    if (!recordedBlob) {
      startCamera();
    }
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [facingMode, recordedBlob, startCamera, recordedUrl]);

  // Handle recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);

      // Stop camera after recording
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };

    mediaRecorder.start(100);
    setIsRecording(true);
    setRecordingTime(0);

    // Start timer
    timerRef.current = window.setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleDiscard = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingTime(0);
    startCamera();
  }, [recordedUrl, startCamera]);

  const handleSend = useCallback(() => {
    if (recordedBlob) {
      onSend(recordedBlob);
    }
  }, [recordedBlob, onSend]);

  const handleClose = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingTime(0);
    setIsRecording(false);
    onClose();
  }, [onClose, recordedUrl]);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black">
      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
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

      {/* Error message */}
      {error && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center p-6">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={startCamera}
            className="px-4 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Camera/Preview view */}
      {!error && (
        <div className="relative w-full h-full flex flex-col">
          {/* Video element */}
          {!recordedUrl ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                transform: facingMode === "user" ? "scaleX(-1)" : "none",
              }}
            />
          ) : (
            <video
              src={recordedUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full h-full object-contain bg-black"
            />
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm">
              <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white font-mono text-lg">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
            {!recordedUrl ? (
              <>
                {/* Flip camera button */}
                {!isRecording && (
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                )}

                {/* Record button */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-white transition-all ${
                    isRecording
                      ? "bg-transparent"
                      : "bg-transparent hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`transition-all duration-200 ${
                      isRecording
                        ? "w-8 h-8 rounded-md bg-red-500"
                        : "w-16 h-16 rounded-full bg-red-500"
                    }`}
                  />
                </button>

                {/* Placeholder for symmetry */}
                {!isRecording && <div className="w-12 h-12" />}
              </>
            ) : (
              <>
                {/* Discard button */}
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={isSending}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span className="text-xs font-medium">Discard</span>
                </button>

                {/* Send button */}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending}
                  className="flex flex-col items-center gap-1 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSending ? (
                    <span className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  )}
                  <span className="text-xs font-medium">
                    {isSending ? "Sending..." : "Send"}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Ephemeral video notice */}
          <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-500/30">
            <span className="text-amber-400 text-xs">
              👁️ Disappears after viewing
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
