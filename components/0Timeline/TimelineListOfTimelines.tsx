"use client";

import React, { useState } from "react";
import { Eye } from "lucide-react";
import LoaderSpinSmall from "../sub/LoaderSpinSmall";
import TimelineNodePreviewModal from "./TimelineNodePreviewModal";

interface TimelineListOfTimelinesProps {
  timelines: Timeline[];
  activeTimeline: Timeline | null;
  loading: boolean;
  onSelect: (timeline: Timeline) => void;
  onCreate: (
    name: string,
    description?: string,
    color?: string,
  ) => Promise<void>;
  onClose: () => void;
  canCreate?: boolean; // Whether the current user can create timelines
  isViewingOther?: boolean; // Whether viewing another user's timelines
  currentUserId?: string; // Current user's ID to show ownership
  users?: TimelineUser[]; // List of users for ownership display
  viewingUser?: TimelineUser | null; // The user being viewed
  showAllTimelines?: boolean; // Whether showing all timelines
  onToggleShowAll?: () => void; // Toggle between own and all timelines
  previewTimeline?: {
    name: string;
    description?: string;
    color?: string;
    nodes?: any[];
  } | null; // AI preview timeline
  isPreviewActive?: boolean; // Whether the preview timeline is currently active
  onSelectPreview?: () => void; // Callback when preview timeline is selected
  onSelectRegularTimeline?: (timeline: Timeline) => void; // Callback when regular timeline is selected
  onDiscardPreview?: () => void; // Callback to discard the preview timeline
}

