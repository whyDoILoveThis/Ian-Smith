"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type VideoRecorderProps = {
  onClose: () => void;
  onSend: (videoBlob: Blob) => void;
  isSending: boolean;
};

// Detect if device is low-end based on hardware concurrency and device memory
function detectDeviceCapability(): "low" | "medium" | "high" {
  if (typeof navigator === "undefined") return "medium";

  const cores = navigator.hardwareConcurrency || 2;
  // @ts-expect-error - deviceMemory is not in all browsers
  const memory = navigator.deviceMemory || 4;

  // Low-end: 2 or fewer cores, or less than 4GB RAM
  if (cores <= 2 || memory < 4) return "low";
  // High-end: 6+ cores and 8GB+ RAM
  if (cores >= 6 && memory >= 8) return "high";
  return "medium";
}

// Get video constraints based on device capability
function getVideoConstraints(
  facingMode: "user" | "environment",
  capability: "low" | "medium" | "high",
  useExactFacing = false,
) {
  // Use exact facingMode for more reliable camera switching on mobile
  const facingConstraint = useExactFacing
    ? { facingMode: { exact: facingMode } }
    : { facingMode: { ideal: facingMode } };

  switch (capability) {
    case "low":
      return {
        ...facingConstraint,
        width: { ideal: 480, max: 640 },
        height: { ideal: 360, max: 480 },
        frameRate: { ideal: 15, max: 24 },
      };
    case "medium":
      return {
        ...facingConstraint,
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 24, max: 30 },
      };
    case "high":
    default:
      return {
        ...facingConstraint,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      };
  }
}

// Get audio constraints optimized for device
function getAudioConstraints(capability: "low" | "medium" | "high") {
  switch (capability) {
    case "low":
      return {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 22050,
        channelCount: 1,
      };
    case "medium":
      return {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
        channelCount: 1,
      };
    case "high":
    default:
      return {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 48000,
        channelCount: 2,
      };
  }
}

