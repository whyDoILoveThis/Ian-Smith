"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { ref, onValue, set, remove, push } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import { ROOM_PATH } from "../constants";

// Rainbow colors in order
export const DRAWING_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export type DrawingPoint = {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
};

export type DrawingStroke = {
  id: string;
  points: DrawingPoint[];
  color: string;
  slotId: "1" | "2";
  timestamp: number;
  isComplete: boolean;
};

const STROKE_DURATION = 4000; // How long strokes stay visible before fading (ms)
const FADE_DURATION = 1500; // How long the fade takes (ms)
const DRAWING_PATH = `${ROOM_PATH}/drawing`;

export function useDrawing(slotId: "1" | "2" | null) {
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const currentStrokeId = useRef<string | null>(null);

  // Listen to all strokes from Firebase
  useEffect(() => {
    const strokesRef = ref(rtdb, DRAWING_PATH);

    const unsubscribe = onValue(strokesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setStrokes([]);
        return;
      }

      const now = Date.now();
      const strokeList: DrawingStroke[] = [];

      Object.entries(data).forEach(([id, stroke]) => {
        const s = stroke as DrawingStroke;
        // Only include strokes that are still within the total display duration
        const totalDuration = STROKE_DURATION + FADE_DURATION;
        if (now - s.timestamp < totalDuration) {
          strokeList.push({ ...s, id });
        }
      });

      setStrokes(strokeList);
    });

    return () => unsubscribe();
  }, []);

  // Start a new stroke
  const startStroke = useCallback(
    async (x: number, y: number) => {
      if (!slotId || !selectedColor) return;

      const strokeRef = push(ref(rtdb, DRAWING_PATH));
      const strokeId = strokeRef.key;
      if (!strokeId) return;

      currentStrokeId.current = strokeId;

      const strokeData: Omit<DrawingStroke, "id"> = {
        points: [{ x, y }],
        color: selectedColor,
        slotId,
        timestamp: Date.now(),
        isComplete: false,
      };

      try {
        await set(strokeRef, strokeData);
      } catch (err) {
        console.error("Failed to start stroke:", err);
        currentStrokeId.current = null;
      }
    },
    [slotId, selectedColor],
  );

  // Add point to current stroke
  const addPoint = useCallback(
    async (x: number, y: number) => {
      if (!slotId || !selectedColor || !currentStrokeId.current) return;

      const strokeRef = ref(rtdb, `${DRAWING_PATH}/${currentStrokeId.current}`);

      // Get current stroke and add point
      const currentStroke = strokes.find((s) => s.id === currentStrokeId.current);
      if (!currentStroke) return;

      const updatedPoints = [...currentStroke.points, { x, y }];

      try {
        await set(strokeRef, {
          ...currentStroke,
          points: updatedPoints,
        });
      } catch (err) {
        console.error("Failed to add point:", err);
      }
    },
    [slotId, selectedColor, strokes],
  );

  // End current stroke
  const endStroke = useCallback(async () => {
    if (!currentStrokeId.current) return;

    const strokeRef = ref(rtdb, `${DRAWING_PATH}/${currentStrokeId.current}`);
    const currentStroke = strokes.find((s) => s.id === currentStrokeId.current);

    if (currentStroke) {
      try {
        await set(strokeRef, {
          ...currentStroke,
          isComplete: true,
          timestamp: Date.now(), // Reset timestamp when complete for fade timing
        });

        // Schedule removal
        const strokeId = currentStrokeId.current;
        setTimeout(async () => {
          try {
            await remove(ref(rtdb, `${DRAWING_PATH}/${strokeId}`));
          } catch {
            // Ignore removal errors
          }
        }, STROKE_DURATION + FADE_DURATION);
      } catch (err) {
        console.error("Failed to end stroke:", err);
      }
    }

    currentStrokeId.current = null;
  }, [strokes]);

  // Check if drawing mode is active
  const isDrawingMode = selectedColor !== null;

  return {
    strokes,
    selectedColor,
    setSelectedColor,
    isDrawingMode,
    startStroke,
    addPoint,
    endStroke,
    STROKE_DURATION,
    FADE_DURATION,
  };
}
