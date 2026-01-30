"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import LoaderSpinSmall from "../sub/LoaderSpinSmall";

const TIMELINE_COLORS = [
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

interface TimelineSettingsProps {
  timeline: Timeline;
  onSave: (updated: Timeline) => Promise<void>;
  onDelete: (timelineId: string) => Promise<void>;
  onClose: () => void;
}

export default function TimelineSettings({
  timeline,
  onSave,
  onDelete,
  onClose,
}: TimelineSettingsProps) {
  const [name, setName] = useState(timeline.name);
  const [description, setDescription] = useState(timeline.description ?? "");
  const [color, setColor] = useState(timeline.color ?? "#06b6d4");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...timeline,
        name: name.trim(),
        description: description.trim() || null,
        color,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save timeline:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!timeline.timelineId) return;
    if (
      !confirm(
        `Delete timeline "${timeline.name}"? This will also delete all nodes in this timeline.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await onDelete(timeline.timelineId);
      onClose();
    } catch (err) {
      console.error("Failed to delete timeline:", err);
    } finally {
      setDeleting(false);
    }
  };

  if (!mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[1000010] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl p-5 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            Timeline Settings
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">
              Timeline Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="My Timeline"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors h-20 resize-none"
              placeholder="A brief description..."
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-xs text-neutral-400 mb-2 block">
              Timeline Color
            </label>
            <div className="flex flex-wrap gap-2">
              {TIMELINE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full transition-all duration-200 ${
                    color === c
                      ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110"
                      : "hover:scale-110 opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={saving || deleting}
            className="px-3 py-1.5 text-sm rounded-md bg-red-900/30 border border-red-800/50 hover:bg-red-800/50 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? <LoaderSpinSmall color="red" /> : "Delete Timeline"}
          </button>

          {/* Save / Cancel */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm rounded-md bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving || deleting}
              className="px-4 py-1.5 text-sm rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <LoaderSpinSmall color="white" /> : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
