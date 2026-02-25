// ─── Camera hook ──────────────────────────────────────────────────
// Manages camera lifecycle: permission request, stream creation,
// and cleanup. Returns a ref to attach to a <video> element.
//
// WHY A HOOK: Camera lifecycle (start/stop) is tied to component
// mount/unmount, making it a natural fit for useEffect.

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { CameraPermission } from "../types";

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  permission: CameraPermission;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  isStreaming: boolean;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null!);
  const streamRef = useRef<MediaStream | null>(null);
  const [permission, setPermission] = useState<CameraPermission>("prompt");
  const [isStreaming, setIsStreaming] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      // Prefer front camera (selfie). Fallback gracefully.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video metadata to load before playing
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current!.play();
            resolve();
          };
        });
      }

      setPermission("granted");
      setIsStreaming(true);
    } catch (err: any) {
      // NotAllowedError = user denied, NotFoundError = no camera
      if (err.name === "NotAllowedError") {
        setPermission("denied");
      } else {
        setPermission("error");
      }
      console.warn("[LookieThere] Camera error:", err.message);
    }
  }, []);

  // Deferred stream attachment:
  // When the video element mounts AFTER the stream is already acquired
  // (e.g. because it was conditionally rendered), this effect connects them.
  useEffect(() => {
    if (isStreaming && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isStreaming]);

  // Cleanup on unmount — always stop the camera
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return { videoRef, permission, startCamera, stopCamera, isStreaming };
}
