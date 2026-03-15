"use client";

import { PerformanceOverlay } from "@/components/PerformanceOverlay";

export default function PerfOverlayHero() {
  return (
    <div
      style={{
        position: "relative",
        width: 220,
        height: 280,
        overflow: "visible",
        borderRadius: 12,
      }}
    >
      <PerformanceOverlay enabled contained />
    </div>
  );
}