const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#22c55e", // green
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export default function TimelineListOfTimelines({
  timelines,
  activeTimeline,
  loading,
  onSelect,
  onCreate,
  onClose,
  canCreate = true,
  isViewingOther = false,
  currentUserId,
  users = [],
  viewingUser,
  showAllTimelines = false,
  onToggleShowAll,
  previewTimeline,
  isPreviewActive = false,
  onSelectPreview,
  onSelectRegularTimeline,
  onDiscardPreview,
}: TimelineListOfTimelinesProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState("#06b6d4");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewingTimeline, setPreviewingTimeline] = useState<Timeline | null>(null);

  // Filter timelines by search query (name, description, creator name, creator email)
  const filteredTimelines = timelines.filter((timeline) => {
    const query = searchQuery.toLowerCase();

    // Search in timeline name and description
    const timelineMatch =
      timeline.name.toLowerCase().includes(query) ||
      (timeline.description &&
        timeline.description.toLowerCase().includes(query));

    // Search in creator name and email
    if (timeline.userId) {
      const creator = users.find((u) => u.clerkUserId === timeline.userId);
      if (creator) {
        const creatorMatch =
          creator.displayName.toLowerCase().includes(query) ||
          (creator.email && creator.email.toLowerCase().includes(query));
        return timelineMatch || creatorMatch;
      }
    }

    return timelineMatch;
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await onCreate(
      newName.trim(),
      newDescription.trim() || undefined,
      newColor,
    );
    setNewName("");
    setNewDescription("");
    setNewColor("#06b6d4");
    setIsCreating(false);
    setSaving(false);
  };

  // Auto-select first timeline if none active and timelines exist
  React.useEffect(() => {
    if (activeTimeline === null && timelines.length > 0) {
      onSelect(timelines[0]);
    }
  }, [timelines.length, activeTimeline, timelines, onSelect]);

  const canClose = timelines.length > 0;

  return (
    <div
      className="fixed inset-0 z-[1000010] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={canClose ? onClose : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[80vh] overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              {isViewingOther ? "Their Timelines" : "Timelines"}
            </h2>
            {(!currentUserId && !isViewingOther) ||
            (showAllTimelines && !isViewingOther) ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                🌐 All Timelines
              </span>
            ) : isViewingOther && viewingUser ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                👤 {viewingUser.displayName?.split(" ")[0] || "Other User"}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                ✓ Your Timelines
              </span>
            )}
            {currentUserId && !isViewingOther && onToggleShowAll && (
              <button
                type="button"
                onClick={onToggleShowAll}
                className="ml-1 px-2 py-0.5 text-[10px] rounded-full border border-white/10 text-neutral-300 hover:text-white hover:border-white/20 transition-colors"
                title={
                  showAllTimelines
                    ? "Show your timelines"
                    : "Show all timelines"
                }
              >
                {showAllTimelines ? "Yours" : "All"}
              </button>
            )}
          </div>
          <button
            onClick={canClose ? onClose : undefined}
            disabled={!canClose}
            className={`text-neutral-400 transition-colors text-xl leading-none ${
              canClose
                ? "hover:text-white cursor-pointer"
                : "opacity-30 cursor-not-allowed"
            }`}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto customScroll customScrollActiveCyan max-h-[60vh] p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoaderSpinSmall color="cyan" />
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search timelines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Timeline List */}
              <div className="space-y-2">
                {/* AI Preview Timeline - shown at top if exists */}
                {previewTimeline && onSelectPreview && (
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectPreview();
                    }}
                    className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      isPreviewActive
                        ? "bg-white/10 border-2 border-amber-500/70"
                        : "bg-white/5 border border-transparent hover:bg-white/10 hover:border-amber-500/30"
                    }`}
                  >
                    {/* Color indicator */}
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: previewTimeline.color || "#06b6d4",
                      }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">
                          {previewTimeline.name}
                        </span>
                        {previewTimeline.nodes && (
                          <span className="text-[10px] text-neutral-500">
                            ({previewTimeline.nodes.length} events)
                          </span>
                        )}
                      </div>
                      {previewTimeline.description && (
                        <div className="text-xs text-neutral-400 truncate">
                          {previewTimeline.description}
                        </div>
                      )}
                    </div>

                    {/* Active badge */}
                    {isPreviewActive && (
                      <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-medium">
                        Active
                      </span>
                    )}

                    {/* Preview Badge */}
                    <span className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-500/50 text-amber-300">
                      Preview
                    </span>

                    {/* Discard button */}
                    {onDiscardPreview && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDiscardPreview();
                        }}
                        className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Discard preview"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {filteredTimelines.length === 0 && !isCreating && (
                  <p className="text-neutral-500 text-sm text-center py-4">
                    {searchQuery
                      ? "No timelines match your search."
                      : isViewingOther
                        ? "This user has no timelines yet."
                        : canCreate
                          ? "No timelines yet. Create your first one!"
                          : "No timelines yet. Sign in to create one!"}
                  </p>
                )}
                {filteredTimelines.map((timeline, idx) => {
                  const isActive =
                    !isPreviewActive &&
                    activeTimeline?.timelineId === timeline.timelineId;
                  const color = timeline.color || COLORS[idx % COLORS.length];
                  const timelineOwner = timeline.userId
                    ? users.find((u) => u.clerkUserId === timeline.userId)
                    : null;
                  const isOwner = timeline.userId === currentUserId;

                  return (
                    <div
                      key={timeline.timelineId}
                      onClick={() => {
                        if (onSelectRegularTimeline) {
                          onSelectRegularTimeline(timeline);
                        } else {
                          onSelect(timeline);
                          onClose();
                        }
                      }}
                      className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        isActive
                          ? "bg-white/10 border border-white/20"
                          : "bg-white/5 border border-transparent hover:bg-white/10 hover:border-white/10"
                      }`}
                    >
                      {/* Color indicator */}
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">
                          {timeline.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-400 truncate">
                          {timelineOwner && (
                            <span>
                              by {isOwner ? "you" : timelineOwner.displayName}
                            </span>
                          )}
                          {timeline.description && (
                            <span>• {timeline.description}</span>
                          )}
                        </div>
                      </div>

                      {/* Preview button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewingTimeline(timeline);
                        }}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-cyan-400 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Preview events"
                      >
                        <Eye size={14} />
                      </button>

                      {/* Active badge */}
                      {isActive && (
                        <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-medium">
                          Active
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Create Form */}
              {isCreating && (
                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <input
                    type="text"
                    placeholder="Timeline name..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  {/* Color Selector */}
                  <div>
                    <label className="text-xs text-neutral-400 mb-2 block">
                      Timeline Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewColor(color)}
                          className={`w-5 h-5 rounded-full transition-all duration-200 ${
                            newColor === color
                              ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110"
                              : "hover:scale-110 opacity-70 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreate}
                      disabled={!newName.trim() || saving}
                      className="flex-1 py-1.5 text-sm rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? <LoaderSpinSmall color="white" /> : "Create"}
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setNewName("");
                        setNewDescription("");
                        setNewColor("#06b6d4");
                      }}
                      className="px-4 py-1.5 text-sm rounded-md bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - only show create button if user can create */}
        {!isCreating && canCreate && !isViewingOther && (
          <div className="border-t border-white/10 p-4">
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-2 text-sm rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium transition-all duration-200 shadow-lg shadow-cyan-500/20"
            >
              + New Timeline
            </button>
          </div>
        )}
      </div>

      {/* Node Preview Modal */}
      {previewingTimeline && (
        <TimelineNodePreviewModal
          timeline={previewingTimeline}
          onClose={() => setPreviewingTimeline(null)}
        />
      )}
    </div>
  );
}
