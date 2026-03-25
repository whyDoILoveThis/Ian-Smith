"use client";

import { useState, useCallback } from "react";
import { Coordinate } from "@/types/KwikMaps.type";

export function useOptimization() {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeRoute = useCallback(
    async (coordinates: Coordinate[]) => {
      if (coordinates.length < 2) {
        return { success: false as const, error: "Please add at least 2 locations to optimize" };
      }

      setIsOptimizing(true);

      try {
        const response = await fetch("/api/kwikmaps-optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coordinates }),
        });

        if (!response.ok) {
          throw new Error("Failed to optimize route");
        }

        const data = await response.json();
        if (data.success) {
          return {
            success: true as const,
            optimizedRoute: data.optimizedRoute as Coordinate[],
            totalDistanceMiles: (data.totalDistanceMiles || 0) as number,
            totalDistanceKm: (data.totalDistanceKm || 0) as number,
            legs: (data.legs || []) as { from: string; to: string; distanceKm: number; distanceMiles: number }[],
            aiInsights: (data.aiInsights || "") as string,
          };
        } else {
          return { success: false as const, error: data.error || "Failed to optimize route" };
        }
      } catch (err) {
        return {
          success: false as const,
          error: err instanceof Error ? err.message : "An unexpected error occurred",
        };
      } finally {
        setIsOptimizing(false);
      }
    },
    [],
  );

  return { isOptimizing, optimizeRoute };
}
