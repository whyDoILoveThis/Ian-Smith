"use client";

import { useCallback, useRef, useState } from "react";
import type { RecordedDrawingStroke } from "../types";

export type DrawingRecorderState = {
  isRecording: boolean;
  recordedStrokes: RecordedDrawingStroke[];
  recordingDuration: number;
  startRecording: () => void;
  stopRecording: () => { strokes: RecordedDrawingStroke[]; duration: number } | null;
  cancelRecording: () => void;
  /** Call when a new stroke starts during recording */
  onStrokeStart: (color: string) => void;
  /** Call with each new point during a stroke */
  onStrokePoint: (x: number, y: number) => void;
  /** Call when a stroke ends */
  onStrokeEnd: () => void;
};

export function useDrawingRecorder(): DrawingRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedStrokes, setRecordedStrokes] = useState<RecordedDrawingStroke[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const recordingStartTime = useRef<number>(0);
  const currentStrokeRef = useRef<{
    color: string;
    points: { x: number; y: number }[];
    startTime: number;
  } | null>(null);
  const strokesRef = useRef<RecordedDrawingStroke[]>([]);
  const durationTimerRef = useRef<number | null>(null);

  const startRecording = useCallback(() => {
    recordingStartTime.current = Date.now();
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setRecordedStrokes([]);
    setRecordingDuration(0);
    setIsRecording(true);

    // Update duration display every 100ms
    durationTimerRef.current = window.setInterval(() => {
      setRecordingDuration(Date.now() - recordingStartTime.current);
    }, 100);
  }, []);

  const stopRecording = useCallback(() => {
    if (!isRecording) return null;

    // If there's an in-progress stroke, finish it
    if (currentStrokeRef.current) {
      const elapsed = Date.now() - recordingStartTime.current;
      strokesRef.current.push({
        ...currentStrokeRef.current,
        endTime: elapsed,
      });
      currentStrokeRef.current = null;
    }

    const duration = Date.now() - recordingStartTime.current;
    const strokes = [...strokesRef.current];

    setIsRecording(false);
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    setRecordedStrokes(strokes);
    setRecordingDuration(duration);

    return { strokes, duration };
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    setIsRecording(false);
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setRecordedStrokes([]);
    setRecordingDuration(0);
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const onStrokeStart = useCallback(
    (color: string) => {
      if (!isRecording) return;
      const elapsed = Date.now() - recordingStartTime.current;
      currentStrokeRef.current = {
        color,
        points: [],
        startTime: elapsed,
      };
    },
    [isRecording],
  );

  const onStrokePoint = useCallback(
    (x: number, y: number) => {
      if (!isRecording || !currentStrokeRef.current) return;
      currentStrokeRef.current.points.push({ x, y });
    },
    [isRecording],
  );

  const onStrokeEnd = useCallback(() => {
    if (!isRecording || !currentStrokeRef.current) return;
    const elapsed = Date.now() - recordingStartTime.current;
    // Only save strokes that have at least 2 points
    if (currentStrokeRef.current.points.length >= 2) {
      strokesRef.current.push({
        ...currentStrokeRef.current,
        endTime: elapsed,
      });
    }
    currentStrokeRef.current = null;
  }, [isRecording]);

  return {
    isRecording,
    recordedStrokes,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    onStrokeStart,
    onStrokePoint,
    onStrokeEnd,
  };
}
