"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { ref, onValue, set, remove, push } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import { ROOM_PATH } from "../constants";

// Massive rainbow palette grid - organized by hue with light to dark shades
export const DRAWING_COLORS = [
  // Row 1: Lightest shades
  "#fecaca", "#fed7aa", "#fef08a", "#bbf7d0", "#a7f3d0", "#a5f3fc", "#bfdbfe", "#c4b5fd", "#ddd6fe", "#fbcfe8", "#fecdd3",
  // Row 2: Light shades
  "#fca5a5", "#fdba74", "#fde047", "#86efac", "#6ee7b7", "#67e8f9", "#93c5fd", "#a78bfa", "#c4b5fd", "#f9a8d4", "#fda4af",
  // Row 3: Medium-light
  "#f87171", "#fb923c", "#facc15", "#4ade80", "#34d399", "#22d3ee", "#60a5fa", "#818cf8", "#a78bfa", "#f472b6", "#fb7185",
  // Row 4: Vivid/Standard
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  // Row 5: Medium-dark
  "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#059669", "#0891b2", "#2563eb", "#4f46e5", "#7c3aed", "#db2777", "#e11d48",
  // Row 6: Dark shades
  "#b91c1c", "#c2410c", "#a16207", "#15803d", "#047857", "#0e7490", "#1d4ed8", "#4338ca", "#6d28d9", "#be185d", "#be123c",
  // Row 7: Darkest shades
  "#991b1b", "#9a3412", "#854d0e", "#166534", "#065f46", "#155e75", "#1e40af", "#3730a3", "#5b21b6", "#9d174d", "#9f1239",
  // Row 8: Extra colors - neons & special
  "#ff0000", "#ff6600", "#ffff00", "#00ff00", "#00ffcc", "#00ffff", "#0099ff", "#0000ff", "#9900ff", "#ff00ff", "#ff0066",
  // Row 9: Grayscale
  "#ffffff", "#f5f5f5", "#e5e5e5", "#d4d4d4", "#a3a3a3", "#737373", "#525252", "#404040", "#262626", "#171717", "#000000",
];

// Neon colors that get special glow effects
export const NEON_COLORS = [
  "#ff0000", "#ff6600", "#ffff00", "#00ff00", "#00ffcc", "#00ffff", "#0099ff", "#0000ff", "#9900ff", "#ff00ff", "#ff0066",
];

export const isNeonColor = (color: string) => NEON_COLORS.includes(color.toLowerCase());

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
  // Buffer for local points during drawing
  const localPoints = useRef<{ x: number; y: number }[] | null>(null);

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
      localPoints.current = [{ x, y }];

      // Write initial stroke to Firebase (with just the first point)
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
        localPoints.current = null;
      }
    },
    [slotId, selectedColor],
  );

  // Add point to current stroke
  const addPoint = useCallback(
    (x: number, y: number) => {
      if (!slotId || !selectedColor || !currentStrokeId.current) return;
      if (!localPoints.current) localPoints.current = [];
      localPoints.current.push({ x, y });
    },
    [slotId, selectedColor],
  );

  // End current stroke
  const endStroke = useCallback(async () => {
    if (!currentStrokeId.current) return;

    const strokeRef = ref(rtdb, `${DRAWING_PATH}/${currentStrokeId.current}`);
    // Use the locally buffered points for the final stroke
    const currentStroke = strokes.find((s) => s.id === currentStrokeId.current);
    const points = localPoints.current || (currentStroke ? currentStroke.points : []);

    if (currentStroke) {
      try {
        await set(strokeRef, {
          ...currentStroke,
          points,
          isComplete: true,
          timestamp: Date.now(), // Set timestamp only when complete
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
    localPoints.current = null;
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
