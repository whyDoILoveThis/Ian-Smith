// components/timeline/TimelineNodes.tsx
"use client";
import React, { useMemo } from "react";
import TimelineNodeView from "./TimelineNode"; // component file name unchanged
import TimelineCluster from "./TimelineCluster";
import LoaderSpinSmall from "../sub/LoaderSpinSmall";
import { clusterByPixelThreshold } from "./hooks/useClustering";

export default function TimelineNodes({
  events,
  getXForMs,
  containerWidth,
  centerMs,
  scale,
  baseRangeDays,
  onTimelineClick,
  saveNode,
  deleteNode,
  isLoading,
  showAllCards,
  canEdit,
}: {
  events: TimelineNode[];
  getXForMs: (ms: number) => number;
  containerWidth: number;
  centerMs: number;
  scale: number;
  baseRangeDays: number;
  onTimelineClick?: (e: React.MouseEvent) => void;
  saveNode: (payload: TimelineNode) => Promise<TimelineNode>;
  deleteNode: (nodeId: string) => Promise<void>;
  isLoading?: boolean;
  showAllCards?: boolean;
  canEdit?: boolean;
}) {
  // sort events ascending by dateMs
  const sorted = useMemo(
    () => [...events].sort((a, b) => a.dateMs - b.dateMs),
    [events],
  );

  const clusters = useMemo(
    () => clusterByPixelThreshold(sorted, getXForMs, 28),
    [sorted, getXForMs],
  );

  return (
    <div className="absolute inset-0">
      {clusters.map((c, idx) => {
        const x = getXForMs(c.centerMs);
        if (c.items.length === 1) {
          return (
            <TimelineNodeView
              key={c.items[0].nodeId ?? c.items[0].title}
              x={x}
              event={c.items[0]}
              saveNode={saveNode}
              deleteNode={deleteNode}
              getXForMs={getXForMs}
              containerWidth={containerWidth}
              showAllCards={showAllCards}
              canEdit={canEdit}
            />
          );
        } else {
          return <TimelineCluster key={idx} x={x} items={c.items} />;
        }
      })}
      {/* Clickable timeline area - only active if canEdit */}
      {onTimelineClick && (
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-10 cursor-pointer"
          onClick={onTimelineClick}
        />
      )}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50 rounded">
          <div className="flex flex-col items-center gap-2">
            <LoaderSpinSmall color="cyan" />
            <span className="text-sm text-neutral-400">Loading nodes...</span>
          </div>
        </div>
      )}
    </div>
  );
}
