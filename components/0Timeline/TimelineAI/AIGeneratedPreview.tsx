// components/0Timeline/TimelineAI/AIGeneratedPreview.tsx
"use client";

import React, { useState } from "react";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import type { GeneratedTimeline, GeneratedNode } from "./types";

interface AIGeneratedPreviewProps {
  timeline: GeneratedTimeline;
}

export default function AIGeneratedPreview({
  timeline,
}: AIGeneratedPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const displayNodes = expanded ? timeline.nodes : timeline.nodes.slice(0, 5);

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div
        className="p-4 rounded-xl border-2 transition-all"
        style={{
          borderColor: timeline.color || "#06b6d4",
          backgroundColor: `${timeline.color || "#06b6d4"}10`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0 mt-1 shadow-lg"
            style={{ backgroundColor: timeline.color || "#06b6d4" }}
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {timeline.name}
            </h3>
            {timeline.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {timeline.description}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {timeline.nodes.length} events generated
            </p>
          </div>
        </div>
      </div>

      {/* Nodes Preview */}
      <div className="relative">
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
          {displayNodes.map((node, index) => (
            <NodePreviewCard key={index} node={node} formatDate={formatDate} />
          ))}
        </div>

        {timeline.nodes.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 py-2 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-all flex items-center justify-center gap-2"
          >
            {expanded ? (
              <>
                <ChevronUp size={16} />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                Show {timeline.nodes.length - 5} More Events
              </>
            )}
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <Calendar size={14} />
            <span>
              {formatDate(Math.min(...timeline.nodes.map((n) => n.dateMs)))} —{" "}
              {formatDate(Math.max(...timeline.nodes.map((n) => n.dateMs)))}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-500">
            Colors:
          </span>
          <div className="flex -space-x-1">
            {Array.from(new Set(timeline.nodes.map((n) => n.color)))
              .slice(0, 6)
              .map((color, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border-2 border-white dark:border-gray-800"
                  style={{ backgroundColor: color || "#06b6d4" }}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NodePreviewCard({
  node,
  formatDate,
}: {
  node: GeneratedNode;
  formatDate: (ms: number) => string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-all">
      <div
        className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5 shadow-sm"
        style={{ backgroundColor: node.color || "#06b6d4" }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {node.title}
          </h4>
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            {formatDate(node.dateMs)}
          </span>
        </div>
        {node.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {node.description}
          </p>
        )}
      </div>
    </div>
  );
}