// Get MediaRecorder options based on device capability
function getRecorderOptions(
  capability: "low" | "medium" | "high",
): MediaRecorderOptions {
  // Determine best supported mime type
  const mimeTypes = [
    "video/webm;codecs=vp8,opus", // VP8 is more efficient on low-end devices
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];

  let mimeType = "";
  for (const type of mimeTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      mimeType = type;
      break;
    }
  }

  // Set bitrate based on capability
  let videoBitsPerSecond: number;
  let audioBitsPerSecond: number;

  switch (capability) {
    case "low":
      videoBitsPerSecond = 500000; // 500 Kbps
      audioBitsPerSecond = 64000; // 64 Kbps
      break;
    case "medium":
      videoBitsPerSecond = 1000000; // 1 Mbps
      audioBitsPerSecond = 96000; // 96 Kbps
      break;
    case "high":
    default:
      videoBitsPerSecond = 2500000; // 2.5 Mbps
      audioBitsPerSecond = 128000; // 128 Kbps
      break;
  }

  return {
    mimeType,
    videoBitsPerSecond,
    audioBitsPerSecond,
  };
}

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
  const [deviceCapability, setDeviceCapability] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [isInitializing, setIsInitializing] = useState(true);

  const timerRef = useRef<number | null>(null);
  const recorderMimeTypeRef = useRef<string>("video/webm");

  // Detect device capability on mount
  useEffect(() => {
    setDeviceCapability(detectDeviceCapability());
  }, []);

  // Start camera stream with optimized settings
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsInitializing(true);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const audioConstraints = getAudioConstraints(deviceCapability);

      // Try multiple constraint strategies for camera access
      let stream: MediaStream | null = null;
      const strategies = [
        // Strategy 1: Exact facingMode with optimized settings
        () => {
          const constraints = getVideoConstraints(
            facingMode,
            deviceCapability,
            true,
          );
          console.log("Trying exact facingMode with optimized settings");
          return navigator.mediaDevices.getUserMedia({
            video: constraints,
            audio: audioConstraints,
          });
        },
        // Strategy 2: Ideal facingMode with optimized settings
        () => {
          const constraints = getVideoConstraints(
            facingMode,
            deviceCapability,
            false,
          );
          console.log("Trying ideal facingMode with optimized settings");
          return navigator.mediaDevices.getUserMedia({
            video: constraints,
            audio: audioConstraints,
          });
        },
        // Strategy 3: Just facingMode, no other constraints
        () => {
          console.log("Trying basic facingMode only");
          return navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: facingMode } },
            audio: true,
          });
        },
        // Strategy 4: Ideal facingMode only
        () => {
          console.log("Trying ideal facingMode only");
          return navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
            audio: true,
          });
        },
        // Strategy 5: Any camera
        () => {
          console.log("Falling back to any available camera");
          return navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        },
      ];

      for (const strategy of strategies) {
        try {
          stream = await strategy();
          if (stream) {
            console.log("Camera stream acquired successfully");
            break;
          }
        } catch (err) {
          console.log("Strategy failed, trying next...", err);
          continue;
        }
      }

      if (!stream) {
        throw new Error("All camera strategies failed");
      }

      streamRef.current = stream;

      if (videoRef.current) {
        // Clear any existing source
        videoRef.current.srcObject = null;
        videoRef.current.srcObject = stream;

        // Ensure video plays
        videoRef.current.onloadedmetadata = async () => {
          try {
            if (videoRef.current) {
              await videoRef.current.play();
            }
            setIsInitializing(false);
          } catch (playErr) {
            console.error("Error playing video:", playErr);
            setIsInitializing(false);
          }
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please check permissions.");
      setIsInitializing(false);
    }
  }, [facingMode, deviceCapability]);

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

  // Handle recording with optimized settings
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];

    const recorderOptions = getRecorderOptions(deviceCapability);
    recorderMimeTypeRef.current = recorderOptions.mimeType || "video/webm";

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(streamRef.current, recorderOptions);
    } catch {
      // Fallback if options aren't supported
      mediaRecorder = new MediaRecorder(streamRef.current);
      recorderMimeTypeRef.current = "video/webm";
    }

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: recorderMimeTypeRef.current,
      });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);

      // Stop camera after recording
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };

    // Use larger timeslice on low-end devices to reduce processing overhead
    const timeslice =
      deviceCapability === "low"
        ? 500
        : deviceCapability === "medium"
          ? 250
          : 100;
    mediaRecorder.start(timeslice);
    setIsRecording(true);
    setRecordingTime(0);

    // Start timer
    timerRef.current = window.setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  }, [deviceCapability]);

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
    // Stop current stream before switching
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsInitializing(true);
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
          {/* Loading indicator */}
          {isInitializing && !recordedUrl && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
              <p className="text-white/70 text-sm">Initializing camera...</p>
              {deviceCapability === "low" && (
                <p className="text-amber-400/70 text-xs mt-2">
                  Optimizing for your device...
                </p>
              )}
            </div>
          )}

          {/* Video element - Live camera */}
          {!recordedUrl ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              disablePictureInPicture
              className={`w-full h-full object-cover ${isInitializing ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
              style={{
                transform: facingMode === "user" ? "scaleX(-1)" : "none",
                // Hardware acceleration hints
                willChange: "transform",
              }}
            />
          ) : (
            <video
              key={recordedUrl} // Force remount when URL changes
              src={recordedUrl}
              controls
              autoPlay
              loop
              playsInline
              muted={false}
              preload="auto"
              className="w-full h-full object-contain bg-black"
              onLoadedData={(e) => {
                // Ensure video starts playing when loaded
                const video = e.currentTarget;
                video.play().catch((err) => {
                  console.log(
                    "Autoplay blocked, user interaction needed:",
                    err,
                  );
                });
              }}
              onError={(e) => {
                console.error("Video playback error:", e);
              }}
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
          <div className="absolute top-6 left-6 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-500/30">
              <span className="text-amber-400 text-xs">
                👁️ Disappears after viewing
              </span>
            </div>
            {/* Quality indicator for low-end devices */}
            {deviceCapability === "low" && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 backdrop-blur-sm border border-blue-500/30">
                <span className="text-blue-400 text-xs">
                  📱 Optimized quality
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
