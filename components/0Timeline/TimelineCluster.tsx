// components/timeline/TimelineCluster.tsx
"use client";
import React, { useState } from "react";
import TimelineHoverCard from "./TimelineHoverCard";

export default function TimelineCluster({
  x,
  items,
}: {
  x: number;
  items: TimelineNode[];
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ left: `${x}px` }}
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
    >
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="relative flex items-center justify-center"
      >
        <div
          className={`w-8 h-8 rounded-full bg-neutral-700/60 border border-neutral-600 flex items-center justify-center text-sm text-neutral-200 shadow-lg transform transition-all ${hover ? "scale-105" : ""}`}
        >
          +{items.length}
        </div>

        <div className="absolute -top-48 w-72">
          <div
            className={`transition-all transform origin-bottom ${hover ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"}`}
          >
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-sm">
              <div className="font-semibold mb-2">Cluster ({items.length})</div>
              <ul className="space-y-2 max-h-40 overflow-auto">
                {items.slice(0, 8).map((it) => (
                  <li key={it.nodeId ?? it.title} className="text-neutral-300">
                    <div className="font-medium">{it.title}</div>
                    <div className="text-xs text-neutral-400">
                      {new Date(it.dateMs).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
