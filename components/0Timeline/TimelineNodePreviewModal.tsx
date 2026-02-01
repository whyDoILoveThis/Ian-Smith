// components/0Timeline/TimelineNodePreviewModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, ChevronUp, X, Eye } from "lucide-react";
import LoaderSpinSmall from "../sub/LoaderSpinSmall";

interface TimelineNodePreviewModalProps {
  timeline: Timeline;
  onClose: () => void;
}

export default function TimelineNodePreviewModal({
  timeline,
  onClose,
}: TimelineNodePreviewModalProps) {
  const [nodes, setNodes] = useState<TimelineNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchNodes = async () => {
      setLoading(true);
      try {
        const url = `/api/fb/fetch-nodes?timelineId=${encodeURIComponent(timeline.timelineId || "")}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json?.ok && Array.isArray(json.data)) {
          // Sort by date
          const sorted = (json.data as TimelineNode[]).sort((a, b) => a.dateMs - b.dateMs);
          setNodes(sorted);
        }
      } catch (err) {
        console.error("Failed to fetch nodes for preview", err);
      } finally {
        setLoading(false);
      }
    };

    if (timeline.timelineId) {
      fetchNodes();
    }
  }, [timeline.timelineId]);

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const displayNodes = expanded ? nodes : nodes.slice(0, 5);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-700 overflow-hidden"
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between"
          style={{ backgroundColor: `${timeline.color || "#06b6d4"}15` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full shadow-lg"
              style={{ backgroundColor: timeline.color || "#06b6d4" }}
            />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {timeline.name}
              </h2>
              {timeline.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {timeline.description}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoaderSpinSmall color="cyan" />
            </div>
          ) : nodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Eye size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No events in this timeline yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Nodes List */}
              <div className="space-y-2">
                {displayNodes.map((node, index) => (
                  <div
                    key={node.nodeId || index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600 transition-all"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5 shadow-sm"
                      style={{ backgroundColor: node.color || timeline.color || "#06b6d4" }}
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
                ))}
              </div>

              {/* Expand/Collapse button */}
              {nodes.length > 5 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="w-full py-2 px-4 rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-neutral-600 transition-all flex items-center justify-center gap-2"
                >
                  {expanded ? (
                    <>
                      <ChevronUp size={16} />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      Show {nodes.length - 5} More Events
                    </>
                  )}
                </button>
              )}

              {/* Stats bar */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-100 dark:bg-neutral-800">
                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <Calendar size={14} />
                  <span>
                    {formatDate(Math.min(...nodes.map((n) => n.dateMs)))} —{" "}
                    {formatDate(Math.max(...nodes.map((n) => n.dateMs)))}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {nodes.length} events
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
